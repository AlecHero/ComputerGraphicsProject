
function initEventHandlers(canvas) {
    let is_dragging = false;
    
    canvas.onmousedown = function (ev) {
        ev.preventDefault();
        
        if (is_on_canvas(ev)) {
            switch (currentTool) {
                case TOOLS.ADD_POINTS: { add_point(); break; }
                // case TOOLS.REMOVE_POINTS: { remove_point(); break; }
                case TOOLS.SELECT_POINTS: { select_point(); break; }
                // case TOOLS.FILL: { fill(); break; }
            }
            is_dragging = true;
        }
    };

    canvas.onmouseup = function (ev) {
        is_dragging = false;
    };

    canvas.onmousemove = function (ev) { // Mouse is moved
        update_mouse_pos(ev);
        let is_selecting = currentTool == TOOLS.SELECT_POINTS;

        let snap_indices = find_snap(controlGroupsArray, snap_radius, include_control=is_selecting);
        let can_snap = (snap_indices !== undefined);

        document.body.style.cursor = can_snap ? "pointer" : "default";

        let is_lining = (currentGroupFixed.length > 0) && (currentGroupFixed.length < 3);

        if (is_lining && is_on_canvas(ev)) { updateCurrentControlGroup() }
        if (is_dragging) {  }
    };

    canvas.oncontextmenu = function (ev) { ev.preventDefault(); };
    
    // --------- HELPER ------------
    function is_on_canvas(ev) {
        let x = ev.clientX, y = ev.clientY;
        let rect = ev.target.getBoundingClientRect();
        return rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom
    }
    
    function update_mouse_pos(ev) {
        var x = ev.clientX, y = ev.clientY;
        let rect = ev.target.getBoundingClientRect();
        mouse_pos = [
            ((x - rect.left) / rect.width - 0.5) * 2,
            (0.5 - (y - rect.top) / rect.height) * 2
        ];
    }
}
