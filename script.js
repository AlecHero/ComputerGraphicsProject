"use strict";

let canvas;
let gl;
let program;

let curvePointsArray = [];
let controlPointsArray = [];
// let colorsArray = [[0.0, 0.0, 1.0, 1.0]];

// const CLICK = {LEFT:1, MIDDLE:2, RIGHT:3}
const TOOLS = {
    SELECT_POINTS: "SELECT_POINTS",
    ADD_POINTS: "ADD_POINTS",
    REMOVE_POINTS: "REMOVE_POINTS",
    FILL: "FILL",
}

let currentTool = TOOLS.ADD_POINTS;

window.onload = main

function main() {
    canvas = document.getElementById("canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    program = initShaders(gl, "vertex-shader", "fragment-shader");

    // VERTICES
    let positionLocation = gl.getAttribLocation(program, "a_position")

    // UNIFORMS
    let colorLocation = gl.getUniformLocation(program, "u_color");

    let maxPoints = 103;
    let positionBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, 12 * maxPoints, gl.STATIC_DRAW ); // 8 bytes per vec2
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, vec_flatten(curvePointsArray));

    render();
    initEventHandlers(canvas);

    function render() {
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        gl.clearColor(1, 1, 1, 1);
        
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        
        gl.enableVertexAttribArray(positionLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        
        // DRAWING
        gl.uniform4fv(colorLocation, [0.0, 0.0, 0.0, 1]);
        
        let numPoints = vec_flatten(curvePointsArray).length;
        gl.drawArrays( gl.POINTS, 0, numPoints );
    }

    function updateCurve() {
        let weights = [1.0,1.0,1.0];
        const resolution = 1000;
        
        curvePointsArray = [];
        for (let i = 0; i < controlPointsArray.length; i++) {
            let curve = drawBezierCurve(controlPointsArray[i], weights, resolution);
            curvePointsArray.push(curve);
        }

        let curve = drawBezierCurve(currentControlGroup, weights, resolution);
        curvePointsArray.push(curve);

        gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, vec_flatten(curvePointsArray), gl.STATIC_DRAW );

        render();
    }

    let currentControlGroup = [];
    let currentControlGroupFixed = [];

    function euclidean(point1, point2) {
        const [x1, y1] = point1;
        const [x2, y2] = point2;

        const dx = x2 - x1;
        const dy = y2 - y1;

        return Math.sqrt(dx * dx + dy * dy);
    }

    function get_snapped(coord, snap_to_coords, radius) {
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
            let snapped_mouse_pos = get_snapped(mouse_pos, controlPointsArray, snap_radius);
            currentControlGroupFixed.push(snapped_mouse_pos);
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