function distanceSquared(point1, point2) {
    let dx = point1[0] - point2[0];
    let dy = point1[1] - point2[1];
    return dx * dx + dy * dy;
}

function color(startPoint, edge_points, tolerance = 0.1) {
    const visited = new Set();
    const result = [];
    const tolSq = (1 * tolerance) * (1 * tolerance);

    function inBounds(p) {
        return p[0] >= -1 && p[0] <= 1 && p[1] >= -1 && p[1] <= 1;
    }

    function isNearEdge(p) {
        for (let ep of edge_points) {
            if (distanceSquared(p, ep) < tolSq) {
                return true;
            }
        }
        return false;
    }
    const queue = [];
    queue.push(startPoint);

    while (queue.length > 0) {
        const point = queue.pop();
        const key = point[0] + "," + point[1];
        if (visited.has(key)) continue;
        if (!inBounds(point)) continue;
        if (isNearEdge(point)) continue;

        visited.add(key);
        result.push(point);
        queue.push(vec3(point[0] + tolerance, point[1], 0.0));
        queue.push(vec3(point[0] - tolerance, point[1], 0.0));
        queue.push(vec3(point[0], point[1] + tolerance, 0.0));
        queue.push(vec3(point[0], point[1] - tolerance, 0.0));
    }

    return result;
}
