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

function vec_flatten(list) {
    let flattened_list = [];
    for (var i = 0; i < list.length; i++) {
        for (var j = 0; j < list[i].length; j++) {
            flattened_list.push(...list[i][j]);
        }
    }
    return new Float32Array(flattened_list);
}

window.onload = main

function main() {
    canvas = document.getElementById("canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    program = initShaders(gl, "vertex-shader", "fragment-shader");

    // VERTICES
    let positionLocation = gl.getAttribLocation(program, "a_position")
    // let colorLocation = gl.getAttribLocation(program, "a_color");

    // UNIFORMS
    let colorLocation = gl.getUniformLocation(program, "u_color");

    
    let maxPoints = 103;

    let positionBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, 12 * maxPoints, gl.STATIC_DRAW ); // 8 bytes per vec2
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, vec_flatten(curvePointsArray));

    // let colorBuffer = gl.createBuffer();
    // gl.bindBuffer( gl.ARRAY_BUFFER, colorBuffer );
    // gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW );

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

        curvePointsArray = [];
        for (let i = 0; i < controlPointsArray.length; i++) {
            let curve = drawBezierCurve(controlPointsArray[i], weights, 2000);
            curvePointsArray.push(curve);
        }

        console.log(currentControlGroup);
        let curve = drawBezierCurve(currentControlGroup, weights, 2000);
        curvePointsArray.push(curve);

        gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, vec_flatten(curvePointsArray), gl.STATIC_DRAW );

        render();
    }

let currentControlGroup = [];
let currentControlGroupFixed = [];

function initEventHandlers(canvas) {
    var dragging = false;         // Dragging or not
    var lastX = -1, lastY = -1;   // Last position of the mouse
    var current_action = 0;       // Actions: 0 - none, 1 - leftclick, 2 - middleclick, 3 - rightclick
    
    canvas.onmousedown = function (ev) {   // Mouse is pressed
      ev.preventDefault();
      var x = ev.clientX, y = ev.clientY;
      var rect = ev.target.getBoundingClientRect();
      var mouse_pos = get_mouse_pos(ev);
      
      // Start dragging if a mouse is in <canvas>
      if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
        switch (currentTool) {
            case TOOLS.ADD_POINTS: {

                get_snapped(mouse_pos, controlPointsArray);
                // at mouse position
                // check all control points
                // if within SNAPPING RADIUS
                // get closest point which is within
                // use that point as cpoint
                // else:
                let cpoint = vec3(...mouse_pos, 0.0);

                currentControlGroupFixed.push(cpoint);
                
                if (currentControlGroupFixed.length > 2) {
                    controlPointsArray.push(currentControlGroupFixed);
                    currentControlGroupFixed = [];
                    currentControlGroup = [];
                    updateCurve();
                }
            }
        }

        lastX = x; lastY = y;
        dragging = true;
        current_action = ev.button + 1;
      }
    };
  
    canvas.oncontextmenu = function (ev) { ev.preventDefault(); };
  
    function get_mouse_pos(ev) {
        var x = ev.clientX, y = ev.clientY;
        var rect = ev.target.getBoundingClientRect();
        return [((x - rect.left) / rect.width - 0.5) * 2,
                (0.5 - (y - rect.top) / rect.height) * 2];
    }


    canvas.onmouseup = function (ev) {
        let mouse_pos = get_mouse_pos(ev);

        if (mouse_pos[0] === lastX && mouse_pos[1] === lastY) { }
        dragging = false;
        current_action = 0;
    };
  
    var g_last = Date.now();
    canvas.onmousemove = function (ev) { // Mouse is moved
        let mouse_pos = get_mouse_pos(ev);
        mouse_pos;

        if (currentControlGroupFixed.length > 0 && currentControlGroupFixed.length < 3) {
            currentControlGroup = currentControlGroupFixed.slice();
            currentControlGroup.push(vec3(...mouse_pos, 0));
            if (currentControlGroup.length < 3) { currentControlGroup.push(vec3(...mouse_pos, 0)); }
            updateCurve();
        }

        if (dragging) {
            var x, y = mouse_pos;

            var now = Date.now();
            var elapsed = now - g_last;
            if (elapsed > 20) {
                g_last = now;
                var rect = ev.target.getBoundingClientRect();
                var s_x = ((x - rect.left) / rect.width - 0.5) * 2;
                var s_y = (0.5 - (y - rect.top) / rect.height) * 2;
                var s_last_x = ((lastX - rect.left) / rect.width - 0.5) * 2;
                var s_last_y = (0.5 - (lastY - rect.top) / rect.height) * 2;
                let mouse_pos = [s_x, s_y];
                let last_mouse_pos = [s_last_x, s_last_y];

                // SWITCH

                lastX = x, lastY = y;
            }
        }
        };
    }

};
