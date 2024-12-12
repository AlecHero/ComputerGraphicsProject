let activeButtonIndex = -1; // Keep track of which button is active

function toggleToolButton(index) {
    const buttons = document.querySelectorAll('.tool-btn');
    
    if (activeButtonIndex === index) {
        buttons[index].style.background = 'rgba(255, 255, 255, 0.9)';
        activeButtonIndex = -1;
    } else {
        if (activeButtonIndex !== -1) {
            buttons[activeButtonIndex].style.background = 'rgba(255, 255, 255, 0.9)';
        }
        
        buttons[index].style.background = 'rgba(150, 150, 150, 0.9)';
        activeButtonIndex = index;
    }
    // Do Alex code here to know what tool is active
}

window.addEventListener('load', () => {
    const buttons = document.querySelectorAll('.tool-btn');
    buttons.forEach((button, index) => {
        button.addEventListener('click', () => toggleToolButton(index));
    });
});
