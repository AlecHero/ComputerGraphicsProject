"use strict";

let canvas;
let gl;
let program;

// The list of controlPointGroups
let controlPointsArray = [];

// The Control Point Group currently being edited:
let currentControlGroup = [];
let currentControlGroupFixed = [];

// The points along the curves with indices equal
// to the control points array, shape (n_controlPointGroups, resolution)
let curvePointsArray = [];
// The line segments connecting the curve points
let curveLinesArray = [];


function render() {}
function updateCurve() {}

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
            updateCurve();
            render();
        }
    }
}

window.onload = main

function main() {
    canvas = document.getElementById("canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    program = initShaders(gl, "vertex-shader", "fragment-shader");

    // VERTICES
    let positionLocation = gl.getAttribLocation(program, "a_position")

    // UNIFORMS
    let colorLocation = gl.getUniformLocation(program, "u_color");
    let pointSizeLocation = gl.getUniformLocation(program, "u_point_size");

    
    let test1Location = gl.getUniformLocation(program, "test1");
    let test2Location = gl.getUniformLocation(program, "test2");
    let test3Location = gl.getUniformLocation(program, "test3");
    let test4Location = gl.getUniformLocation(program, "test4");

    let test_vals = [0.0, 0.0, 0.0, 0.0];

    webglLessonsUI.setupSlider("#test1", {value: test_vals[0], slide: testUpdate(0), min: 0, max: 10});
    webglLessonsUI.setupSlider("#test2", {value: test_vals[1], slide: testUpdate(1), min: 0, max: 10});
    webglLessonsUI.setupSlider("#test3", {value: test_vals[2], slide: testUpdate(2), min: 0, max: 10, step: 0.1});
    webglLessonsUI.setupSlider("#test4", {value: test_vals[3], slide: testUpdate(3), min: 0, max: 10});

    let testlocs = [test1Location, test2Location, test3Location, test4Location];
    function testUpdate(index) {
        return function(event, ui) {
            test_vals[index] = ui.value;
            updateCurve();
        };
    }


    let maxPoints = 103;
    let positionBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, 12 * maxPoints, gl.STATIC_DRAW ); // 8 bytes per vec2
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, vec_flatten(curveLinesArray));

    render();
    initEventHandlers(canvas);

    function render() {
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        gl.clearColor(1, 1, 1, 1);
        
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        
        gl.uniform1f(testlocs[0], test_vals[0]);
        gl.uniform1f(testlocs[1], test_vals[1]);
        gl.uniform1f(testlocs[2], test_vals[2]);
        gl.uniform1f(testlocs[3], test_vals[3]);

        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
                
        let numPoints = vec_flatten(curveLinesArray).length;
        console.log((curveLinesArray));
        gl.drawArrays( gl.TRIANGLE_STRIP, 0, numPoints );
        
        gl.uniform4fv(colorLocation, [1.0, 0.0, 0.0, 1]);
        gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, vec_flatten(currentControlGroup), gl.STATIC_DRAW );
        
        let numControlPoints = vec_flatten(currentControlGroup).length;
        gl.drawArrays( gl.POINTS, 0, numControlPoints );
    }
    function updateCurve() {
        let weights = [1.0,1.0,1.0];
        const resolution = 25;
        const line_width = 0.1;

        curveLinesArray = [];
        // for (let i = 0; i < controlPointsArray.length; i++) {
        //     let curve = drawBezierCurve(controlPointsArray[i], weights, resolution);
        //     curvePointsArray.push(curve);
        // }

        if (currentControlGroup.length > 0) {
            let curve = drawBezierCurve(currentControlGroup, weights, resolution);
            curveLinesArray.push(createThickLinesFromCurve(curve, line_width));
        }

        gl.uniform4fv(colorLocation, [0.0, 0.0, 0.0, 1]);
        gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, vec_flatten(curveLinesArray), gl.STATIC_DRAW );   
        
        render();
    }

    function initEventHandlers(canvas) {
        let is_dragging = false;         // Dragging or not
        let last_mouse_pos = [-1,-1];   // Last position of the mouse
        
        canvas.onmousedown = function (ev) {   // Mouse is pressed
            ev.preventDefault();
            let mouse_pos = get_mouse_pos(ev);
            
            if (is_on_canvas(ev)) {
                switch (currentTool) {
                    case TOOLS.ADD_POINTS: { add_point(mouse_pos); }
                    case TOOLS.REMOVE_POINTS: { remove_point(); }
                    case TOOLS.SELECT_POINTS: { select_point(); }
                    case TOOLS.FILL: { fill(); }
                }
                last_mouse_pos = mouse_pos
                is_dragging = true;
            }
        };

        canvas.onmouseup = function (ev) {
            let mouse_pos = get_mouse_pos(ev);
            if (mouse_pos == last_mouse_pos) {  }
            is_dragging = false;
        };
    
        canvas.onmousemove = function (ev) { // Mouse is moved
            let mouse_pos = get_mouse_pos(ev);
            let is_lining = (currentControlGroupFixed.length > 0) && (currentControlGroupFixed.length < 3);

            currentControlGroup = [];
            if (is_lining) {
                currentControlGroup = currentControlGroupFixed.slice();
                currentControlGroup.push(vec3(...mouse_pos, 0));
                if (currentControlGroup.length < 3) { currentControlGroup.push(vec3(...mouse_pos, 0)); }
                updateCurve();
            }

            if (is_dragging) {
                // var x, y = mouse_pos;
                // g_last = now;
                // let mouse_pos = get_mouse_pos(ev);
                // let last_mouse_pos = get_mouse_pos(ev, x=lastX, y=lastY);
                // lastX = x, lastY = y;
            }
        };

        canvas.oncontextmenu = function (ev) { ev.preventDefault(); };
    }

    function add_point(mouse_pos) {
        const snap_radius = 0.03;
        if (currentControlGroupFixed.length < 2) {
            currentControlGroupFixed.push(get_snapped(mouse_pos, controlPointsArray, snap_radius));
        } else {
            currentControlGroupFixed.push(vec3(...mouse_pos, 0.0));
        }
        
        if (currentControlGroupFixed.length == 3) {
            controlPointsArray.push(currentControlGroupFixed);
            currentControlGroupFixed = [];
            currentControlGroup = [];
            updateCurve();
        }
    }
    function remove_point() {

    }
    function select_point() {

    }
    function fill() {

    }
};


