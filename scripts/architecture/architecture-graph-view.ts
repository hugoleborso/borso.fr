/**
 * The client-side half of the architecture page: drawing and interaction.
 *
 * There is no layout here. ELK places the nodes and routes the edges in the
 * generator, so this receives coordinates and bend points and only has to draw
 * them, which is why the page carries no layout engine. See ADR-0011.
 */

export const GRAPH_RUNTIME_SCRIPT = String.raw`
(() => {
  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 2.6;
  const ZOOM_STEP = 0.0016;
  const CORNER_RADIUS = 9;

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

  function renderGraph(host) {
    const payload = host.querySelector('script[type="application/json"]');
    if (!payload) return;
    const data = JSON.parse(payload.textContent);
    const width = data.width;
    const height = data.height;
    const placed = new Map(data.nodes.map((node) => [node.id, node]));
    const edges = data.edges;

    const svg = svgElement('svg', {
      width: width,
      height: height,
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
      const label = svgElement('text', {
        x: box.x + 14, y: box.y + (node.sublabel ? 20 : 27), class: 'node-label',
      });
      label.textContent = node.label;
      group.appendChild(label);
      if (node.sublabel) {
        const sub = svgElement('text', { x: box.x + 14, y: box.y + 34, class: 'node-sub' });
        sub.textContent = node.sublabel;
        group.appendChild(sub);
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
      const toggle = (event) => {
        event.stopPropagation();
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
      view.x = 0; view.y = 0; view.width = width; view.height = height;
      applyView();
    };

    svg.addEventListener('wheel', (event) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const ratioX = (event.clientX - rect.left) / rect.width;
      const ratioY = (event.clientY - rect.top) / rect.height;
      const factor = Math.exp(event.deltaY * ZOOM_STEP);
      const nextWidth = Math.min(width / ZOOM_MIN, Math.max(width / ZOOM_MAX, view.width * factor));
      const scale = nextWidth / view.width;
      view.x += (view.width - nextWidth) * ratioX;
      view.y += (view.height - view.height * scale) * ratioY;
      view.width = nextWidth;
      view.height *= scale;
      applyView();
    }, { passive: false });

    let dragging = null;
    svg.addEventListener('pointerdown', (event) => {
      dragging = { x: event.clientX, y: event.clientY };
      svg.setPointerCapture(event.pointerId);
      svg.classList.add('grabbing');
    });
    svg.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const rect = svg.getBoundingClientRect();
      view.x -= ((event.clientX - dragging.x) / rect.width) * view.width;
      view.y -= ((event.clientY - dragging.y) / rect.height) * view.height;
      dragging = { x: event.clientX, y: event.clientY };
      applyView();
    });
    const endDrag = () => { dragging = null; svg.classList.remove('grabbing'); };
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);

    const stage = host.querySelector('.graph-stage');
    stage.appendChild(svg);
    const resetButton = host.querySelector('[data-graph-reset]');
    if (resetButton) resetButton.addEventListener('click', fit);
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
  .graph-bar button {
    font: 500 .7rem/1 var(--font-mono);
    color: var(--muted);
    background: var(--panel);
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    padding: .35rem .6rem;
    cursor: pointer;
    margin-left: auto;
  }
  .graph-bar button:hover { color: var(--ink); }
  .graph-legend { display: flex; gap: .8rem; flex-wrap: wrap; align-items: center; }
  .graph-legend span { font: .66rem/1.4 var(--font-mono); color: var(--muted); display: inline-flex; align-items: center; gap: .3rem; }
  .legend-line { width: 20px; height: 0; border-top: 2px solid var(--muted); display: inline-block; }
  .legend-line.type { border-top-style: dashed; }
  .legend-line.http { border-top-color: var(--accent); border-top-width: 3px; }
  /*
     The canvas keeps its natural size and the stage scrolls. Scaling a thirty
     node graph down to the container width is what made the component level
     unreadable: every label shrank so the whole thing could be seen at once,
     which is the one thing a reader does not need.
  */
  .graph-stage { overflow: auto; max-height: 66vh; }
  .graph svg { display: block; touch-action: none; cursor: grab; }
  .graph svg.grabbing { cursor: grabbing; }

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
`;
