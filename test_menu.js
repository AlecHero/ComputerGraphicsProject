let activeButtonIndex = -1;
let selectedColor = '#000000';
let rgbColor = [0,0,0];

function toggleToolButton(index) {
    const buttons = document.querySelectorAll('.tool-btn');
    const colorPickerContainer = document.querySelector('.color-picker-container');
    
    if      (index == 0) { setTool(TOOLS.ADD_POINTS) }
    else if (index == 1) { setTool(TOOLS.SELECT_POINTS) }
    else if (index == 2) { setTool(TOOLS.REMOVE_POINTS) }
    else if (index == 3) { setTool(TOOLS.FILL) }
    else if (index == 4) { clear_all(); }

    current_line_width = line_width;
    update_points();

    if (index == undefined) { return; }
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

function saveImage() {
    const canvas = document.querySelector('canvas');
    let context;
    
    try {
        // Try to get WebGL context first
        context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (context) {
            // For WebGL, we need to get the image data before the buffer is cleared
            const dataURL = canvas.toDataURL('image/png');
            downloadImage(dataURL);
            return;
        }
        
        // If not WebGL, try 2D context
        context = canvas.getContext('2d');
        if (!context.getImageData(0, 0, canvas.width, canvas.height).data.some(channel => channel !== 0)) {
            console.log('Canvas appears to be empty!');
            return;
        }
        
        downloadImage(canvas.toDataURL('image/png'));
    } catch (error) {
        console.error('Error saving image:', error);
    }
}

function downloadImage(dataURL) {
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('load', () => {
        const buttons = document.querySelectorAll('.tool-btn');
        const colorPicker = document.querySelector('.color-picker');
        
        buttons.forEach((button, index) => {
            button.addEventListener('click', () => {
                toggleToolButton(index);
                if (index === 5) {
                    saveImage();
                }
            });
        });
        
        colorPicker.addEventListener('input', (e) => {
            selectedColor = e.target.value;
            rgbColor = hex2rgb(selectedColor);
            colorPicker.style.backgroundColor = selectedColor;
        });
    });
});

const hex2rgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    // return {r, g, b} 
    return [r/255, g/255, b/255];
}