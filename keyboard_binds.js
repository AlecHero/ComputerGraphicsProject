
let keystroke_history = []; // t-1 state is first, then t-2, then t-3
let keystroke_future = []; // t+1 state is first, then t+2, then t+3
const MAX_HISTORY = 3;

function HandleUndoKeyPress(e) {
    var evtobj = window.event ? window.event : e;
    // console.log("Undo");
    if (evtobj.ctrlKey && evtobj.keyCode == 90 || evtobj.metaKey && evtobj.keyCode == 90) {
        console.log("Undo");
        if (keystroke_history.length > 0) {
            clear_all();
            const last_keystroke = keystroke_history.pop();
            keystroke_future.push(last_keystroke);
            simulate_keystrokes(keystroke_history.length - 1);
        }
    }
}

function HandleRedoKeyPress(e) {
    var evtobj = window.event ? window.event : e;
    // console.log("Redo");
    if (evtobj.ctrlKey && evtobj.keyCode == 89 || evtobj.metaKey && evtobj.keyCode == 89) {
        console.log("Redo");
        evtobj.preventDefault();
        if (keystroke_future.length > 0) {
            clear_all();
            keystroke_history.push(keystroke_future.shift());
            simulate_keystrokes(keystroke_history.length - 1);
        }
    }
}

function add_keystroke(mouse_position, tool, mouse_up) {
    keystroke_history.push({
        mouse_position: mouse_position,
        tool: tool,
        mouse_up: mouse_up
    });
    keystroke_future = [];
}

function simulate_keystrokes(idx) {
    for (let i = 0; i < idx; i++) {
        let keystroke = keystroke_history[i];
        if (keystroke.tool === TOOLS.NONE || (keystroke.tool === TOOLS.FILL && i != idx - 1)) {
            continue;
        }
        mouse_pos = keystroke.mouse_position;
        if (keystroke.tool === TOOLS.ADD_POINTS) {
            add_point(mouse_up=keystroke.mouse_up);
        } else if (keystroke.tool === TOOLS.FILL) {
            fill_tool();
        } else if (keystroke.tool === TOOLS.REMOVE_POINTS) {
            remove_curve();
        } else if (keystroke.tool === TOOLS.SELECT_POINTS) {
            select_point(mouse_up=keystroke.mouse_up);
        }
    }
    if (activeButtonIndex !== -1) {
        toggleToolButton(activeButtonIndex);
        currentTool = TOOLS.NONE;
    }
}



// This should be called before the change is made
function saveState(current_color, control_points, save_to_undo = true) {
    if (save_to_undo) {
        undo_history.push({
            current_color: current_color,
            control_points: control_points
        });
    } else {
        redo_history.push({
            current_color: current_color,
            control_points: control_points
        });
    }
    check_history_lengths();
}

function check_history_lengths() {
    if (undo_history.length > MAX_HISTORY) {
        undo_history.pop();
    }
    if (redo_history.length > MAX_HISTORY) {
        redo_history.pop();
    }
}

// Undo:
// - Move control point
// - Fill in color
// - Delete control point/curve
// - Add control point/curve
// - Clear canvas

// Redo:
// - Opposite of undo

