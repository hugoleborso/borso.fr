/**
 * The client-side half of the architecture page: drawing and interaction.
 *
 * There is no layout here. ELK places the nodes and routes the edges in the
 * generator, so this receives coordinates and bend points and only has to draw
 * them, which is why the page carries no layout engine. See ADR-0011.
 */

import { CHIP_ROW_HEIGHT, NODE_LINE_HEIGHT } from './architecture-layout';

export const GRAPH_RUNTIME_SCRIPT = String.raw`
(() => {
  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 2.6;
  const ZOOM_STEP = 0.0016;
  const CORNER_RADIUS = 9;
  const ROW_PITCH = ${NODE_LINE_HEIGHT};
  const CHIP_ROW_HEIGHT = ${CHIP_ROW_HEIGHT};
  const ICON_WIDTH = 22;
  const CHIP_PADDING = 16;
  const CHIP_GAP = 6;
  const CHIP_ROW_MAX_WIDTH = 320;
  const CHIP_CHARACTER_WIDTH = 6.5;
  const DRAG_SLOP = 5;

  const svgElement = (name, attributes) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    return element;
  };

  /**
   * A polyline through the points ELK routed, with the corners rounded.
   *
   * The points already avoid every box, so the drawing must not wander from
   * them: the corner radius is clamped to a third of the shorter adjacent
   * segment, which keeps a rounded corner inside the lane its two segments
   * were routed through.
   */
  const edgePath = (points) => {
    if (points.length < 2) return '';
    if (points.length === 2) {
      return 'M' + points[0].x + ',' + points[0].y + ' L' + points[1].x + ',' + points[1].y;
    }
    const parts = ['M' + points[0].x + ',' + points[0].y];
    for (let index = 1; index < points.length - 1; index += 1) {
      const previous = points[index - 1];
      const corner = points[index];
      const next = points[index + 1];
      const inLength = Math.hypot(corner.x - previous.x, corner.y - previous.y);
      const outLength = Math.hypot(next.x - corner.x, next.y - corner.y);
      const radius = Math.min(CORNER_RADIUS, inLength / 3, outLength / 3);
      if (radius < 0.5) {
        parts.push('L' + corner.x + ',' + corner.y);
        continue;
      }
      const enterX = corner.x - ((corner.x - previous.x) / inLength) * radius;
      const enterY = corner.y - ((corner.y - previous.y) / inLength) * radius;
      const leaveX = corner.x + ((next.x - corner.x) / outLength) * radius;
      const leaveY = corner.y + ((next.y - corner.y) / outLength) * radius;
      parts.push('L' + enterX.toFixed(1) + ',' + enterY.toFixed(1));
      parts.push('Q' + corner.x + ',' + corner.y + ' ' + leaveX.toFixed(1) + ',' + leaveY.toFixed(1));
    }
    const last = points[points.length - 1];
    parts.push('L' + last.x + ',' + last.y);
    return parts.join(' ');
  };

  const KEYWORDS = new Set([
    'as', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default',
    'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'from',
    'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new',
    'null', 'of', 'readonly', 'return', 'satisfies', 'static', 'switch', 'this', 'throw', 'true',
    'try', 'type', 'typeof', 'undefined', 'var', 'void', 'while', 'yield',
  ]);

  // This whole script is emitted from a template literal, so a backtick written
  // here would close it two files upstream rather than land in the page.
  const QUOTES = { template: String.fromCharCode(96) };

  const escapeText = (text) =>
    text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

  const span = (className, text) =>
    className === '' ? escapeText(text) : '<span class="tok-' + className + '">' + escapeText(text) + '</span>';

  /**
   * Colour one snippet of TypeScript.
   *
   * A scanner rather than one pattern per token type: a URL inside a string
   * contains a comment opener and an apostrophe inside a comment opens a
   * string, so whichever of the two a regular expression matched first would
   * swallow the rest of the file. Walking left to right, each construct ends
   * where its own rules say it ends. The page cannot reach a highlighting
   * library — its content policy allows no other origin — and the alternative
   * is inlining one for a snippet of at most eighty lines.
   */
  const highlight = (code) => {
    let out = '';
    let index = 0;
    while (index < code.length) {
      const character = code[index];
      const pair = code.slice(index, index + 2);
      if (pair === '//') {
        const newline = code.indexOf('\n', index);
        const stop = newline === -1 ? code.length : newline;
        out += span('comment', code.slice(index, stop));
        index = stop;
        continue;
      }
      if (pair === '/*') {
        const closer = code.indexOf('*/', index + 2);
        const stop = closer === -1 ? code.length : closer + 2;
        out += span('comment', code.slice(index, stop));
        index = stop;
        continue;
      }
      if (character === "'" || character === '"' || character === QUOTES.template) {
        let cursor = index + 1;
        while (cursor < code.length) {
          if (code[cursor] === '\\') { cursor += 2; continue; }
          if (code[cursor] === character) { cursor += 1; break; }
          cursor += 1;
        }
        out += span('string', code.slice(index, cursor));
        index = cursor;
        continue;
      }
      if (character >= '0' && character <= '9') {
        let cursor = index;
        while (cursor < code.length && /[\w.]/.test(code[cursor])) cursor += 1;
        out += span('number', code.slice(index, cursor));
        index = cursor;
        continue;
      }
      if (/[A-Za-z_$]/.test(character)) {
        let cursor = index;
        while (cursor < code.length && /[\w$]/.test(code[cursor])) cursor += 1;
        const word = code.slice(index, cursor);
        let after = cursor;
        while (after < code.length && code[after] === ' ') after += 1;
        const kind = KEYWORDS.has(word)
          ? 'keyword'
          : /^[A-Z]/.test(word)
            ? 'type'
            : code[after] === '(' ? 'call' : '';
        out += span(kind, word);
        index = cursor;
        continue;
      }
      out += escapeText(character);
      index += 1;
    }
    return out;
  };

  /**
   * Show one function's source.
   *
   * A block names a function, and the question a reader has next is what it
   * does. The dialog is native, so Escape and the backdrop close it without
   * any handling here.
   */
  const openCode = (entry) => {
    const dialog = document.getElementById('code-modal');
    if (!dialog || !entry) return;
    dialog.querySelector('[data-code-name]').textContent = entry.name;
    dialog.querySelector('[data-code-layer]').textContent = entry.layer;
    const blueprintSlot = dialog.querySelector('[data-code-blueprint]');
    blueprintSlot.textContent = entry.blueprint || 'no blueprint';
    blueprintSlot.classList.toggle('absent', !entry.blueprint);
    const metricSlot = dialog.querySelector('[data-code-metrics]');
    if (metricSlot) {
      const counts = [entry.lines + ' lines', 'cx ' + entry.complexity];
      if (entry.disables > 0) {
        counts.push(entry.disables + ' disable' + (entry.disables === 1 ? '' : 's'));
      }
      metricSlot.textContent = counts.join(' · ');
    }
    dialog.querySelector('[data-code-location]').textContent = entry.location;
    dialog.querySelector('[data-code-body]').innerHTML = highlight(entry.code);
    dialog.showModal();
  };

  function buildScene(host, data) {
    const width = data.width;
    const sources = data.sources || {};
    const height = data.height;
    const placed = new Map(data.nodes.map((node) => [node.id, node]));
    const edges = data.edges;

    const svg = svgElement('svg', {
      viewBox: '0 0 ' + width + ' ' + height,
      role: 'img',
      'aria-label': data.title || 'architecture graph',
      preserveAspectRatio: 'xMidYMid meet',
    });

    const defs = svgElement('defs', {});
    for (const [id, className] of [
      ['arrow-import', 'marker-import'],
      ['arrow-type', 'marker-type'],
      ['arrow-http', 'marker-http'],
      ['arrow-lit', 'marker-lit'],
    ]) {
      const marker = svgElement('marker', {
        id: id + '-' + data.level,
        viewBox: '0 0 12 12',
        refX: 11,
        refY: 6,
        markerWidth: 12,
        markerHeight: 12,
        orient: 'auto-start-reverse',
        markerUnits: 'userSpaceOnUse',
      });
      const head = svgElement('path', { d: 'M1,1 L11,6 L1,11 Z', class: className });
      marker.appendChild(head);
      defs.appendChild(marker);
    }
    svg.appendChild(defs);

    const edgeLayer = svgElement('g', { class: 'edges' });
    const nodeLayer = svgElement('g', { class: 'nodes' });
    svg.appendChild(edgeLayer);
    svg.appendChild(nodeLayer);

    const incidentByNode = new Map(data.nodes.map((node) => [node.id, []]));
    for (const edge of edges) {
      if (!placed.has(edge.from) || !placed.has(edge.to) || edge.points.length < 2) continue;
      const kind = edge.kind === 'type' ? 'type' : edge.kind === 'http' ? 'http' : 'import';
      const path = svgElement('path', {
        d: edgePath(edge.points),
        class: 'edge edge-' + kind,
        'marker-end': 'url(#arrow-' + kind + '-' + data.level + ')',
      });
      if (edge.label) {
        const title = svgElement('title', {});
        title.textContent = edge.label;
        path.appendChild(title);
      }
      edgeLayer.appendChild(path);
      incidentByNode.get(edge.from).push(path);
      incidentByNode.get(edge.to).push(path);
    }

    const nodeElements = new Map();
    for (const node of data.nodes) {
      const box = node;
      const group = svgElement('g', {
        class: 'node node-' + (node.tone || 'neutral'),
        tabindex: '0',
        role: 'button',
        'aria-label': node.label + '. ' + (node.detail || ''),
      });
      group.appendChild(svgElement('rect', {
        x: box.x, y: box.y, width: box.width, height: box.height, rx: 8, class: 'node-body',
      }));
      group.appendChild(svgElement('rect', {
        x: box.x, y: box.y, width: 4, height: box.height, rx: 2, class: 'node-stripe',
      }));
      // The name sits on the first row and every fact about the block on its
      // own row under it, at the pitch the generator sized the box with, then
      // the pills. The generator decided the wrapping, so the two agree.
      const lines = node.lines || [];
      const chips = node.chips || [];
      const bare = lines.length === 0 && chips.length === 0;
      const labelY = box.y + (bare ? box.height / 2 + 4 : 21);
      if (node.icon) {
        const icon = svgElement('text', { x: box.x + 13, y: labelY, class: 'node-icon' });
        icon.textContent = node.icon;
        group.appendChild(icon);
      }
      const label = svgElement('text', {
        x: box.x + (node.icon ? 13 + ICON_WIDTH : 14),
        y: labelY,
        class: 'node-label',
      });
      label.textContent = node.label;
      group.appendChild(label);
      lines.forEach((line, index) => {
        const sub = svgElement('text', {
          x: box.x + 14,
          y: box.y + 21 + ROW_PITCH * (index + 1),
          class: 'node-sub',
        });
        sub.textContent = line;
        group.appendChild(sub);
      });
      let chipY = box.y + 21 + ROW_PITCH * lines.length + 6;
      let chipX = box.x + 14;
      let usedInRow = 0;
      for (const chip of chips) {
        const width = ICON_WIDTH + chip.text.length * CHIP_CHARACTER_WIDTH + CHIP_PADDING;
        if (usedInRow > 0 && usedInRow + CHIP_GAP + width > CHIP_ROW_MAX_WIDTH) {
          chipY += CHIP_ROW_HEIGHT;
          chipX = box.x + 14;
          usedInRow = 0;
        }
        group.appendChild(svgElement('rect', {
          x: chipX, y: chipY, width, height: 17, rx: 5,
          class: 'node-chip node-chip-' + (chip.tone || 'plain'),
        }));
        const text = svgElement('text', { x: chipX + 8, y: chipY + 12, class: 'node-chip-text' });
        text.textContent = chip.icon + ' ' + chip.text;
        group.appendChild(text);
        chipX += width + CHIP_GAP;
        usedInRow += (usedInRow > 0 ? CHIP_GAP : 0) + width;
      }
      const title = svgElement('title', {});
      title.textContent = node.detail || node.label;
      group.appendChild(title);
      nodeLayer.appendChild(group);
      nodeElements.set(node.id, group);
    }

    const clearFocus = () => {
      svg.classList.remove('focused');
      for (const element of nodeElements.values()) element.classList.remove('dim', 'lit');
      for (const path of edgeLayer.children) path.classList.remove('dim', 'lit');
    };

    const focusNode = (id) => {
      const neighbours = new Set([id]);
      for (const edge of edges) {
        if (edge.from === id) neighbours.add(edge.to);
        if (edge.to === id) neighbours.add(edge.from);
      }
      svg.classList.add('focused');
      for (const [nodeId, element] of nodeElements) {
        element.classList.toggle('lit', neighbours.has(nodeId));
        element.classList.toggle('dim', !neighbours.has(nodeId));
      }
      const incident = new Set(incidentByNode.get(id) ?? []);
      for (const path of edgeLayer.children) {
        path.classList.toggle('lit', incident.has(path));
        path.classList.toggle('dim', !incident.has(path));
      }
    };

    let pinned = null;
    for (const [id, element] of nodeElements) {
      element.addEventListener('mouseenter', () => { if (pinned === null) focusNode(id); });
      element.addEventListener('mouseleave', () => { if (pinned === null) clearFocus(); });
      element.addEventListener('focus', () => { if (pinned === null) focusNode(id); });
      element.addEventListener('blur', () => { if (pinned === null) clearFocus(); });
      const nodeData = placed.get(id);
      const entry = nodeData && nodeData.sourceKey ? sources[nodeData.sourceKey] : null;
      if (entry) element.classList.add('has-code');
      const toggle = (event) => {
        event.stopPropagation();
        if (entry) {
          focusNode(id);
          openCode(entry);
          return;
        }
        if (pinned === id) { pinned = null; clearFocus(); return; }
        pinned = id;
        focusNode(id);
      };
      element.addEventListener('click', toggle);
      element.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(event); }
      });
    }
    svg.addEventListener('click', () => { pinned = null; clearFocus(); });

    const view = { x: 0, y: 0, width, height };
    const applyView = () => {
      svg.setAttribute('viewBox', view.x + ' ' + view.y + ' ' + view.width + ' ' + view.height);
    };
    const fit = () => {
      view.x = 0;
      view.y = 0;
      view.width = width;
      view.height = height;
      applyView();
    };

    /**
     * A client point in the graph's own coordinates.
     *
     * The canvas is letterboxed inside the stage whenever their aspect ratios
     * differ, so mapping a finger or a cursor by the element's bounding box
     * would drift by the size of the letterbox. The screen transform knows
     * about that, and about the current viewBox, so zooming stays anchored on
     * the point the user actually touched.
     */
    const toGraphPoint = (clientX, clientY) => {
      const matrix = svg.getScreenCTM();
      if (matrix === null) return null;
      const point = svg.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      return point.matrixTransform(matrix.inverse());
    };

    /** Zoom by the given factor while holding the given client point still. */
    const zoomAround = (factor, clientX, clientY) => {
      const anchor = toGraphPoint(clientX, clientY);
      if (anchor === null) return;
      const nextWidth = Math.min(width / ZOOM_MIN, Math.max(width / ZOOM_MAX, view.width * factor));
      const applied = nextWidth / view.width;
      view.x = anchor.x - (anchor.x - view.x) * applied;
      view.y = anchor.y - (anchor.y - view.y) * applied;
      view.width = nextWidth;
      view.height *= applied;
      applyView();
    };

    const zoomCentre = (factor) => {
      const rect = svg.getBoundingClientRect();
      zoomAround(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
    };

    svg.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        zoomAround(Math.exp(event.deltaY * ZOOM_STEP), event.clientX, event.clientY);
      },
      { passive: false },
    );

    /**
     * One pointer pans, two pinch. Pointer events cover mouse, pen and touch,
     * so the same handler serves a trackpad drag and a thumb and forefinger;
     * touch-action none on the canvas is what stops the browser taking the
     * gesture for page scrolling first.
     */
    const active = new Map();
    const origins = new Map();
    const captured = new Set();
    let pinchDistance = 0;

    const pointerPair = () => {
      const points = [...active.values()];
      return points.length < 2 ? null : points;
    };
    const distanceBetween = (pair) => Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y);

    svg.addEventListener('pointerdown', (event) => {
      active.set(event.pointerId, { x: event.clientX, y: event.clientY });
      origins.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const pair = pointerPair();
      pinchDistance = pair === null ? 0 : distanceBetween(pair);
      svg.classList.add('grabbing');
    });

    svg.addEventListener('pointermove', (event) => {
      const previous = active.get(event.pointerId);
      if (previous === undefined) return;
      active.set(event.pointerId, { x: event.clientX, y: event.clientY });

      // Capture keeps a drag alive when the finger leaves the canvas, and it
      // retargets the click that ends the gesture to the canvas. Taking it on
      // the first press is what stopped a tap on a block from reaching the
      // block; taking it once the pointer has actually travelled leaves a tap
      // alone and still holds a real drag. It throws for a pointer id the
      // element never really received, so a failure must not take the gesture
      // down with it.
      const origin = origins.get(event.pointerId);
      if (!captured.has(event.pointerId) && origin !== undefined &&
          Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > DRAG_SLOP) {
        captured.add(event.pointerId);
        try {
          svg.setPointerCapture(event.pointerId);
        } catch {
          /* the gesture still works without capture */
        }
      }

      const pair = pointerPair();
      if (pair !== null) {
        const distance = distanceBetween(pair);
        if (pinchDistance > 0 && distance > 0) {
          zoomAround(
            pinchDistance / distance,
            (pair[0].x + pair[1].x) / 2,
            (pair[0].y + pair[1].y) / 2,
          );
        }
        pinchDistance = distance;
        return;
      }

      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      view.x -= ((event.clientX - previous.x) / rect.width) * view.width;
      view.y -= ((event.clientY - previous.y) / rect.height) * view.height;
      applyView();
    });

    const releasePointer = (event) => {
      active.delete(event.pointerId);
      origins.delete(event.pointerId);
      captured.delete(event.pointerId);
      pinchDistance = 0;
      if (active.size === 0) svg.classList.remove('grabbing');
    };
    svg.addEventListener('pointerup', releasePointer);
    svg.addEventListener('pointercancel', releasePointer);

    const stage = host.querySelector('.graph-stage');
    stage.replaceChildren(svg);

    /**
     * Give the stage the height the fitted graph actually needs.
     *
     * A fixed height letterboxes every graph whose shape does not match it, and
     * the component level is four times wider than it is tall: in a phone-width
     * column it fitted to a strip a tenth of the box, with the rest empty. The
     * clamp keeps a very wide graph from becoming a hairline and a very tall
     * one from running off the screen.
     */
    const MINIMUM_STAGE_HEIGHT = 150;
    const sizeStage = () => {
      const available = stage.clientWidth;
      if (available === 0 || width === 0) return;
      const maximum = Math.round(window.innerHeight * 0.72);
      const fitted = (available * height) / width;
      stage.style.height = Math.round(Math.max(MINIMUM_STAGE_HEIGHT, Math.min(maximum, fitted))) + 'px';
    };
    sizeStage();
    window.addEventListener('resize', sizeStage);

    return { fit, zoomCentre };
  }

  /**
   * A host either carries one graph or a set of them keyed by id. The journey
   * level is the second kind: the reader picks a feature and an action, and the
   * scene is rebuilt for that selection. Controls are wired once, against
   * whichever scene is current, so switching never stacks a second listener.
   */
  function renderGraph(host) {
    const payload = host.querySelector('script[type="application/json"]');
    if (!payload) return;
    const data = JSON.parse(payload.textContent);
    let current = null;

    const show = (graph) => {
      current = buildScene(host, {
        level: data.level,
        title: data.title,
        sources: data.sources,
        width: graph.width,
        height: graph.height,
        nodes: graph.nodes,
        edges: graph.edges,
      });
    };

    for (const [selector, action] of [
      ['[data-graph-reset]', () => current && current.fit()],
      ['[data-graph-zoom-in]', () => current && current.zoomCentre(1 / 1.35)],
      ['[data-graph-zoom-out]', () => current && current.zoomCentre(1.35)],
    ]) {
      const button = host.querySelector(selector);
      if (button) button.addEventListener('click', action);
    }

    if (!data.graphs) {
      show(data);
      return;
    }

    const actionList = host.querySelector('[data-journey-actions]');
    const selectAction = (actionId) => {
      const graph = data.graphs[actionId];
      if (!graph) return;
      for (const button of host.querySelectorAll('[data-action-id]')) {
        button.setAttribute('aria-pressed', String(button.dataset.actionId === actionId));
      }
      show(graph);
    };

    const selectFeature = (featureId) => {
      for (const button of host.querySelectorAll('[data-feature-id]')) {
        button.setAttribute('aria-pressed', String(button.dataset.featureId === featureId));
      }
      const feature = data.features.find((each) => each.id === featureId);
      if (!feature || !actionList) return;
      actionList.replaceChildren();
      const entries = [
        { id: feature.id + ':__all__', label: 'Everything in ' + feature.label, meta: feature.actions.length + ' actions' },
        ...feature.actions.map((action) => ({
          id: action.id,
          label: action.label,
          meta: action.method + ' ' + action.path,
        })),
      ];
      for (const entry of entries) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'journey-action';
        button.dataset.actionId = entry.id;
        button.setAttribute('aria-pressed', 'false');
        const name = document.createElement('span');
        name.className = 'journey-action-name';
        name.textContent = entry.label;
        const meta = document.createElement('span');
        meta.className = 'journey-action-meta';
        meta.textContent = entry.meta;
        button.append(name, meta);
        button.addEventListener('click', () => selectAction(entry.id));
        actionList.appendChild(button);
      }
      const first = entries[1] || entries[0];
      if (first) selectAction(first.id);
    };

    for (const button of host.querySelectorAll('[data-feature-id]')) {
      button.addEventListener('click', () => selectFeature(button.dataset.featureId));
    }
    const firstFeature = data.features[0];
    if (firstFeature) selectFeature(firstFeature.id);
  }

  for (const host of document.querySelectorAll('.graph')) renderGraph(host);
})();
`;

