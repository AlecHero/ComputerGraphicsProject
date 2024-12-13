// http://demofox.org/bezquadrational.html

function drawBezierCurve(controlPoints, weights, resolution) {
    if (resolution == undefined) {
        resolution = 100; // Number of points for one curve
    }
    var curvePoints = [];
    for (let i = 0; i < resolution; i++) {
        var t = i / resolution;
        var point = getBezierCurvePoint(controlPoints, weights, t);
        curvePoints.push(vec3(point[0], point[1], 0.0));
    }
    return curvePoints;
}

function getBezierCurvePoint(points, weights, t) {
    var part_one = scale(weights[0] * (1-t) * (1-t), points[0]);
    var part_two = scale(weights[1] * 2 * t * (1-t), points[2]);
    var part_three = scale(weights[2] * t * t, points[1]);
    return add(part_one, add(part_two, part_three));
}