const DEFAULT_PALETTE = ['#ff0000', '#0000ff', '#ffff00', '#000000', '#ffffff'];
const INITIAL_GRID = ['#ff0000', '#0000ff', '#ffff00', '#000000', '#ffffff', '#ffffff', '#ffffff'];

const colorGrid = document.getElementById('colorGrid');

function createColorPicker(defaultValue) {
  const container = document.createElement('div');
  container.className = 'color-picker-element';

  const input = document.createElement('input');
  input.type = 'color';
  input.className = 'color-input';
  input.value = defaultValue || '#ffffff';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-btn';
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    container.remove();
  });

  container.appendChild(input);
  container.appendChild(removeBtn);
  return container;
}

function createAddColorButton() {
  const button = document.createElement('button');
  button.id = 'addColorButton';
  button.type = 'button';
  button.textContent = '+';
  button.addEventListener('click', () => {
    const newPicker = createColorPicker('#ffffff');
    colorGrid.insertBefore(newPicker, button);
  });
  return button;
}

export function initializeColorGrid() {
  colorGrid.innerHTML = '';
  for (const color of INITIAL_GRID) {
    colorGrid.appendChild(createColorPicker(color));
  }
  colorGrid.appendChild(createAddColorButton());
}

export function getSelectedColors() {
  const pickerElements = colorGrid.querySelectorAll('.color-picker-element .color-input');
  const colors = Array.from(pickerElements, (picker) => picker.value);
  return colors.length > 0 ? colors : DEFAULT_PALETTE;
}
