"use strict";

var gl;
var points;
var vertices;
var program;
var pointSize = 20.0;

var NumPoints = 3;

window.onload = function init()
{
    var canvas = document.getElementById( "c-ws1-ex2" );
    window.addEventListener('keydown', HandleUndoKeyPress);
    window.addEventListener('keydown', HandleRedoKeyPress);

    gl = WebGLUtils.setupWebGL( canvas , {preserveDrawingBuffer: true});
    if ( !gl ) { alert( "WebGL isn't available" ); }

    vertices =  [ vec2(0.0, 0.0), vec2(1, 0), vec2(1, 1) ];
    
    points = vertices;

    var weights = [1, 1, 1]; // Maybe you should be able to change these
    var resolution = 500;
    points = drawBezierCurve(points, weights, resolution);

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.3921, 0.5843, 0.9294, 1.0);

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    var maxPoints = resolution + NumPoints;
    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, 8 * maxPoints, gl.STATIC_DRAW ); // 8 bytes per vec2
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(points));

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    gl.uniform1f(gl.getUniformLocation(program, "pointSize"), pointSize);

    function render() {
        webglUtils.resizeCanvasToDisplaySize(gl.canvas);
        gl.clear( gl.COLOR_BUFFER_BIT );
        
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        gl.uniform4f(gl.getUniformLocation(program, "uColor"), 0.0, 0.0, 0.0, 1.0);
        gl.drawArrays( gl.POINTS, 0, points.length );
        
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(vertices));
        gl.uniform4f(gl.getUniformLocation(program, "uColor"), 1.0, 0.0, 0.0, 1.0);
        gl.drawArrays( gl.POINTS, 0, vertices.length );
    }
    render();

    function increasePointSize() {
        pointSize += 5.0;
        gl.uniform1f(gl.getUniformLocation(program, "pointSize"), pointSize);
        render();
    }
    
    function decreasePointSize() {
        pointSize = Math.max(5.0, pointSize - 5.0);  // Don't go below 5.0
        gl.uniform1f(gl.getUniformLocation(program, "pointSize"), pointSize);
        render();
    }

    // document.getElementById("increasePointSize").addEventListener("click", increasePointSize);
    // document.getElementById("decreasePointSize").addEventListener("click", decreasePointSize);

};



