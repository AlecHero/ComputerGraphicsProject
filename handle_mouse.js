
function initEventHandlers(canvas) {
    let is_dragging = false;
    
    let is_lining = false;
    let is_selecting = false;

    let can_grab = false;
    let is_grabbing = false;

    let mouse_can_snap = false;

    canvas.onmousedown = function (ev) {
        ev.preventDefault();
        is_dragging = true;

        if (is_on_canvas(ev)) {
            switch (currentTool) {
                case TOOLS.ADD_POINTS: { add_point(); break; }
                case TOOLS.SELECT_POINTS: { select_point(); break; }
            }
        }
        update_bools();
        update_cursor();
    };
    
    canvas.onmouseup = function (ev) {
        if (is_on_canvas(ev)) {
            switch (currentTool) {
                case TOOLS.ADD_POINTS: { add_point(mouse_up=true); break; }
                case TOOLS.REMOVE_POINTS: { remove_curve(); break; }
                case TOOLS.SELECT_POINTS: { select_point(mouse_up=true); break; }
                case TOOLS.FILL: { fill_tool(); break; }
            }
        }
        is_dragging = false;
        update_bools();
        update_cursor();
    };

    canvas.onmousemove = function (ev) { // Mouse is moved
        update_mouse_pos(ev);
        update_bools();
        
        let snap_indices = find_snap(controlGroupsArray, grab_radius, include_control=(currentTool == TOOLS.SELECT_POINTS));
        mouse_can_snap = (snap_indices !== undefined);
        
        update_cursor();
        console.log(mouse_can_snap);

        if (is_on_canvas(ev)) {
            if ((is_lining) || (is_dragging && is_selecting)) {
                updateCurrentControlGroup()
            }
        }
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


    function update_bools() {
        is_lining = (currentTool == TOOLS.ADD_POINTS) && (currentGroupFixed.length > 0) && (currentGroupFixed.length < n_control_points);
        // is_adding = (currentTool == TOOLS.SELECT_POINTS);
        is_selecting = (currentTool == TOOLS.SELECT_POINTS && (currentGroupFixed.indexOf(undefined) != -1));
        // console.log(is_selecting, is_dragging, (currentGroupFixed.indexOf(undefined) != -1));
        can_grab = ((currentTool == TOOLS.SELECT_POINTS) && mouse_can_snap);
        is_grabbing = (is_selecting && is_dragging && (currentGroupFixed.indexOf(undefined) != -1));
    }

    function update_cursor() {
        let current_cursor = "default";

        if (can_grab) { current_cursor = "grab"; }
        if (is_grabbing) { current_cursor = "grabbing"; }

        // if (is_adding) { current_cursor = "pointer"; }
        // const svgPath = './pen-nib-solid.svg';
        // document.body.style.cursor = `url(${svgPath}) 0 32, auto`;
        
        document.body.style.cursor = current_cursor;
    }
}
