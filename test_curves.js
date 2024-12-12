"use strict";

var gl;
var points;
var vertices;
var program;

var NumPoints = 3;

window.onload = function init()
{
    var canvas = document.getElementById( "c-ws1-ex2" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //
    //  Initialize our data for the Sierpinski Gasket
    //

    // First, initialize the corners of our gasket with three points.

    vertices =  [ vec2(0.0, 0.0), vec2(1, 0), vec2(1, 1) ];
    
    points = vertices;

    var weights = [1, 1, 1];
    var resolution = 100;
    console.log(points);
    points = drawBezierCurve(points, weights, resolution);

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.3921, 0.5843, 0.9294, 1.0);

    //  Load shaders and initialize attribute buffers

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU
    // Create buffer with enough space for all curve points
    var maxPoints = resolution + NumPoints;
    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, 8 * maxPoints, gl.STATIC_DRAW ); // 8 bytes per vec2
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(points));

    // Associate out shader variables with our data buffer

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    render();
};


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    
    // Draw curve points in black
    gl.uniform4f(gl.getUniformLocation(program, "uColor"), 0.0, 0.0, 0.0, 1.0);
    gl.drawArrays( gl.POINTS, 0, points.length );
    
    // Draw control points in red
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(vertices));
    gl.uniform4f(gl.getUniformLocation(program, "uColor"), 1.0, 0.0, 0.0, 1.0);
    gl.drawArrays( gl.POINTS, 0, vertices.length );
}