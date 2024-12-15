
function initEventHandlers(canvas) {
    let is_dragging = false;
    
    canvas.onmousedown = function (ev) {
        ev.preventDefault();
        let mouse_pos = get_mouse_pos(ev);
        
        if (is_on_canvas(ev)) {
            switch (currentTool) {
                case TOOLS.ADD_POINTS: { add_point(mouse_pos); }
                // case TOOLS.REMOVE_POINTS: { remove_point(); }
                // case TOOLS.SELECT_POINTS: { select_point(); }
                // case TOOLS.FILL: { fill(); }
            }
            is_dragging = true;
        }
    };

    canvas.onmouseup = function (ev) {
        is_dragging = false;
    };

    canvas.onmousemove = function (ev) { // Mouse is moved
        let mouse_pos = get_mouse_pos(ev);
        console.log(mouse_pos);
        snapped_coord = get_snapped(mouse_pos, concatControlPointsArray, snap_radius);
        if (snapped_coord !== undefined) {
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'default';
        }

        let is_lining = (currentControlGroupFixed.length > 0) && (currentControlGroupFixed.length < 3);

        if (is_lining && is_on_canvas(ev)) { updateCurrentControlGroup(mouse_pos) }
        if (is_dragging) {  }
    };

    canvas.oncontextmenu = function (ev) { ev.preventDefault(); };
    
    // --------- HELPER ------------
    function is_on_canvas(ev) {
        let x = ev.clientX, y = ev.clientY;
        let rect = ev.target.getBoundingClientRect();
        return rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom
    }
    
    function get_mouse_pos(ev) {
        var x = ev.clientX, y = ev.clientY;
        let rect = ev.target.getBoundingClientRect();
        let mouse_pos = [
            ((x - rect.left) / rect.width - 0.5) * 2,
            (0.5 - (y - rect.top) / rect.height) * 2
        ];
        return mouse_pos
    }
}