function is_on_canvas(ev) {
    var x = ev.clientX, y = ev.clientY;
    var rect = ev.target.getBoundingClientRect();
    return rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom
}

function get_mouse_pos(ev, x=undefined, y=undefined) {
    if ((x == undefined) && (y == undefined)) {
        var x = ev.clientX, y = ev.clientY;
    }
    var rect = ev.target.getBoundingClientRect();
    return [((x - rect.left) / rect.width - 0.5) * 2,
            (0.5 - (y - rect.top) / rect.height) * 2];
}

function vec_flatten(list) {
    let flattened_list = [];
    for (var i = 0; i < list.length; i++) {
        for (var j = 0; j < list[i].length; j++) {
            flattened_list.push(...list[i][j]);
        }
    }
    return new Float32Array(flattened_list);
}

// function vec_flatten2(list) {
//     let flattened_list = [];
//     for (var i = 0; i < list.length; i++) {
//         for (var j = 0; j < list[i].length; j++) {
//             for (var k = 0; k < list[i][j].length; k++) {
//                 flattened_list.push(...list[i][j][k]);
//             }
//         }
//     }
//     return new Float32Array(flattened_list);
// }

function euclidean(point1, point2) {
    const [x1, y1] = point1;
    const [x2, y2] = point2;

    const dx = x2 - x1;
    const dy = y2 - y1;

    return Math.sqrt(dx * dx + dy * dy);
}

function get_snapped(coord, snap_to_coords) {
    // radius is a % of screen size
    let closest_snapped = Infinity;
    let snap_x, snap_y;
    for (let i = 0; i < snap_to_coords.length; i++) {
        for (let j = 0; j < 2; j++) {
            let dist = euclidean(coord, snap_to_coords[i][j]);
            if ((dist < radius) & (Math.min(closest_snapped, dist) == dist)) { 
                closest_snapped = dist;
                [snap_x, snap_y] = [i,j];
            }
        }
    }
    if (snap_x == undefined) {
        return vec3(...coord, 0.0);
    } else {
        return snap_to_coords[snap_x][snap_y];
    }
}