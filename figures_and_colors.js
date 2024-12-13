function distanceSquared(point1, point2) {
    let dx = point1[0] - point2[0];
    let dy = point1[1] - point2[1];
    return dx * dx + dy * dy;
}

function color(startPoint, edge_points, tolerance = 0.1) {
    // We'll use a set for visited points:
    const visited = new Set();
    const result = [];

    // Precompute squared tolerance for distance checks
    const tolSq = (1 * tolerance) * (1 * tolerance);

    // Boundary check function
    function inBounds(p) {
        return p[0] >= -1 && p[0] <= 1 && p[1] >= -1 && p[1] <= 1;
    }

    // Edge check function
    function isNearEdge(p) {
        // Check if point is within tolerance distance squared of any edge point
        // Break early when we find one
        for (let ep of edge_points) {
            if (distanceSquared(p, ep) < tolSq) {
                return true;
            }
        }
        return false;
    }

    // Queue (or stack) for flood fill. We'll use a queue for BFS.
    const queue = [];
    queue.push(startPoint);

    while (queue.length > 0) {
        const point = queue.pop();

        const key = point[0] + "," + point[1];
        
        // Check if already visited
        if (visited.has(key)) continue;
        
        // Check bounds
        if (!inBounds(point)) continue;
        
        // Check edge proximity
        if (isNearEdge(point)) continue;

        // Mark visited and add to result
        visited.add(key);
        result.push(point);

        // Add neighbors
        // Instead of recursion, just push onto the queue
        queue.push(vec3(point[0] + tolerance, point[1], 0.0));
        queue.push(vec3(point[0] - tolerance, point[1], 0.0));
        queue.push(vec3(point[0], point[1] + tolerance, 0.0));
        queue.push(vec3(point[0], point[1] - tolerance, 0.0));
    }

    return result;
}
