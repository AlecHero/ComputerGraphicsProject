"use strict";

let canvas;
let gl;
let program;

let pointsArray = [[0.0, 0.0]];
let colorsArray = [[0.0, 0.0, 1.0, 1.0]];
let controlPointsArray = [];

const CLICK = {LEFT:1, MIDDLE:2, RIGHT:3}
const TOOLS = {
    ADD_POINTS: "ADD_POINTS",
    SELECT_POINTS: "SELECT_POINTS",
    REMOVE_POINTS: "REMOVE_POINTS",
    FILL: "FILL",
}

let currentTool = TOOLS.ADD_POINTS;

function add_points(current_action) {
    switch (current_action) {
        case CLICK.LEFT: {

        }
        case CLICK.RIGHT: {

        }
    }
}

window.onload = main

function main() {
    canvas = document.getElementById("canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    program = initShaders(gl, "vertex-shader", "fragment-shader");

    let positionLocation = gl.getAttribLocation(program, "a_position")
    let colorLocation = gl.getAttribLocation(program, "a_color");

    let positionBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW );

    let colorBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, colorBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW );

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

        gl.enableVertexAttribArray(colorLocation);
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.vertexAttribPointer(colorLocation, 4, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays( gl.POINTS, 0, pointsArray.length );
    }
};


function initEventHandlers(canvas) {
    var dragging = false;         // Dragging or not
    var lastX = -1, lastY = -1;   // Last position of the mouse
    var current_action = 0;       // Actions: 0 - none, 1 - leftclick, 2 - middleclick, 3 - rightclick
  
    canvas.onmousedown = function (ev) {   // Mouse is pressed
      ev.preventDefault();
      var x = ev.clientX, y = ev.clientY;
      // Start dragging if a mouse is in <canvas>
      var rect = ev.target.getBoundingClientRect();
      if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
        lastX = x; lastY = y;
        dragging = true;
        current_action = ev.button + 1;
      }
    };
  
    canvas.oncontextmenu = function (ev) { ev.preventDefault(); };
  
    canvas.onmouseup = function (ev) {
      var x = ev.clientX, y = ev.clientY;
      if (x === lastX && y === lastY) { // MOUSEUP IN SAME SPOT AS LAST
      }
      dragging = false;
      current_action = 0;
    }; // Mouse is released
  
    var g_last = Date.now();
    canvas.onmousemove = function (ev) { // Mouse is moved
      var x = ev.clientX, y = ev.clientY;
      if (dragging) {
        var now = Date.now();
        var elapsed = now - g_last;
        if (elapsed > 20) {
            g_last = now;
            var rect = ev.target.getBoundingClientRect();
            var s_x = ((x - rect.left) / rect.width - 0.5) * 2;
            var s_y = (0.5 - (y - rect.top) / rect.height) * 2;
            var s_last_x = ((lastX - rect.left) / rect.width - 0.5) * 2;
            var s_last_y = (0.5 - (lastY - rect.top) / rect.height) * 2;

            switch (currentTool) {
                case TOOLS.ADD_POINTS: {
                    add_points(current_action);
                }
                case TOOLS.SELECT_POINTS: {

                }
                case TOOLS.REMOVE_POINTS: {

                }
                case TOOLS.FILL: {

                }
            }
            lastX = x, lastY = y;
        }
      }
    };
  }
  