function setDefaultCanvasSize() {
    let defaultSize = Math.floor(Math.min(window.innerWidth * 0.8, window.innerHeight * 0.8));
    document.getElementById('widthInput').value = defaultSize;
    document.getElementById('heightInput').value = defaultSize;
    let canvas = document.getElementById('paintingCanvas');
    canvas.width = defaultSize;
    canvas.height = defaultSize;
  }
  setDefaultCanvasSize();

  const colorGrid = document.getElementById('colorGrid');

  function createColorPicker(defaultValue) {
    const container = document.createElement('div');
    container.className = 'color-picker-element';

    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'color-input';
    input.value = defaultValue || '#ffffff';

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', function(e) {
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
    button.addEventListener('click', function(){
      const newPicker = createColorPicker('#ffffff');
      colorGrid.insertBefore(newPicker, button);
    });
    return button;
  }

  function initializeColorGrid() {
    colorGrid.innerHTML = ''; 
    colorGrid.appendChild(createColorPicker('#ff0000'));
    colorGrid.appendChild(createColorPicker('#0000ff'));
    colorGrid.appendChild(createColorPicker('#ffff00'));
    colorGrid.appendChild(createColorPicker('#000000'));
    colorGrid.appendChild(createColorPicker('#ffffff'));
    colorGrid.appendChild(createColorPicker('#ffffff'));
    colorGrid.appendChild(createColorPicker('#ffffff'));
    colorGrid.appendChild(createAddColorButton());
  }
  initializeColorGrid();

  const canvas = document.getElementById('paintingCanvas');
  const ctx = canvas.getContext('2d');
  let lines = [];    
  let blocks = [];   
  let animationPhase = 0;  
  let linesAnimationStartTime = null;
  let fadeAnimationStartTime = null;
  const lineAnimDuration = 1500; 
  const fadeDuration = 1500;     
  const lineWidth = Math.max(2, Math.min(canvas.width, canvas.height) * 0.005);          
  const minBlockSize = Math.max(20, Math.min(canvas.width, canvas.height) * 0.05);       

  function hexToRGB(colorStr) {
    let r = parseInt(colorStr.slice(1, 3), 16);
    let g = parseInt(colorStr.slice(3, 5), 16);
    let b = parseInt(colorStr.slice(5, 7), 16);
    return { r, g, b };
  }

  function interpolateColor(target, factor) {
    const r = Math.round(255 + factor * (target.r - 255));
    const g = Math.round(255 + factor * (target.g - 255));
    const b = Math.round(255 + factor * (target.b - 255));
    return `rgb(${r},${g},${b})`;
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  /* --- RECURSIVE SUBDIVISION FOR SPLITS --- */
  // Returns an object with:
  //   - blocks: an array of rectangular regions (each with x, y, width, height)
  //   - splittingLines: an array of line objects (each with type and endpoints)
  // The parameter totalSplits is the number of internal splits (total lines minus 4 border lines).
  // The parameter animationMode is either "opposite" or "matching".
  function generateSubdivisionSplits(totalSplits, animationMode) {
    let rects = [{ x: 0, y: 0, width: canvas.width, height: canvas.height }];
    let splittingLines = [];

    for (let i = 0; i < totalSplits; i++) {
      // Choose only those rectangles that are large enough to split.
      let splittable = rects.filter(rect =>
        (rect.width >= 2 * minBlockSize) || (rect.height >= 2 * minBlockSize)
      );
      if (splittable.length === 0) break;

      // Pick one rectangle at random.
      let rectIndex = Math.floor(Math.random() * splittable.length);
      let rect = splittable[rectIndex];
      let globalIndex = rects.indexOf(rect);

      const canSplitVertically = rect.width >= 2 * minBlockSize;
      const canSplitHorizontally = rect.height >= 2 * minBlockSize;
      let splitDirection;
      if (canSplitVertically && canSplitHorizontally) {
        splitDirection = (Math.random() < 0.5) ? "vertical" : "horizontal";
      } else if (canSplitVertically) {
        splitDirection = "vertical";
      } else if (canSplitHorizontally) {
        splitDirection = "horizontal";
      }

      if (splitDirection === "vertical") {
        let splitX = Math.floor(randomBetween(rect.x + minBlockSize, rect.x + rect.width - minBlockSize));
        let lineObj = {
          type: "vertical",
          finalPos: splitX,
          y1: rect.y,
          y2: rect.y + rect.height
        };
        if (animationMode === "opposite") {
          // Vertical line slides in horizontally.
          lineObj.startPos = (Math.random() < 0.5) ? -lineWidth : canvas.width + lineWidth;
          lineObj.currentPos = lineObj.startPos;
        } else {
          // Matching mode: vertical line slides in vertically.
          let lineLength = lineObj.y2 - lineObj.y1;
          lineObj.startOffset = (Math.random() < 0.5) ? -lineLength - 20 : lineLength + 20;
          lineObj.currentOffset = lineObj.startOffset;
        }
        // Split the rectangle into left and right parts.
        let leftRect = { x: rect.x, y: rect.y, width: splitX - rect.x, height: rect.height };
        let rightRect = { x: splitX, y: rect.y, width: rect.x + rect.width - splitX, height: rect.height };
        rects.splice(globalIndex, 1, leftRect, rightRect);
        splittingLines.push(lineObj);
      } else if (splitDirection === "horizontal") {
        let splitY = Math.floor(randomBetween(rect.y + minBlockSize, rect.y + rect.height - minBlockSize));
        let lineObj = {
          type: "horizontal",
          finalPos: splitY,
          x1: rect.x,
          x2: rect.x + rect.width
        };
        if (animationMode === "opposite") {
          // Horizontal line slides in vertically.
          lineObj.startPos = (Math.random() < 0.5) ? -lineWidth : canvas.height + lineWidth;
          lineObj.currentPos = lineObj.startPos;
        } else {
          // Matching mode: horizontal line slides in horizontally.
          let lineLength = lineObj.x2 - lineObj.x1;
          lineObj.startOffset = (Math.random() < 0.5) ? -lineLength - 20 : lineLength + 20;
          lineObj.currentOffset = lineObj.startOffset;
        }
        // Split the rectangle into top and bottom parts.
        let topRect = { x: rect.x, y: rect.y, width: rect.width, height: splitY - rect.y };
        let bottomRect = { x: rect.x, y: splitY, width: rect.width, height: rect.y + rect.height - splitY };
        rects.splice(globalIndex, 1, topRect, bottomRect);
        splittingLines.push(lineObj);
      }
    }
    return { blocks: rects, splittingLines: splittingLines };
  }

  /* --- MAIN PAINTING GENERATION --- */
  function generatePainting() {
    // Hide the download button during generation.
    document.getElementById('downloadButton').style.display = 'none';

    const widthVal = parseInt(document.getElementById('widthInput').value);
    const heightVal = parseInt(document.getElementById('heightInput').value);
    let linesVal = parseInt(document.getElementById('linesInput').value);
    canvas.width = widthVal;
    canvas.height = heightVal;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const animationMode = document.querySelector('input[name="animationMode"]:checked').value;

    const pickerElements = colorGrid.querySelectorAll('.color-picker-element .color-input');
    let colorStrings = [];
    pickerElements.forEach(picker => {
      colorStrings.push(picker.value);
    });
    if (colorStrings.length === 0) {
      colorStrings = ["#ff0000", "#0000ff", "#ffff00", "#000000", "#ffffff"];
    }

    let splits = Math.max(0, linesVal);
    const subdivResult = generateSubdivisionSplits(splits, animationMode);
    blocks = subdivResult.blocks;
    let splittingLines = subdivResult.splittingLines;

    let borderLines = [];
    let leftBorder = { type: "vertical", finalPos: 0, y1: 0, y2: canvas.height };
    let rightBorder = { type: "vertical", finalPos: canvas.width, y1: 0, y2: canvas.height };
    let topBorder = { type: "horizontal", finalPos: 0, x1: 0, x2: canvas.width };
    let bottomBorder = { type: "horizontal", finalPos: canvas.height, x1: 0, x2: canvas.width };

    if (animationMode === "opposite") {
      leftBorder.startPos = -lineWidth;
      leftBorder.currentPos = leftBorder.startPos;
      rightBorder.startPos = canvas.width + lineWidth;
      rightBorder.currentPos = rightBorder.startPos;
      topBorder.startPos = -lineWidth;
      topBorder.currentPos = topBorder.startPos;
      bottomBorder.startPos = canvas.height + lineWidth;
      bottomBorder.currentPos = bottomBorder.startPos;
    } else {
      let verticalLength = canvas.height;
      leftBorder.startOffset = (Math.random() < 0.5) ? -verticalLength - 20 : verticalLength + 20;
      leftBorder.currentOffset = leftBorder.startOffset;
      rightBorder.startOffset = (Math.random() < 0.5) ? -verticalLength - 20 : verticalLength + 20;
      rightBorder.currentOffset = rightBorder.startOffset;
      let horizontalLength = canvas.width;
      topBorder.startOffset = (Math.random() < 0.5) ? -horizontalLength - 20 : horizontalLength + 20;
      topBorder.currentOffset = topBorder.startOffset;
      bottomBorder.startOffset = (Math.random() < 0.5) ? -horizontalLength - 20 : horizontalLength + 20;
      bottomBorder.currentOffset = bottomBorder.startOffset;
    }
    borderLines.push(leftBorder, rightBorder, topBorder, bottomBorder);

    lines = borderLines.concat(splittingLines);

    blocks.forEach(block => {
      const colorChoice = colorStrings[Math.floor(Math.random() * colorStrings.length)];
      block.targetColor = hexToRGB(colorChoice);
    });

    animationPhase = 1;
    linesAnimationStartTime = null;
    fadeAnimationStartTime = null;
    requestAnimationFrame(animationLoop);

    canvas.scrollIntoView({ behavior: 'smooth' });
  }

  function animationLoop(timestamp) {
    if (animationPhase === 1) {
      if (!linesAnimationStartTime) {
        linesAnimationStartTime = timestamp;
      }
      const elapsed = timestamp - linesAnimationStartTime;
      const progress = Math.min(elapsed / lineAnimDuration, 1);

      lines.forEach(line => {
        if (document.querySelector('input[name="animationMode"]:checked').value === "opposite") {
          if (line.type === "vertical") {
            line.currentPos = line.startPos + progress * (line.finalPos - line.startPos);
          } else if (line.type === "horizontal") {
            line.currentPos = line.startPos + progress * (line.finalPos - line.startPos);
          }
        } else {
          if (line.type === "vertical") {
            line.currentOffset = line.startOffset + progress * (0 - line.startOffset);
          } else if (line.type === "horizontal") {
            line.currentOffset = line.startOffset + progress * (0 - line.startOffset);
          }
        }
      });

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "black";
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      lines.forEach(line => {
        if (document.querySelector('input[name="animationMode"]:checked').value === "opposite") {
          if (line.type === "vertical") {
            ctx.moveTo(line.currentPos, line.y1);
            ctx.lineTo(line.currentPos, line.y2);
          } else if (line.type === "horizontal") {
            ctx.moveTo(line.x1, line.currentPos);
            ctx.lineTo(line.x2, line.currentPos);
          }
        } else {
          if (line.type === "vertical") {
            ctx.moveTo(line.finalPos, line.y1 + line.currentOffset);
            ctx.lineTo(line.finalPos, line.y2 + line.currentOffset);
          } else if (line.type === "horizontal") {
            ctx.moveTo(line.x1 + line.currentOffset, line.finalPos);
            ctx.lineTo(line.x2 + line.currentOffset, line.finalPos);
          }
        }
      });
      ctx.stroke();

      if (progress < 1) {
        requestAnimationFrame(animationLoop);
      } else {
        animationPhase = 2;
        fadeAnimationStartTime = null;
        requestAnimationFrame(animationLoop);
      }
    } else if (animationPhase === 2) {
      if (!fadeAnimationStartTime) {
        fadeAnimationStartTime = timestamp;
      }
      const elapsed = timestamp - fadeAnimationStartTime;
      const progress = Math.min(elapsed / fadeDuration, 1);

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      blocks.forEach(block => {
        ctx.fillStyle = interpolateColor(block.targetColor, progress);
        ctx.fillRect(block.x, block.y, block.width, block.height);
      });

      ctx.strokeStyle = "black";
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      lines.forEach(line => {
        if (document.querySelector('input[name="animationMode"]:checked').value === "opposite") {
          if (line.type === "vertical") {
            ctx.moveTo(line.finalPos, line.y1);
            ctx.lineTo(line.finalPos, line.y2);
          } else if (line.type === "horizontal") {
            ctx.moveTo(line.x1, line.finalPos);
            ctx.lineTo(line.x2, line.finalPos);
          }
        } else {
          if (line.type === "vertical") {
            ctx.moveTo(line.finalPos, line.y1);
            ctx.lineTo(line.finalPos, line.y2);
          } else if (line.type === "horizontal") {
            ctx.moveTo(line.x1, line.finalPos);
            ctx.lineTo(line.x2, line.finalPos);
          }
        }
      });
      ctx.stroke();

      if (progress < 1) {
        requestAnimationFrame(animationLoop);
      } else {
        animationPhase = 0;
        document.getElementById('downloadButton').style.display = 'inline-block';
      }
    }
  }

  function downloadImage() {
    const link = document.createElement('a');
    link.download = 'mondrian.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  document.getElementById('generateButton').addEventListener('click', generatePainting);
  document.getElementById('downloadButton').addEventListener('click', downloadImage);

