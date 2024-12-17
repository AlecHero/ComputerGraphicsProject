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
    NONE: undefined,
    ADD_POINTS: 0,
    SELECT_POINTS: 1,
    REMOVE_POINTS: 2,
    FILL: 3,
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

const resolution = 35;
const line_width = .01;
const drop_radius = 0.04; // make more sensible number to work from
const grab_radius = 0.02; // make more sensible number to work from
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
    
    draw_test();
    erase_test();
    
    draw_test();
    select_test();
    
    draw_test2();

    erase_test();
    
    // Ensure no tools is picked initially
    currentTool = TOOLS.NONE;
    toggleToolButton(currentTool);
}

function render() {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.clearColor(1, 1, 1, 0);
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    
    let numControlPoints = 0;
    console.log("oioi", controlGroupsArray);
    for (let i = 0; i < controlGroupsArray.length; i++) { numControlPoints += controlGroupsArray[i].length; }
    console.log(numControlPoints);

    let numCurvePoints = 0;
    for (let i = 0; i < curveLinesArray.length; i++) {
        for (let j = 0; j < curveLinesArray[i].length; j++) {
            numCurvePoints += curveLinesArray[i][j].length;
        }
    }
    
    // Draw handles between pairs of control points:
    gl.bindBuffer(gl.ARRAY_BUFFER, controlPointPositionBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(colorLocation, [0, 0, 0, 1]);
    gl.drawArrays(gl.LINES, 0, numControlPoints);

    // Draw curve segments:
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(colorLocation, [0.0, 0.0, 0.0, 1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, numCurvePoints);

    // Draw control points:
    gl.bindBuffer(gl.ARRAY_BUFFER, controlPointPositionBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(colorLocation, [.8, .8, .8, 1]);
    gl.drawArrays(gl.POINTS, 0, numControlPoints);
}


function select_point(mouse_up=false) {
    // let is_control_point = (currentGroupFixed.indexOf(undefined) % 2 == 1);

    let snap_indices = find_snap(controlGroupsArray, grab_radius, include_control=!mouse_up);
    let can_snap = (snap_indices !== undefined);

    if (can_snap) {
        currentIndex = snap_indices[0];
        currentGroupFixed = controlGroupsArray[currentIndex].slice();
        controlGroupsArray[currentIndex] = dummy_point.slice();
        if (!mouse_up) { currentGroupFixed[snap_indices[1]] = undefined; }
    }

    if (mouse_up) {
        currentGroupFixed[currentGroupFixed.indexOf(undefined)] = [...mouse_pos, 0.0];
    }
    updateCurrentControlGroup();
}


function add_point(mouse_up=false) {
    // If fixed group is completely fixed/set, clear it
    if (currentGroupFixed.length == n_control_points) { currentGroupFixed = []; }

    if (currentGroupFixed.length == 0) {
        if (mouse_up) { return; }
        currentIndex = controlGroupsArray.length;
    }

    // Snap to point if any are viable:
    let controlGroupsArrayWOCurrent = controlGroupsArray.slice();
    controlGroupsArrayWOCurrent[currentIndex] = dummy_point.slice();

    let snap_indices = find_snap(controlGroupsArrayWOCurrent, drop_radius);
    let can_snap = (snap_indices !== undefined) && ((currentGroupFixed.length % 2) == 0);
    // can_snap = false;

    let snapped_point = (!can_snap) ? [...mouse_pos, 0.0] : controlGroupsArray[snap_indices[0]][snap_indices[1]];
    
    // Add new point
    if (currentGroupFixed.length < n_control_points) { currentGroupFixed.push(snapped_point); }

    updateCurrentControlGroup();

    // If fixed group is completely fixed/set, clear it
    if (currentGroupFixed.length == n_control_points) { currentGroupFixed = []; }
}

function remove_curve() {
    let snap_indices = find_snap(controlGroupsArray, grab_radius);
    let can_snap = (snap_indices !== undefined);

    if (can_snap) {
        currentIndex = snap_indices[0];
        // Removing does not work, will replace instead
        // controlGroupsArray.splice(currentIndex, 1);
        // curvePointsArray.splice(currentIndex, 1);
        // curveLinesArray.splice(currentIndex, 1);
        controlGroupsArray[currentIndex] = dummy_point.slice();
        curvePointsArray[currentIndex] = dummy_point.slice();
        curveLinesArray[currentIndex] = dummy_point.slice();
        currentGroupFixed = [];
        currentGroup = [];
    }
    updateCurve();
}


function updateCurrentControlGroup() {
    if (currentGroupFixed.length == 0) { return; }
    
    currentGroup = currentGroupFixed.slice();

    let snap_indices = find_snap(controlGroupsArray, drop_radius);
    let can_snap = (snap_indices !== undefined) && (currentGroupFixed.length < 2);
    can_snap = false;

    let snapped_point = (!can_snap) ? [...mouse_pos, 0.0] : controlGroupsArray[snap_indices[0]][snap_indices[1]];

    // Fill undefined values:
    for (let i = 0; i < n_control_points; i++) { if (currentGroup[i] === undefined) { currentGroup[i] = snapped_point; } }

    // Ensure current control group can be set, and set it:
    if (controlGroupsArray[currentIndex] === undefined) { controlGroupsArray.push([]); }
    controlGroupsArray[currentIndex] = currentGroup.slice();
    
    updateCurve();
}

function updateCurve() {
    let curve_points = [];
    let curve_lines = [];

    if (currentGroupFixed.length != 0) {
        // Compute Curve
        curve_points = computeBezierCurve(currentGroup, resolution);
        curvePointsArray[currentIndex] = [curve_points]
        
        curve_lines = createThickLinesFromCurve(curve_points, line_width);
        curveLinesArray[currentIndex] = [curve_lines]
    } else {
        curve_lines = Array((2 + (resolution-1) * n_segment_points) * n_control_points).fill(2);
        currentGroup = Array(n_control_points * n_point_dim).fill(2);
    }

    // Update Curve
    let indexCurveLine = currentIndex * (2 + (resolution-1) * n_segment_points) * n_control_points * Float32Array.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, indexCurveLine, flatten(curve_lines));
    
    console.log(currentGroup);
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
                if (i == currentIndex && (currentTool == TOOLS.ADD_POINTS)) { continue; }
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


function draw_test() {
    currentTool = TOOLS.ADD_POINTS;
    mouse_pos = [-0.5, -0.5];
    add_point();
    mouse_pos = [-0.5, 0.5];
    add_point();
    mouse_pos = [0.5, -0.5];
    add_point();
    mouse_pos = [0.5, 0.5];
    add_point();
}

function draw_test2() {
    currentTool = TOOLS.ADD_POINTS;
    mouse_pos = [-0.5, -0.535];
    add_point();
    mouse_pos = [-0.5, -0.9];
    add_point();
    mouse_pos = [0.5, -0.535];
    add_point();
    mouse_pos = [0.5, -0.9];
    add_point();
}

function select_test() {
    currentTool = TOOLS.SELECT_POINTS;
    mouse_pos = [-0.5, 0.5];
    select_point();
    mouse_pos = [0, 0.5];
    select_point(mouse_up=true);

    mouse_pos = [0.5, 0.5];
    select_point();
    mouse_pos = [0.0, 0.5];
    select_point(mouse_up=true);
}

function erase_test() {
    currentTool = TOOLS.REMOVE_POINTS;
    mouse_pos = [-0.5, -0.5];
    remove_curve();
}

window.onload = main;