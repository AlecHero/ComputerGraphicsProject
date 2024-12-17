let gl;
let canvas;
let program;

let positionBuffer;
let controlPointPositionBuffer;
let controlPointPositionBuffer2;
let fillPointPositionBuffer;

let positionLocation
let colorLocation;
let fillLocation;
let fixLocation;
let primitiveTypeLocation;
const resolution = 350;
const line_width = .008;
const line_width_thick = .04;
const drop_radius = 0.07; // make more sensible number to work from
const grab_radius = 0.02; // make more sensible number to work from
const max_curves = 2000;
const max_points = 32000;
const n_segment_points = 4; // Depends on how many points in createThickLine
const n_control_points = 4;
const n_point_dim = 3;

let current_line_width = line_width;
let current_color = [0,0,0];
let is_saving = false;
let is_filled = false;

let currentIndex = -1;
let controlGroupsArray = []; // (3 x 3 x n_curves + currentGroup)
let currentGroup = [];       // (3 x 3)
let currentGroupFixed = [];  // (3 x 3)

let curvePointsArray = [[]];   // (resolution x 3 x n_curves)
let curveLinesArray = [[]];    // ((resolution x 4 + 2) x 3 x n_curves)
let filled = [];

let mouse_pos = [0,0];


const TOOLS = {
    NONE: undefined,
    ADD_POINTS: 0,
    SELECT_POINTS: 1,
    REMOVE_POINTS: 2,
    FILL: 3,
}
let currentTool = TOOLS.ADD_POINTS;
function setTool(new_tool) {
    if (new_tool != currentTool) {
        currentTool = new_tool;
        render();
    }
}

const n_calculated_curve = ((resolution-1) * n_segment_points + 2) * n_point_dim;
const dummy_group = [[Infinity, Infinity, 0], [Infinity, Infinity, 0], [Infinity, Infinity, 0], [Infinity, Infinity, 0]];
const dummy_line = [Array(n_calculated_curve).fill(Infinity)];

