"use strict";

var gl;
var points;
var vertices;
var program;
var pointSize = 10.0;

var NumPoints = 3;

window.onload = function init()
{
    var canvas = document.getElementById( "c-ws1-ex2" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    vertices =  [ vec2(0.0, 0.0), vec2(1, 0), vec2(1, 1) ];
    var vertices2 = [vec2(1, 1), vec2(0, 1), vec2(0, 0)];
    
    var resolution = 500;
    points = drawBezierCurve(vertices, resolution);
    points.push(...drawBezierCurve(vertices2, resolution));
    vertices.push(...vertices2);

    let colors = [];
    let colors_vec2 = [];
    colors = fillTool(vec3(0.5, 0.5, 0), points, 0.02);
    colors_vec2 = colors.map(color => vec2(color[0], color[1]));
    
    // console.log(points);
    // console.log(colors);

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.3921, 0.5843, 0.9294, 1.0);

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    var maxPoints = Math.max(2 * (resolution + NumPoints) * Float32Array.BYTES_PER_ELEMENT, colors_vec2.length);
    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, 20 * maxPoints, gl.STATIC_DRAW ); // 8 bytes per vec2
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(points));

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
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

        gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(colors));
        gl.uniform4f(gl.getUniformLocation(program, "uColor"), 1.0, 0.0, 0.0, 1.0);
        gl.drawArrays( gl.POINTS, 0, colors.length );
    }
    render();
};