export const GRAPH_STYLES = String.raw`
  .graph {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 12px;
    margin-bottom: 1.75rem;
    overflow: hidden;
  }
  .graph-bar {
    display: flex;
    align-items: center;
    gap: .75rem;
    flex-wrap: wrap;
    padding: .6rem .9rem;
    border-bottom: 1px solid var(--line);
    background: var(--panel-sunk);
  }
  .graph-hint { font: .7rem/1.4 var(--font-mono); color: var(--muted); }

  .graph-legend { display: flex; gap: .8rem; flex-wrap: wrap; align-items: center; }
  .graph-legend span { font: .66rem/1.4 var(--font-mono); color: var(--muted); display: inline-flex; align-items: center; gap: .3rem; }
  .legend-line { width: 20px; height: 0; border-top: 2px solid var(--muted); display: inline-block; }
  .legend-line.type { border-top-style: dashed; }
  .legend-line.http { border-top-color: var(--accent); border-top-width: 3px; }
  /*
     The stage has a height and the canvas fits inside it, so a level opens
     showing the whole graph. Reading it then means zooming: scroll or pinch,
     or the two buttons. touch-action none is what lets a pinch reach the
     canvas rather than being taken by the page first.
  */
  /* The height is set per graph from its own aspect ratio; this is the value
     before the script runs and the floor a very wide graph lands on. */
  .graph-stage { height: 300px; overflow: hidden; }
  .graph svg {
    display: block;
    width: 100%;
    height: 100%;
    touch-action: none;
    cursor: grab;
    user-select: none;
  }
  .graph svg.grabbing { cursor: grabbing; }
  .graph-controls { display: flex; gap: .3rem; margin-left: auto; }
  .graph-controls button {
    font: 500 .72rem/1 var(--font-mono);
    color: var(--muted);
    background: var(--panel);
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    padding: .35rem .55rem;
    cursor: pointer;
    min-width: 2rem;
  }
  .graph-controls button:hover { color: var(--ink); border-color: var(--accent); }
  .edge { fill: none; stroke: var(--line-strong); stroke-width: 1.6; opacity: .55; transition: stroke .12s, opacity .12s; }
  .edge-type { stroke-dasharray: 5 4; }
  .edge-http { stroke: var(--accent); stroke-width: 2.6; }
  .marker-import, .marker-type { fill: var(--line-strong); }
  .marker-http { fill: var(--accent); }
  .marker-lit { fill: var(--accent); }
  .edges .dim { opacity: .07; }
  .edges .lit { stroke: var(--accent); stroke-width: 2.6; opacity: 1; }

  .node { cursor: pointer; }
  .node-body { fill: var(--panel); stroke: var(--line-strong); stroke-width: 1; transition: opacity .12s; }
  .node-stripe { fill: var(--muted); }
  .node-label { font: 600 12.5px var(--font-mono); fill: var(--ink); }
  .node-sub { font: 10.5px var(--font-mono); fill: var(--muted); }
  .node-icon { font: 13px var(--font-sans); }
  .node-chip { fill: var(--chip); stroke: var(--line); stroke-width: 1; }
  .node-chip-text { font: 10px var(--font-mono); fill: var(--muted); }
  .node-chip-blueprint { fill: var(--accent-soft); stroke: var(--accent); }
  .node-chip-complexity { fill: var(--layer-pure-bg); stroke: var(--layer-pure); }
  .node-chip-size { fill: var(--layer-route-bg); stroke: var(--layer-route); }
  .node-chip-warn { fill: var(--signal-soft); stroke: var(--signal); }
  .node:hover .node-body, .node:focus-visible .node-body { stroke: var(--accent); stroke-width: 2; }
  .node:focus-visible { outline: none; }
  .nodes .dim { opacity: .22; }
  .nodes .lit .node-body { stroke: var(--accent); stroke-width: 2; }

  .node-actor .node-stripe { fill: var(--layer-pure); }
  .node-system .node-stripe { fill: var(--accent); }
  .node-external .node-stripe { fill: var(--signal); }
  .node-browser .node-stripe { fill: var(--layer-route); }
  .node-aws .node-stripe { fill: var(--layer-data); }
  .node-build .node-stripe { fill: var(--muted); }
  .node-api .node-stripe { fill: var(--layer-service); }
  .node-site .node-stripe { fill: var(--layer-route); }
  .node-domain .node-stripe { fill: var(--layer-pure); }
  .node-infrastructure .node-stripe { fill: var(--layer-data); }
  .node-external .node-body { stroke-dasharray: 4 3; }

  /* The journey level colours a node by what it is in the flow, so the reader
     can see the shape — screen, hook, wire, service, data — before reading a
     single label. */
  .node-step-ui .node-stripe { fill: var(--layer-route); }
  .node-step-hook .node-stripe { fill: var(--layer-service); }
  .node-step-endpoint .node-stripe { fill: var(--accent); }
  .node-step-endpoint .node-body { stroke: var(--accent); stroke-width: 1.6; }
  .node-step-controller .node-stripe { fill: var(--layer-route); }
  .node-step-service .node-stripe { fill: var(--layer-service); }
  .node-step-repository .node-stripe { fill: var(--layer-data); }
  .node-step-database .node-stripe { fill: var(--layer-data); }
  .node-step-core .node-stripe,
  .node-step-utils .node-stripe { fill: var(--layer-pure); }
  .node-step-table .node-stripe { fill: var(--layer-data); }
  .node-step-table .node-body { fill: var(--layer-data-bg); }
  .node-step-external .node-stripe { fill: var(--signal); }
  .node-step-external .node-body { stroke-dasharray: 4 3; }

  .journey-picker {
    display: flex;
    flex-direction: column;
    gap: .45rem;
    padding: .8rem .9rem;
    border-bottom: 1px solid var(--line);
    background: var(--panel-sunk);
  }
  .journey-picker-label {
    font: 600 .64rem/1.4 var(--font-mono);
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--muted);
  }
  .journey-features, .journey-actions { display: flex; gap: .35rem; flex-wrap: wrap; }
  .journey-feature {
    font: 500 .74rem/1 var(--font-mono);
    color: var(--muted);
    background: var(--panel);
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    padding: .35rem .7rem;
    cursor: pointer;
  }
  .journey-feature[aria-pressed='true'] {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--panel);
  }
  .journey-action {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: .15rem;
    font: inherit;
    text-align: left;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 7px;
    padding: .4rem .6rem;
    cursor: pointer;
    max-width: 100%;
  }
  .journey-action-name { font: 600 .78rem/1.3 var(--font-sans); color: var(--ink); }
  .journey-action-meta {
    font: .64rem/1.3 var(--font-mono);
    color: var(--muted);
    overflow-wrap: anywhere;
  }
  .journey-action[aria-pressed='true'] {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .journey-action[aria-pressed='true'] .journey-action-name { color: var(--accent); }

  .node.has-code { cursor: zoom-in; }

  dialog.code-modal {
    border: 1px solid var(--line-strong);
    border-radius: 12px;
    background: var(--panel);
    color: var(--ink);
    padding: 0;
    width: min(78ch, 94vw);
    max-height: 86vh;
    overflow: hidden;
  }
  dialog.code-modal::backdrop { background: rgb(0 0 0 / 45%); }
  .code-modal-head {
    display: flex;
    align-items: baseline;
    gap: .5rem;
    flex-wrap: wrap;
    padding: .85rem 1rem;
    border-bottom: 1px solid var(--line);
    background: var(--panel-sunk);
  }
  .code-modal-head h3 { margin: 0; font: 600 .95rem/1.3 var(--font-mono); }
  .code-chip {
    font: 500 .64rem/1.5 var(--font-mono);
    padding: .1rem .45rem;
    border-radius: 5px;
    background: var(--chip);
    color: var(--muted);
    white-space: nowrap;
  }
  .code-chip.layer { background: var(--accent-soft); color: var(--accent); }
  .code-chip.absent { opacity: .65; font-style: italic; }
  .code-modal-head .loc { flex: 1 1 100%; overflow-wrap: anywhere; }
  .code-modal-close {
    margin-left: auto;
    font: 500 .74rem/1 var(--font-mono);
    background: var(--panel);
    color: var(--muted);
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    padding: .3rem .55rem;
    cursor: pointer;
  }
  .code-modal pre {
    margin: 0;
    padding: 1rem;
    overflow: auto;
    max-height: 68vh;
    font: .76rem/1.55 var(--font-mono);
    white-space: pre;
    tab-size: 2;
  }

  /* The token colours reuse the layer palette, so the modal follows the page
     into dark mode without a second set of variables. */
  .tok-comment { color: var(--muted); font-style: italic; }
  .tok-string { color: var(--layer-service); }
  .tok-number { color: var(--layer-data); }
  .tok-keyword { color: var(--layer-edge); }
  .tok-type { color: var(--layer-route); }
  .tok-call { color: var(--layer-pure); }

  .orphan-routes { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .4rem; }
  .orphan-routes li {
    display: flex;
    align-items: baseline;
    gap: .45rem;
    flex-wrap: wrap;
    background: var(--signal-soft);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: .25rem .5rem;
    /* A route path is one unbroken token, and the longest here is wider than a
       phone column, so it has to be allowed to break mid-string. */
    min-width: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
  }
  .orphan-routes code { color: var(--signal); font-weight: 600; overflow-wrap: anywhere; }
`;
