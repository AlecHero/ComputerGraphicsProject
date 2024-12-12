
let undo_history = []; // t-1 state is first, then t-2, then t-3
let redo_history = []; // t+1 state is first, then t+2, then t+3
const MAX_HISTORY = 3;

function HandleUndoKeyPress(e, current_color, control_points) {
    var evtobj = window.event ? window.event : e;

    if (evtobj.ctrlKey && evtobj.keyCode == 90 || evtobj.metaKey && evtobj.keyCode == 90) {
        prev_state = undo_history.shift();
        if (prev_state) {
            saveState(current_color, control_points, save_to_undo=false);

            current_color = prev_state.current_color;
            control_points = prev_state.control_points;
        }
    }
}

function HandleRedoKeyPress(e, current_color, control_points) {
    var evtobj = window.event ? window.event : e;

    if (evtobj.ctrlKey && evtobj.keyCode == 89 || evtobj.metaKey && evtobj.keyCode == 89) {
        evtobj.preventDefault();
        prev_state = redo_history.shift();
        if (prev_state) {
            saveState(current_color, control_points, save_to_undo=true);

            current_color = prev_state.current_color;
            control_points = prev_state.control_points;
        }
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