function main() {
    canvas = document.getElementById("canvas");
    gl = WebGLUtils.setupWebGL(canvas, {preserveDrawingBuffer: true});
    program = initShaders(gl, "vertex-shader", "fragment-shader");

    // DOESNT ACTUALLY CORRECTLY BLEND CONTROL POINTS AND CURVES
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, max_curves * n_calculated_curve * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);

    controlPointPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, controlPointPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, max_curves * resolution * n_control_points * n_point_dim * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
    
    controlPointPositionBuffer2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, controlPointPositionBuffer2);
    gl.bufferData(gl.ARRAY_BUFFER, max_curves * resolution * n_control_points * n_point_dim * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
    
    fillPointPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fillPointPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, max_points * n_point_dim * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);

    
    positionLocation = gl.getAttribLocation(program, "a_position")
    colorLocation = gl.getUniformLocation(program, "u_color");
    pointSizeLocation = gl.getUniformLocation(program, "u_point_size");
    fillLocation = gl.getUniformLocation(program, "u_do_fill");
    fixLocation = gl.getUniformLocation(program, "u_fix");
    primitiveTypeLocation = gl.getUniformLocation(program, "u_primitiveType");
    // aspectRatioLocation = gl.getUniformLocation(program, "u_aspect_ratio");

    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    
    window.addEventListener('resize', () => { render(); });
    window.addEventListener('keydown', HandleUndoKeyPress);
    window.addEventListener('keydown', HandleRedoKeyPress);
    initEventHandlers(canvas);
    render();
    
    // draw_test();
    // erase_test();
    
    // draw_test();
    // select_test();
    
    // draw_test2();
    // fill_test();
    // fill_test();
    // erase_test();

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
    for (let i = 0; i < controlGroupsArray.length; i++) { numControlPoints += controlGroupsArray[i].length; }

    let numCurvePoints = 0;
    for (let i = 0; i < curveLinesArray.length; i++) {
        for (let j = 0; j < curveLinesArray[i].length; j++) {
            numCurvePoints += curveLinesArray[i][j].length;
        }
    }

    if (currentTool != TOOLS.FILL) { is_filled = false; }
    
    if (is_filled) {
        gl.bindBuffer(gl.ARRAY_BUFFER, fillPointPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(filled), gl.DYNAMIC_DRAW);
        
        gl.uniform1i(fillLocation, 1);
        gl.bindBuffer(gl.ARRAY_BUFFER, fillPointPositionBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(colorLocation, [...rgbColor, 1]);
        gl.uniform1i(primitiveTypeLocation, 0);
        gl.drawArrays(gl.POINTS, 0, filled.length);
        gl.uniform1i(fillLocation, 0);
    }
    
    
    if (!is_saving && !is_filled) {
        // Draw handles between pairs of control points:
        gl.bindBuffer(gl.ARRAY_BUFFER, controlPointPositionBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.uniform1i(primitiveTypeLocation, 1);
        gl.drawArrays(gl.LINES, 0, numControlPoints);
    }
    
    // Draw curve segments:
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
    
    gl.uniform4fv(colorLocation, [...rgbColor, 1]);
    gl.uniform1i(primitiveTypeLocation, 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, numCurvePoints);

    if (!is_saving && !is_filled) {
        // Draw control points:
        gl.bindBuffer(gl.ARRAY_BUFFER, controlPointPositionBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(colorLocation, [.8, .8, .8, 1]);
        gl.uniform1i(primitiveTypeLocation, 0);
        gl.drawArrays(gl.POINTS, 0, numControlPoints);
    }

    if (is_filled) {
        // Draw fix:
        gl.bindBuffer(gl.ARRAY_BUFFER, controlPointPositionBuffer2);
        gl.uniform1i(fixLocation, 1);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(colorLocation, [...rgbColor, 1]);
        gl.uniform1i(primitiveTypeLocation, 0);
        gl.drawArrays(gl.POINTS, 0, 2);
        gl.uniform1i(fixLocation, 0);
    }
}


function select_point(mouse_up=false, idx=undefined) {
    // let is_control_point = (currentGroupFixed.indexOf(undefined) % 2 == 1);

    let snap_indices = find_snap(controlGroupsArray, grab_radius, include_control=!mouse_up);
    let can_snap = (snap_indices !== undefined);

    if (idx !== undefined) {
        currentIndex = idx;
        currentGroupFixed = controlGroupsArray[currentIndex].slice();
        controlGroupsArray[currentIndex] = dummy_group.slice();

    } else if (can_snap) {
        currentIndex = snap_indices[0];
        currentGroupFixed = controlGroupsArray[currentIndex].slice();
        controlGroupsArray[currentIndex] = dummy_group.slice();
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
    controlGroupsArrayWOCurrent[currentIndex] = dummy_group.slice();

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

function remove_curve(idx=undefined) {
    let snap_indices, can_snap;
    if (idx === undefined) {
        snap_indices = find_snap(controlGroupsArray, grab_radius);
        can_snap = (snap_indices !== undefined);
    } else {
        snap_indices = [idx, 0];
        can_snap = true;
    }

    if (can_snap) {
        currentIndex = snap_indices[0];
        // Removing does not work, will replace instead
        // controlGroupsArray.splice(currentIndex, 1);
        // curvePointsArray.splice(currentIndex, 1);
        // curveLinesArray.splice(currentIndex, 1);
        controlGroupsArray[currentIndex] = dummy_group.slice();
        curvePointsArray[currentIndex] = dummy_group.slice();
        curveLinesArray[currentIndex] = dummy_line.slice();
        currentGroupFixed = [];
        currentGroup = [];
    }
    updateCurve();
}

function fill_tool() {
    let fill_curve = [];

    is_filled = true;

    for (let i = 0; i < curvePointsArray.length; i++) {
        if (curvePointsArray[i][0].indexOf(Infinity) == -1) {
            fill_curve.push(...curvePointsArray[i][0])
        }
    }

    filled = fillTool([...mouse_pos, 0.0], fill_curve, tolerance=0.008);

    current_line_width = line_width_thick;
    update_points();
    render();
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
        
        curve_lines = createThickLinesFromCurve(curve_points, current_line_width);
        curveLinesArray[currentIndex] = [curve_lines]
    } else {
        curve_lines = Array(n_calculated_curve).fill(2);
        currentGroup = Array(n_control_points * n_point_dim).fill(2);
    }

    // Update Curve
    let indexCurveLine = currentIndex * n_calculated_curve * Float32Array.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, indexCurveLine, flatten(curve_lines));
    
    // Update Points
    let indexControlGroup = currentIndex * n_control_points * n_point_dim * Float32Array.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, controlPointPositionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, indexControlGroup, flatten(currentGroup));
    
    // Update Points scuffed
    gl.bindBuffer(gl.ARRAY_BUFFER, controlPointPositionBuffer2);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(Array(currentGroup[0], currentGroup[2])));
    
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

function fill_test() {
    currentTool = TOOLS.FILL;
    mouse_pos = [0.1, 0.0];
    fill_tool();
}

function update_points() {
    for (let i = 0; i < controlGroupsArray.length; i++) {
        select_point(mouse_up=false, idx=i);
    }
}

window.onload = main;