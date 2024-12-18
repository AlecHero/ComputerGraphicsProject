// http://demofox.org/bezquadrational.html

function computeBezierCurve(controlPointGroup, resolution=35) {
    var curvePoints = [];
    for (let i = 0; i <= (resolution-1); i++) {
        var t = i / (resolution-1);
        var point = cubicBezierCurvePoint(t, controlPointGroup);
        curvePoints.push([point[0], point[1], 0.0]);
    }
    return curvePoints;
}

const cubicBezierBasisMatrix = math.matrix([
    [ 1,  0,  0,  0],
    [-3,  3,  0,  0],
    [ 3, -6,  3,  0],
    [-1,  3, -3,  1],
]);

function cubicBezierCurvePoint(t, controlPointGroup) {
    let [p0,p1,p2,p3] = controlPointGroup;
    const T = math.transpose(math.matrix([1, t, t**2, t**3]));
    const P = math.matrix([p0,p1,p3,p2]);
    const basis = math.multiply(T, cubicBezierBasisMatrix);
    const point = math.multiply(math.transpose(basis), P);
    return [point.get([0]), point.get([1])];
}


function getBezierCurvePoint(t, controlPointGroup) {
    var part_one   = scale((1-t) * (1-t), vec3(...controlPointGroup[0])); // Start point
    var part_two   = scale(2 * t * (1-t), vec3(...controlPointGroup[2])); // Control point
    var part_three = scale(t * t,         vec3(...controlPointGroup[1])); // End point
    return add(part_one, add(part_two, part_three));
}

function createThickLine(p1, p2, width) {
    let aspect_ratio = canvas.width / canvas.height;

    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -(dy / len) * (width / 2) / aspect_ratio;
    const ny = (dx / len) * (width / 2);

    // Has double first and double last point to avoid triangle_strip connecting differnet curves
    // Unfortunately that also means that each line segment currently doesn't connect which leads
    // to very choppy results in certain configurations.
    let line = [
        p1[0] + nx, p1[1] + ny, 0.0, // Top-left of the first point
        p1[0] - nx, p1[1] - ny, 0.0, // Bottom-left of the first point
        p2[0] + nx, p2[1] + ny, 0.0, // Top-right of the second point
        p2[0] - nx, p2[1] - ny, 0.0, // Bottom-right of the second point
        // p2[0] - nx, p2[1] - ny, 0.0, p1[0] - nx, p1[1] - ny, 0.0,
        // p1[0] - nx, p1[1] - ny, 0.0, p1[0] + nx, p1[1] + ny, 0.0,
    ];
    return line
}

function createThickLinesFromCurve(points, width) {
    const thickLines = [];

    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        
        // Generate a thick line segment for the current pair of points
        const thickLine = createThickLine(p1, p2, width);
        thickLines.push(...thickLine);
    }
    
    // Creating degenerate triangles(?)
    let start_point = thickLines.slice(0, 3);
    let last_point = thickLines.slice(-3);
    thickLines.splice(0, 0, ...start_point); // first point of first line
    thickLines.push(...last_point);
    
    return thickLines;
}