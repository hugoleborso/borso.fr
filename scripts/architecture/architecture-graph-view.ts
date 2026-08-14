/**
 * The client-side half of the architecture page: a layered graph renderer.
 *
 * Written here rather than taken from a library because of three constraints
 * the usual choices do not meet. The artifact host blocks every external
 * origin, so a library has to be inlined, and the smallest capable one is
 * larger than this whole page. The generated file is compared byte for byte by
 * `--check`, so a force simulation seeded at random would fail the gate on
 * every run. And an architecture diagram wants a layered left-to-right reading,
 * which is a Sugiyama layout rather than the force layouts those libraries lead
 * with.
 *
 * The layout runs in the browser, so the emitted HTML stays identical between
 * runs no matter what the layout does.
 */

export const GRAPH_RUNTIME_SCRIPT = String.raw`
(() => {
  const MAX_COLUMN_ROWS = 7;
  const NODE_HEIGHT = 46;
  const NODE_MIN_WIDTH = 132;
  const NODE_MAX_WIDTH = 230;
  const CHARACTER_WIDTH = 7.1;
  const NODE_PADDING = 26;
  const LAYER_GAP = 104;
  const ROW_GAP = 22;
  const MARGIN = 32;
  const BARYCENTRE_SWEEPS = 6;
  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 2.6;
  const ZOOM_STEP = 0.0016;

  const measureWidth = (label) =>
    Math.max(NODE_MIN_WIDTH, Math.min(NODE_MAX_WIDTH, label.length * CHARACTER_WIDTH + NODE_PADDING));

  /**
   * Edges that close a cycle are found with a depth-first walk and held aside,
   * so the layering below runs on an acyclic graph. They are still drawn; only
   * their direction is ignored while deciding which column a node sits in.
   */
  const findBackEdges = (nodeIds, outgoing) => {
    const state = new Map(nodeIds.map((id) => [id, 0]));
    const back = new Set();
    const visit = (id) => {
      state.set(id, 1);
      for (const edge of outgoing.get(id) ?? []) {
        const mark = state.get(edge.to) ?? 0;
        if (mark === 1) back.add(edge.key);
        else if (mark === 0) visit(edge.to);
      }
      state.set(id, 2);
    };
    for (const id of nodeIds) if ((state.get(id) ?? 0) === 0) visit(id);
    return back;
  };

  const assignLayers = (nodeIds, forward, backEdges) => {
    const layer = new Map(nodeIds.map((id) => [id, 0]));
    // Longest path: relax until stable, bounded by the node count so a graph
    // whose cycles were not fully broken still terminates.
    for (let pass = 0; pass < nodeIds.length; pass += 1) {
      let moved = false;
      for (const id of nodeIds) {
        for (const edge of forward.get(id) ?? []) {
          if (backEdges.has(edge.key)) continue;
          const candidate = (layer.get(id) ?? 0) + 1;
          if (candidate > (layer.get(edge.to) ?? 0)) {
            layer.set(edge.to, candidate);
            moved = true;
          }
        }
      }
      if (!moved) break;
    }
    return layer;
  };

  const orderWithinLayers = (columns, incoming, outgoing, positionOf) => {
    for (let sweep = 0; sweep < BARYCENTRE_SWEEPS; sweep += 1) {
      const useIncoming = sweep % 2 === 0;
      for (const column of columns) {
        const barycentre = new Map();
        for (const id of column) {
          const neighbours = (useIncoming ? incoming.get(id) : outgoing.get(id)) ?? [];
          const places = neighbours
            .map((edge) => positionOf.get(useIncoming ? edge.from : edge.to))
            .filter((place) => place !== undefined);
          barycentre.set(
            id,
            places.length === 0
              ? (positionOf.get(id) ?? 0)
              : places.reduce((total, place) => total + place, 0) / places.length,
          );
        }
        column.sort((left, right) => (barycentre.get(left) ?? 0) - (barycentre.get(right) ?? 0));
        column.forEach((id, index) => positionOf.set(id, index));
      }
    }
  };

  function layoutGraph(nodes, edges) {
    const nodeIds = nodes.map((node) => node.id);
    const known = new Set(nodeIds);
    const usable = edges
      .filter((edge) => known.has(edge.from) && known.has(edge.to) && edge.from !== edge.to)
      .map((edge, index) => ({ ...edge, key: edge.from + '->' + edge.to + '#' + index }));

    const outgoing = new Map(nodeIds.map((id) => [id, []]));
    const incoming = new Map(nodeIds.map((id) => [id, []]));
    for (const edge of usable) {
      outgoing.get(edge.from).push(edge);
      incoming.get(edge.to).push(edge);
    }

    const backEdges = findBackEdges(nodeIds, outgoing);
    const layer = assignLayers(nodeIds, outgoing, backEdges);

    let columns = [];
    for (const id of nodeIds) {
      const index = layer.get(id) ?? 0;
      while (columns.length <= index) columns.push([]);
      columns[index].push(id);
    }
    const positionOf = new Map();
    for (const column of columns) column.forEach((id, index) => positionOf.set(id, index));
    orderWithinLayers(columns, incoming, outgoing, positionOf);

    // A hub with a dozen leaves makes one very tall column, which forces the
    // whole drawing into a narrow ribbon once it is scaled to fit. Splitting a
    // long column across several spends the width that would otherwise be
    // empty on either side.
    const renderColumns = [];
    for (const column of columns) {
      if (column.length <= MAX_COLUMN_ROWS) {
        renderColumns.push(column);
        continue;
      }
      const slices = Math.ceil(column.length / MAX_COLUMN_ROWS);
      const perSlice = Math.ceil(column.length / slices);
      for (let start = 0; start < column.length; start += perSlice) {
        renderColumns.push(column.slice(start, start + perSlice));
      }
    }
    columns = renderColumns;

    // Within a column, keep nodes of one boundary together. The barycentre pass
    // above minimises crossings and knows nothing of what a node is, so a fan of
    // leaves comes out interleaved: a third-party service between two browser
    // APIs reads as a relationship that does not exist.
    const groupOf = new Map(nodes.map((node) => [node.id, node.group ?? '']));
    for (const column of columns) {
      const orderWas = new Map(column.map((id, index) => [id, index]));
      column.sort((left, right) => {
        const byGroup = (groupOf.get(left) ?? '').localeCompare(groupOf.get(right) ?? '');
        return byGroup === 0 ? orderWas.get(left) - orderWas.get(right) : byGroup;
      });
    }

    const widthOfColumn = columns.map((column) =>
      column.reduce((widest, id) => {
        const node = nodes.find((each) => each.id === id);
        return Math.max(widest, measureWidth(node ? node.label : id));
      }, NODE_MIN_WIDTH),
    );

    const tallest = Math.max(1, ...columns.map((column) => column.length));
    const canvasHeight = tallest * NODE_HEIGHT + (tallest - 1) * ROW_GAP + MARGIN * 2;

    const placed = new Map();
    let cursorX = MARGIN;
    columns.forEach((column, columnIndex) => {
      const columnWidth = widthOfColumn[columnIndex];
      const columnHeight = column.length * NODE_HEIGHT + (column.length - 1) * ROW_GAP;
      let cursorY = (canvasHeight - columnHeight) / 2;
      for (const id of column) {
        placed.set(id, { x: cursorX, y: cursorY, width: columnWidth, height: NODE_HEIGHT });
        cursorY += NODE_HEIGHT + ROW_GAP;
      }
      cursorX += columnWidth + LAYER_GAP;
    });

    return {
      placed,
      edges: usable,
      width: cursorX - LAYER_GAP + MARGIN,
      height: canvasHeight,
    };
  }

  const svgElement = (name, attributes) => {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    return element;
  };

  /**
   * A cubic curve leaving the right edge and arriving at the left edge, so the
   * arrowhead always meets the target square-on. An edge that goes backwards or
   * stays inside one column is bowed outwards instead, which keeps it from
   * lying underneath the boxes it passes.
   */
  const edgePath = (from, to) => {
    const startX = from.x + from.width;
    const startY = from.y + from.height / 2;
    const endX = to.x;
    const endY = to.y + to.height / 2;
    if (endX > startX) {
      const grip = Math.max(28, (endX - startX) * 0.45);
      return 'M' + startX + ',' + startY + ' C' + (startX + grip) + ',' + startY +
        ' ' + (endX - grip) + ',' + endY + ' ' + endX + ',' + endY;
    }
    const bow = 46 + Math.abs(endY - startY) * 0.16;
    const backStartX = from.x + from.width / 2;
    const backEndX = to.x + to.width / 2;
    const lift = Math.min(startY, endY) - bow;
    return 'M' + backStartX + ',' + from.y + ' C' + backStartX + ',' + lift +
      ' ' + backEndX + ',' + lift + ' ' + backEndX + ',' + to.y;
  };

  function renderGraph(host) {
    const payload = host.querySelector('script[type="application/json"]');
    if (!payload) return;
    const data = JSON.parse(payload.textContent);
    const { placed, edges, width, height } = layoutGraph(data.nodes, data.edges);

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
      const from = placed.get(edge.from);
      const to = placed.get(edge.to);
      if (!from || !to) continue;
      const kind = edge.kind === 'type' ? 'type' : edge.kind === 'http' ? 'http' : 'import';
      const path = svgElement('path', {
        d: edgePath(from, to),
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
      const box = placed.get(node.id);
      if (!box) continue;
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
