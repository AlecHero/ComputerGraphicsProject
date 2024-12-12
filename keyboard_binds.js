function HandleUndoKeyPress(e) {
    var evtobj = window.event ? window.event : e;

    if (evtobj.ctrlKey && evtobj.keyCode == 90 || evtobj.metaKey && evtobj.keyCode == 90) {
        alert('Ctrl+z');
    }
}

function HandleRedoKeyPress(e) {
    var evtobj = window.event ? window.event : e;

    if (evtobj.ctrlKey && evtobj.keyCode == 89 || evtobj.metaKey && evtobj.keyCode == 89) {
        evtobj.preventDefault();
        alert('Ctrl+y');
    }
}