let activeButtonIndex = -1;
let selectedColor = '#000000';

function toggleToolButton(index) {
    const buttons = document.querySelectorAll('.tool-btn');
    const colorPickerContainer = document.querySelector('.color-picker-container');
    
    if (index == 0) { setTool(TOOLS.ADD_POINTS) }
    else if (index == 1) { setTool(TOOLS.REMOVE_POINTS) }
    else if (index == 2) { setTool(TOOLS.SELECT_POINTS) }
    else if (index == 3) { setTool(TOOLS.FILL) }
    else if (index == 4) {  }

    if (activeButtonIndex === index) {
        buttons[index].style.background = 'rgba(255, 255, 255, 0.9)';
        activeButtonIndex = -1;
        
        if (index === 3) {
            colorPickerContainer.style.visibility = 'hidden';
        }
    } else {
        if (activeButtonIndex !== -1) {
            buttons[activeButtonIndex].style.background = 'rgba(255, 255, 255, 0.9)';
            if (activeButtonIndex === 3) {
                colorPickerContainer.style.visibility = 'hidden';
            }
        }
        
        buttons[index].style.background = 'rgba(150, 150, 150, 0.9)';
        activeButtonIndex = index;
        
        if (index === 3) {
            const buttonRect = buttons[index].getBoundingClientRect();
            colorPickerContainer.style.left = `${buttonRect.right + 5}px`;
            colorPickerContainer.style.top = `${buttonRect.top}px`;
            colorPickerContainer.style.visibility = 'visible';
        }
    }
}

// Get bucket color with:
// document.querySelector('.color-picker').style.backgroundColor

window.addEventListener('load', () => {
    const buttons = document.querySelectorAll('.tool-btn');
    const colorPicker = document.querySelector('.color-picker');
    
    buttons.forEach((button, index) => {
        button.addEventListener('click', () => toggleToolButton(index));
    });
    
    colorPicker.addEventListener('input', (e) => {
        selectedColor = e.target.value;
        colorPicker.style.backgroundColor = selectedColor;
    });
});