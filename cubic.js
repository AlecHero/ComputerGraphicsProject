let gl;
let canvas;
let program;

let positionBuffer;
let controlPointPositionBuffer;

let positionLocation
let colorLocation;

let currentIndex = -1;
let controlGroupsArray = []; // (3 x 3 x n_curves + currentGroup)
let currentGroup = [];       // (3 x 3)
let currentGroupFixed = [];  // (3 x 3)

let curvePointsArray = [[]];   // (resolution x 3 x n_curves)
let curveLinesArray = [[]];    // ((resolution x 4 + 2) x 3 x n_curves)

let hoveredGroup = [];

let mouse_pos = [0,0];

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
        if (currentGroupFixed.length > 0) {
            currentGroupFixed = [];
            render();
        }
    }
}

const resolution = 25;
const line_width = .01;
const snap_radius = 0.03; // make more sensible number to work from
const max_curves = 2000;
const n_segment_points = 4; // Depends on how many points in createThickLine
const n_control_points = 4;
const n_point_dim = 3;

const dummy_point = [[Infinity, Infinity, 0], [Infinity, Infinity, 0], [Infinity, Infinity, 0], [Infinity, Infinity, 0]];


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
    gl.bufferData(gl.ARRAY_BUFFER, max_curves * (2 + resolution * n_segment_points) * n_control_points * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
    
    controlPointPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, controlPointPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, max_curves * resolution * n_control_points * n_point_dim * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
    
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
    let numControlPoints = flatten(controlGroupsArray).length + currentGroup.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, controlPointPositionBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

    gl.uniform4fv(colorLocation, [1.0, 0.0, 0.0, 1]);
    gl.drawArrays(gl.POINTS, 0, numControlPoints);
}


function select_point(drop=false) {
    let snap_indices = find_snap(controlGroupsArray, snap_radius, include_control=true);
    let has_selected_point = (snap_indices !== undefined);
    
    if (has_selected_point) {
        currentIndex = snap_indices[0];
        currentGroupFixed = controlGroupsArray[snap_indices[0]].slice();
        controlGroupsArray[snap_indices[0]] = dummy_point.slice();
        if (!drop) {currentGroupFixed[snap_indices[1]] = undefined; }
    }
    
    updateCurrentControlGroup();
}


function add_point() {
    if (currentGroupFixed.length == 0) { currentIndex = controlGroupsArray.length; }

    // Snap to point if any are viable:
    let controlGroupsArrayWOCurrent = controlGroupsArray.slice();
    controlGroupsArrayWOCurrent[currentIndex] = dummy_point.slice();

    let snap_indices = find_snap(controlGroupsArrayWOCurrent, snap_radius);
    let can_snap = (snap_indices !== undefined) && (currentGroupFixed.length < 2);
    let snapped_point = (!can_snap) ? [...mouse_pos, 0.0] : controlGroupsArray[snap_indices[0]][snap_indices[1]];
    
    // Add new point
    if (currentGroupFixed.length < n_control_points) { currentGroupFixed.push(snapped_point); }

    updateCurrentControlGroup();

    // If fixed group is completely fixed/set, clear it
    if (currentGroupFixed.length == n_control_points) { currentGroupFixed = []; }
}


function updateCurrentControlGroup() {
    currentGroup = currentGroupFixed.slice();

    let snap_indices = find_snap(controlGroupsArray, snap_radius);
    let can_snap = (snap_indices !== undefined) && (currentGroupFixed.length < 2);
    let snapped_point = (!can_snap) ? [...mouse_pos, 0.0] : controlGroupsArray[snap_indices[0]][snap_indices[1]];

    // Fill undefined values:
    for (let i = 0; i < n_control_points; i++) { if (currentGroup[i] === undefined) { currentGroup[i] = snapped_point; } }

    // Ensure current control group can be set, and set it:
    if (controlGroupsArray[currentIndex] === undefined) { controlGroupsArray.push([]); }
    controlGroupsArray[currentIndex] = currentGroup.slice();
    
    updateCurve();
}

function updateCurve() {
    // Update Curve
    let curve_points = computeBezierCurve(currentGroup, resolution);
    curvePointsArray[currentIndex] = [curve_points]
    
    let curve_lines = createThickLinesFromCurve(curve_points, line_width);
    curveLinesArray[currentIndex] = [curve_lines]
    let indexCurveLine = currentIndex * (2 + resolution * n_segment_points) * n_control_points * Float32Array.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, indexCurveLine, flatten(curve_lines));
    
    // Update Points
    let indexControlGroup = currentIndex * n_control_points * n_point_dim * Float32Array.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, controlPointPositionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, indexControlGroup, flatten(currentGroup));
    
    render();
}


function euclidean(point1, point2) {
    const [x1, y1] = point1;
    const [x2, y2] = point2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function find_snap(control_groups_array, radius, include_control=false) {
    let min_dist = Infinity;
    let sx, sy;
    
    for (let i = 0; i < control_groups_array.length; i++) {
        for (let k = 0; k < control_groups_array[i].length; k++) {
            for (let j = 0; j < n_control_points; j++) {
                if (!include_control && ((j+1) % 2 == 0)) { continue; }

                let dist = euclidean(mouse_pos, control_groups_array[i][j]);
                if ((dist < radius) & (dist < min_dist)) { 
                    min_dist = dist;
                    [sx, sy] = [i,j];
                }
            }
        }
    }
    return (sx === undefined) ? undefined : [sx, sy];
}

window.onload = main;