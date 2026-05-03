import { initializeColorGrid } from './color-grid.js';
import { downloadImage, generatePainting } from './painting.js';

initializeColorGrid();

document.getElementById('generateButton').addEventListener('click', generatePainting);
document.getElementById('downloadButton').addEventListener('click', downloadImage);
