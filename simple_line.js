let gl;
let canvas;
let program;

let positionBuffer;
let controlPointPositionBuffer;

let positionLocation
let colorLocation;
// let aspectRatioLocation;
// The list of controlPointGroups
let controlGroupsArray = [];
// The Control Point Group currently being edited:
let currentControlGroup = [];
let currentControlGroupFixed = [];
// The points along the curves with indices equal
// to the control points array, shape (n_controlPointGroups, resolution)
let curvePointsArray = [];
// The line segments connecting the curve points
let curveLinesArray = [];
let concatControlPointsArray = [];

let currentIndex = 0;

const TOOLS = {
    SELECT_POINTS: "SELECT_POINTS",
    ADD_POINTS: "ADD_POINTS",
    REMOVE_POINTS: "REMOVE_POINTS",
    FILL: "FILL",
}
let currentTool = TOOLS.ADD_POINTS;
function setTool(newTool) {
    if (newTool != currentTool) {
        currentTool = newTool;
        if (currentControlGroupFixed.length > 0) {
            currentControlGroupFixed = [];
            render();
        }
    }
}

const resolution = 25;
const line_width = .01;
const snap_radius = 0.03; // make more sensible number to work from
const max_curves = 2000;
let weights = [1,1,1];
const numSegmentPoints = 6; // Depends on how many points in createThickLine

function main() {
    canvas = document.getElementById("canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    program = initShaders(gl, "vertex-shader", "fragment-shader");

    // DOESNT ACTUALLY CORRECTLY BLEND CONTROL POINTS AND CURVES
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, max_curves * (2 + resolution * numSegmentPoints) * 3 * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
    
    controlPointPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, controlPointPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, max_curves * resolution * 3 * 3 * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
    
    positionLocation = gl.getAttribLocation(program, "a_position")
    colorLocation = gl.getUniformLocation(program, "u_color");
    pointSizeLocation = gl.getUniformLocation(program, "u_point_size");
    // aspectRatioLocation = gl.getUniformLocation(program, "u_aspect_ratio");

    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    
    window.addEventListener('resize', () => { render(); });
    initEventHandlers(canvas);
    render();
}

function render() {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.clearColor(1, 1, 1, 0);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    // gl.uniform1f(aspectRatioLocation, canvas.width / canvas.height);

    // Draw curves
    let numCurvePoints = 0;
    for (let i = 0; i < curveLinesArray.length; i++) {
        for (let j = 0; j < curveLinesArray[i].length; j++) {
            numCurvePoints += curveLinesArray[i][j].length;
        }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(colorLocation, [0.0, 0.0, 0.0, 1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, numCurvePoints);

    // Draw control points
    let numControlPoints = flatten(controlGroupsArray).length + currentControlGroup.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, controlPointPositionBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

    gl.uniform4fv(colorLocation, [1.0, 0.0, 0.0, 1]);
    gl.drawArrays(gl.POINTS, 0, numControlPoints);
}


function add_point(mouse_pos) {
    if (currentControlGroupFixed.length == 3) {
        controlGroupsArray.push(currentControlGroupFixed);
        currentControlGroupFixed = [];
        currentControlGroup = [];
        currentIndex = curvePointsArray.length;
    }
    
    let snapped_pos = get_snapped(mouse_pos, controlGroupsArray, snap_radius, true)
    
    if (snapped_pos !== undefined) { fixed_pos = snapped_pos; }
    else { fixed_pos = mouse_pos; }

    let mouse_point = [...fixed_pos, 0.0];

    if (currentControlGroupFixed.length < 3) {
        currentControlGroupFixed.push(mouse_point);
    }
    updateCurrentControlGroup(mouse_pos);
}


function updateCurrentControlGroup(mouse_pos) {
    currentControlGroup = currentControlGroupFixed.slice();
    for (let i = 0; i < 3; i++) {
        if (currentControlGroup[i] === undefined) {
            currentControlGroup[i] = [...mouse_pos, 0.0];
        }
    }

    // Updating Curve
    let curve_points = drawBezierCurve(currentControlGroup, weights, resolution);
    curvePointsArray[currentIndex] = [curve_points]
    
    let curve_lines = createThickLinesFromCurve(curve_points, line_width);
    curveLinesArray[currentIndex] = [curve_lines]
    let indexCurveLine = currentIndex * resolution * numSegmentPoints * 3 * Float32Array.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, indexCurveLine, flatten(curve_lines));
    
    let indexControlGroup = currentIndex * 3 * 3 * Float32Array.BYTES_PER_ELEMENT;
    concatControlPointsArray = controlGroupsArray.slice();
    concatControlPointsArray.push(currentControlGroup);
    gl.bindBuffer(gl.ARRAY_BUFFER, controlPointPositionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, indexControlGroup, flatten(currentControlGroup));

    render();
}

function euclidean(point1, point2) {
    const [x1, y1] = point1;
    const [x2, y2] = point2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function get_snapped(coord, snap_to_coords, radius, extra_loop=undefined) {
    let closest_snapped = Infinity;
    let snap_x, snap_y;
    for (let i = 0; i < snap_to_coords.length; i++) {
        if (extra_loop !== undefined) {
            for (let k = 0; k < snap_to_coords[i].length; k++) {
                for (let j = 0; j < 2; j++) {
                    let dist = euclidean(coord, snap_to_coords[i][j]);
                    if ((dist < radius) & (Math.min(closest_snapped, dist) == dist)) { 
                        closest_snapped = dist;
                        [snap_x, snap_y] = [i,j];
                    }
                }
            } 
        } else {
            for (let j = 0; j < 2; j++) {
                let dist = euclidean(coord, snap_to_coords[i][j]);
                if ((dist < radius) & (Math.min(closest_snapped, dist) == dist)) { 
                    closest_snapped = dist;
                    [snap_x, snap_y] = [i,j];
                }
            }
        }
    }
    if (snap_x !== undefined) {
        return snap_to_coords[snap_x][snap_y];
    } else {
        return undefined
    }
}


function get_snap_point(mouse_pos, control_groups_array, radius) {
    let min_dist = Infinity;
    let sx, sy;

    for (let i = 0; i < control_groups_array.length; i++) {
        for (let j = 0; j < 2; j++) {
            let dist = euclidean(mouse_pos, control_groups_array[i][j]);
            if ((dist < radius) & (dist < min_dist)) { 
                min_dist = dist;
                [sx, sy] = [i,j];
            }
        }
    }
    return (sx === undefined) ? undefined : [sx, sy];
}



window.onload = main;