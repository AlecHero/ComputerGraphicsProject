var _all_points = [];

function distance(point1, point2) {
    let bool1 = point1[0] - point2[0];
    let bool2 = point1[1] - point2[1];
    return Math.sqrt(bool1 * bool1 + bool2 * bool2);
}

function color(point, edge_points, tolerance = 0.1, _init_ = true) {
    // Convert point to string for comparison
    const pointKey = `${point[0]},${point[1]}`;
    
    if (_init_) {
        _all_points = [];
    }
    
    // Check boundaries
    if (point[0] > 1 || point[1] > 1 || point[0] < 0 || point[1] < 0) {
        return null;
    }
    
    // Check if point has already been processed
    if (_all_points.some(p => `${p[0]},${p[1]}` === pointKey)) {
        return null;
    }
    
    // Check distance from edges
    for (let e_point of edge_points) {
        if (distance(point, e_point) < 1 * tolerance) {
            return null;
        }
    }
    
    // Add valid point
    _all_points.push(point);
    
    // Recursively check neighboring points
    color(vec3(point[0] + tolerance, point[1], 0.0), edge_points, tolerance, false);
    color(vec3(point[0] - tolerance, point[1], 0.0), edge_points, tolerance, false);
    color(vec3(point[0], point[1] + tolerance, 0.0), edge_points, tolerance, false);
    color(vec3(point[0], point[1] - tolerance, 0.0), edge_points, tolerance, false);
    
    return _all_points;
}

// // Test with square and point in middle
// function testColor() {
//     // Create square vertices
//     let square = [];
//     for (let x = 0.2; x <= 0.8; x += 0.1) {
//         square.push(vec3(x, 0.2, 0)); // Bottom edge
//         square.push(vec3(x, 0.8, 0)); // Top edge
//     }
//     for (let y = 0.3; y <= 0.7; y += 0.1) {
//         square.push(vec3(0.2, y, 0)); // Left edge
//         square.push(vec3(0.8, y, 0)); // Right edge
//     }
    
//     // Point in middle
//     let startPoint = vec3(0.5, 0.5, 0);
    
//     // Test coloring from middle point
//     let result = color(startPoint, square);
//     console.log("Colored points:", result);
// }

// testColor();