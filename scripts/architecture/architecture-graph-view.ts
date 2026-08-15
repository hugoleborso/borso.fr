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
  // How far in a reader can go, expressed as the narrowest slice of the graph
  // the canvas will show rather than as a multiple of the fitted view. A
  // multiple is the wrong unit: the component level is three thousand units
  // wide and fits at about a third of actual size, so 2.6x of that was barely
  // life size and the labels stayed unreadable. A floor in graph units gives
  // the same magnification on every level whatever its width.
  const MINIMUM_VIEW_WIDTH = 340;
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
    const body = dialog.querySelector('[data-code-body]');
    const toggle = dialog.querySelector('[data-code-view]');
    // On a diff page a changed file carries its earlier text, and reading the
    // final source to find what moved is the work the page exists to remove.
    const showFinal = () => {
      body.innerHTML = highlight(entry.code);
      body.classList.remove('as-diff');
    };
    const showDiff = () => {
      body.replaceChildren(
        buildDiffRows(
          collapseDiff(diffLines(entry.baseCode.split('\n'), entry.code.split('\n'))),
          highlight,
        ),
      );
      body.classList.add('as-diff');
    };
    if (toggle) {
      toggle.hidden = !entry.baseCode;
      toggle.textContent = 'show whole file';
      if (entry.baseCode) {
        toggle.onclick = () => {
          const wasDiff = body.classList.contains('as-diff');
          toggle.textContent = wasDiff ? 'show what changed' : 'show whole file';
          if (wasDiff) showFinal();
          else showDiff();
        };
      }
    }
    if (entry.baseCode) showDiff();
    else showFinal();
    dialog.showModal();
  };

  /**
   * Anything outside a graph that names a source: a level 4 row, a blueprint,
   * a follower. The dialog is the same one the blocks open, so a reader who
   * learned to click a block does not have to learn a second thing.
   */
  const wirePageSources = () => {
    const holder = document.getElementById('page-sources');
    if (!holder) return;
    const sources = JSON.parse(holder.textContent || '{}');
    for (const element of document.querySelectorAll('[data-source-key]')) {
      const entry = sources[element.dataset.sourceKey];
      if (!entry) continue;
      element.classList.add('has-code');
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        openCode(entry);
      });
      element.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openCode(entry);
      });
    }
  };


  /**
   * A line diff, by longest common subsequence.
   *
   * The page cannot reach a diff library, and the inputs are two versions of
   * one markdown document — a few hundred lines each — so the quadratic table
   * is nothing. Equal runs are collapsed to a context window, because a rule
   * that gained a paragraph should not be read as a document that changed
   * everywhere.
   */
  const CONTEXT_LINES = 3;

  const diffLines = (before, after) => {
    const rows = before.length;
    const columns = after.length;
    const table = [];
    for (let row = 0; row <= rows; row += 1) table.push(new Uint32Array(columns + 1));
    for (let row = rows - 1; row >= 0; row -= 1) {
      for (let column = columns - 1; column >= 0; column -= 1) {
        table[row][column] =
          before[row] === after[column]
            ? table[row + 1][column + 1] + 1
            : Math.max(table[row + 1][column], table[row][column + 1]);
      }
    }
    const out = [];
    let row = 0;
    let column = 0;
    while (row < rows && column < columns) {
      if (before[row] === after[column]) {
        out.push({ kind: 'same', text: before[row], before: row + 1, after: column + 1 });
        row += 1;
        column += 1;
      } else if (table[row + 1][column] >= table[row][column + 1]) {
        out.push({ kind: 'removed', text: before[row], before: row + 1, after: null });
        row += 1;
      } else {
        out.push({ kind: 'added', text: after[column], before: null, after: column + 1 });
        column += 1;
      }
    }
    while (row < rows) { out.push({ kind: 'removed', text: before[row], before: row + 1, after: null }); row += 1; }
    while (column < columns) { out.push({ kind: 'added', text: after[column], before: null, after: column + 1 }); column += 1; }
    return out;
  };

  /** Drop the long equal runs, keeping a few lines either side of each change. */
  const collapseDiff = (rows) => {
    const keep = new Array(rows.length).fill(false);
    rows.forEach((row, index) => {
      if (row.kind === 'same') return;
      for (let near = index - CONTEXT_LINES; near <= index + CONTEXT_LINES; near += 1) {
        if (near >= 0 && near < rows.length) keep[near] = true;
      }
    });
    const out = [];
    let skipped = 0;
    rows.forEach((row, index) => {
      if (keep[index]) {
        if (skipped > 0) { out.push({ kind: 'gap', text: skipped + ' unchanged lines' }); skipped = 0; }
        out.push(row);
        return;
      }
      skipped += 1;
    });
    if (skipped > 0) out.push({ kind: 'gap', text: skipped + ' unchanged lines' });
    return out;
  };

  /**
   * Diff rows as DOM, gutter and all.
   *
   * The standards view and the code dialog ask the same question of different
   * text, and the paint callback is where they differ: a rule is read as prose,
   * a module is read with its syntax coloured.
   */
  const buildDiffRows = (rows, paint) => {
    const table = document.createElement('div');
    table.className = 'diff-rows';
    for (const row of rows) {
      const line = document.createElement('div');
      line.className = 'diff-row diff-' + row.kind;
      const gutter = document.createElement('span');
      gutter.className = 'diff-gutter';
      gutter.textContent =
        row.kind === 'gap' ? '' : (row.before === null ? '' : String(row.before)) + ' ' + (row.after === null ? '' : String(row.after));
      const text = document.createElement('span');
      text.className = 'diff-text';
      if (row.kind === 'gap' || !paint) {
        text.textContent = row.kind === 'gap' ? '⋯ ' + row.text : row.text;
      } else {
        text.innerHTML = paint(row.text);
      }
      line.append(gutter, text);
      table.appendChild(line);
    }
    return table;
  };

  /**
   * The standards view: a document, its commits, and the diff between two.
   *
   * The whole text at every commit is already in the page, so choosing a pair
   * is a redraw. Clicking a commit moves the right-hand end of the range and
   * pushes the old one left, which is what makes stepping through the history
   * one click rather than two.
   */
  const wireStandards = () => {
    const host = document.querySelector('[data-standards]');
    if (!host) return;
    const data = JSON.parse(host.querySelector('script[type="application/json"]').textContent);
    const timeline = host.querySelector('[data-standard-timeline]');
    const diffHost = host.querySelector('[data-standard-diff]');
    const ruleHost = host.querySelector('[data-standard-rule]');
    const rangeHost = host.querySelector('[data-standard-range]');
    let documentIndex = 0;
    let fromIndex = 0;
    let toIndex = 0;

    const renderDiff = () => {
      const document_ = data.documents[documentIndex];
      const versions = document_.versions;
      diffHost.replaceChildren();
      if (versions.length === 0) {
        diffHost.innerHTML = '<p class="standard-empty">No commit history for this document.</p>';
        return;
      }
      // Newest first in the data; a range reads oldest to newest.
      const older = versions[Math.max(fromIndex, toIndex)];
      const newer = versions[Math.min(fromIndex, toIndex)];
      rangeHost.textContent =
        older === newer
          ? 'showing ' + newer.sha + ' as it stood'
          : older.sha + ' \u2192 ' + newer.sha;
      const rows =
        older === newer
          ? newer.text.split('\n').map((text, index) => ({ kind: 'same', text, before: index + 1, after: index + 1 }))
          : collapseDiff(diffLines(older.text.split('\n'), newer.text.split('\n')));
      const added = rows.filter((row) => row.kind === 'added').length;
      const removed = rows.filter((row) => row.kind === 'removed').length;
      const summary = document.createElement('p');
      summary.className = 'standard-diff-summary';
      summary.textContent =
        older === newer
          ? rows.length + ' lines'
          : '+' + added + ' \u2212' + removed + ' across ' + rows.length + ' shown lines';
      diffHost.appendChild(summary);
      diffHost.appendChild(buildDiffRows(rows, null));
    };

    const renderTimeline = () => {
      const document_ = data.documents[documentIndex];
      ruleHost.textContent = document_.rule;
      timeline.replaceChildren();
      document_.versions.forEach((version, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'commit';
        const isEnd = index === fromIndex || index === toIndex;
        const low = Math.min(fromIndex, toIndex);
        const high = Math.max(fromIndex, toIndex);
        button.classList.toggle('selected', isEnd);
        button.classList.toggle('within', index > low && index < high);
        button.setAttribute('aria-pressed', String(isEnd));
        const sha = document.createElement('code');
        sha.textContent = version.sha;
        const date = document.createElement('span');
        date.className = 'commit-date';
        date.textContent = version.date;
        const subject = document.createElement('span');
        subject.className = 'commit-subject';
        subject.textContent = version.subject;
        const link = document.createElement('a');
        link.className = 'commit-link';
        link.href = 'https://github.com/' + data.repositorySlug + '/commit/' + version.sha;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = 'on GitHub';
        button.append(sha, date, subject);
        button.addEventListener('click', () => {
          fromIndex = toIndex;
          toIndex = index;
          renderTimeline();
          renderDiff();
        });
        const cell = document.createElement('div');
        cell.className = 'commit-cell';
        cell.append(button, link);
        timeline.appendChild(cell);
      });
    };

    for (const choice of host.querySelectorAll('[data-standard-index]')) {
      choice.addEventListener('click', () => {
        documentIndex = Number(choice.dataset.standardIndex);
        const versions = data.documents[documentIndex].versions;
        toIndex = 0;
        fromIndex = versions.length > 1 ? 1 : 0;
        for (const other of host.querySelectorAll('[data-standard-index]')) {
          other.setAttribute('aria-pressed', String(other === choice));
        }
        renderTimeline();
        renderDiff();
      });
    }

    const first = data.documents[0];
    fromIndex = first && first.versions.length > 1 ? 1 : 0;
    renderTimeline();
    renderDiff();
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
        class: 'node node-' + (node.tone || 'neutral') + (node.status ? ' node-' + node.status : ''),
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
      const labelY = box.y + (bare ? box.height / 2 + 5 : 24);
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
          y: box.y + 24 + ROW_PITCH * (index + 1),
          class: 'node-sub',
        });
        sub.textContent = line;
        group.appendChild(sub);
      });
      let chipY = box.y + 24 + ROW_PITCH * lines.length + 6;
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
      const nextWidth = Math.min(
        width / ZOOM_MIN,
        Math.max(Math.min(MINIMUM_VIEW_WIDTH, width), view.width * factor),
      );
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
      // A journey whose one action is the whole thing offers no overview, so it
      // lists that action alone rather than the same graph under two names.
      const overview = feature.overview
        ? [
            {
              id: feature.id + ':__all__',
              // With no action to contrast it against, the overview is the only
              // entry, and "Everything in x" reads as a subset of something else.
              label: feature.actions.length === 0 ? feature.label : 'Everything in ' + feature.label,
              meta:
                feature.actions.length === 0
                  ? 'what it is made of'
                  : feature.actions.length + (feature.actions.length === 1 ? ' action' : ' actions'),
            },
          ]
        : [];
      const entries = [
        ...overview,
        ...feature.actions.map((action) => ({
          id: action.id,
          label: action.label,
          // The shell's action is an address rather than a call, so it carries
          // no method and joining unconditionally left a leading space.
          meta: [action.method, action.path].filter(Boolean).join(' '),
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
  wirePageSources();
  wireStandards();
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
  .node-label { font: 700 15px var(--font-mono); fill: var(--ink); }
  .node-sub { font: 10.5px var(--font-mono); fill: var(--muted); }
  .node-icon { font: 15px var(--font-sans); }
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
  .node-step-screen .node-stripe { fill: var(--accent); }
  .node-step-screen .node-body { fill: var(--accent-soft); }
  .node-step-gesture .node-stripe { fill: var(--signal); }
  .node-step-gesture .node-body { fill: var(--signal-soft); }
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

  /* The diff page paints what a branch did: green for a block the target
     branch did not have, amber for one whose contents moved, red for one it had
     and this branch does not. Everything else keeps its layer colour, so the
     change reads against an unchanged map rather than against nothing. */
  .node-added .node-body { stroke: var(--layer-service); stroke-width: 2.4; fill: var(--layer-service-bg); }
  .node-added .node-stripe { fill: var(--layer-service); }
  .node-changed .node-body { stroke: var(--signal); stroke-width: 2.4; fill: var(--signal-soft); }
  .node-changed .node-stripe { fill: var(--signal); }
  .node-removed .node-body { stroke: var(--layer-edge); stroke-width: 2.4; fill: var(--layer-edge-bg); stroke-dasharray: 5 3; }
  .node-removed .node-stripe { fill: var(--layer-edge); }
  .node-removed .node-label { text-decoration: line-through; }
  /* Moved is its own colour because "this file is elsewhere now" and "this file
     was rewritten" are different amounts of reading, and painting a pure rename
     as new code sends a reviewer looking for something that does not exist. */
  .node-moved .node-body { stroke: var(--accent); stroke-width: 2.4; fill: var(--accent-soft); stroke-dasharray: 2 3; }
  .node-moved .node-stripe { fill: var(--accent); }

  .diff-legend {
    display: flex; flex-wrap: wrap; align-items: center; gap: .4rem 1rem;
    margin: .2rem 0 0; font: .75rem/1.6 var(--font-mono); color: var(--muted);
  }
  .diff-legend .swatch { width: .8rem; height: .8rem; border-radius: 3px; display: inline-block; margin-right: .3rem; vertical-align: -1px; }
  .diff-legend .added { background: var(--layer-service-bg); border: 2px solid var(--layer-service); }
  .diff-legend .changed { background: var(--signal-soft); border: 2px solid var(--signal); }
  .diff-legend .moved { background: var(--accent-soft); border: 2px dashed var(--accent); }
  .diff-legend .removed { background: var(--layer-edge-bg); border: 2px dashed var(--layer-edge); }
  .diff-legend span { color: var(--muted); opacity: .8; }

  .level-count {
    font: 500 .72rem/1.4 var(--font-mono);
    color: var(--muted);
    vertical-align: middle;
    margin-left: .5rem;
  }
  .level-count.flagged { color: var(--signal); }

  .diff-counts {
    display: flex; flex-wrap: wrap; align-items: center; gap: .3rem .9rem;
    margin: .5rem 0 0; padding: 0; list-style: none;
    font: .78rem/1.6 var(--font-mono); color: var(--muted);
  }
  .diff-counts b { font-size: 1rem; color: var(--ink); margin-right: .3rem; }
  .diff-counts .count-added b { color: var(--layer-service); }
  .diff-counts .count-edited b { color: var(--signal); }
  .diff-counts .count-renamed b { color: var(--accent); }
  .diff-counts .count-removed b { color: var(--layer-edge); }
  .diff-counts .baseline { opacity: .8; }
  .diff-note { margin: .35rem 0 0; font: .72rem/1.5 var(--font-mono); color: var(--muted); max-width: 78ch; }
  .stats .delta { font-style: normal; font-size: .7rem; color: var(--accent); margin-left: .3rem; }
  .renamed-from { display: block; font-size: .68rem; color: var(--muted); }

  tr.row-added td { background: var(--layer-service-bg); }
  tr.row-changed td { background: var(--signal-soft); }
  tr.row-moved td { background: var(--accent-soft); }
  tr.row-removed td { background: var(--layer-edge-bg); text-decoration: line-through; }
  tr.row-removed .layer { text-decoration: none; }

  .node.has-code { cursor: zoom-in; }
  tr.has-code, li.has-code { cursor: zoom-in; }
  tr.has-code:hover td { background: var(--accent-soft); }
  li.has-code:hover { color: var(--accent); }
  table.clickable tbody tr:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  .undeclared { color: var(--muted); font-style: italic; }
  .subject { color: var(--muted); }
  .followers > summary { cursor: pointer; font: .7rem/1.6 var(--font-mono); color: var(--muted); }
  .followers > ul { list-style: none; margin: .35rem 0 0; padding: 0; display: grid; gap: .1rem; }
  .followers > ul li { min-width: 0; overflow-wrap: anywhere; }
  .standards-heading { margin: 1.6rem 0 .3rem; font: 600 .95rem/1.4 var(--font-mono); }

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
  .code-modal-view {
    margin-left: auto;
    font: 500 .74rem/1 var(--font-mono);
    background: var(--accent-soft);
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: 6px;
    padding: .3rem .55rem;
    cursor: pointer;
  }
  .code-modal-view[hidden] { display: none; }
  .code-modal-view + .code-modal-close { margin-left: .4rem; }
  .code-body.as-diff { display: block; white-space: normal; }
  .code-body.as-diff .diff-text { white-space: pre; }
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

  .cards-panel { margin-top: 1rem; }
  .cards-panel > summary,
  .coverage-missing > summary {
    cursor: pointer;
    font: 500 .78rem/1.6 var(--font-mono);
    color: var(--muted);
    padding: .4rem .6rem;
    background: var(--panel-sunk);
    border: 1px solid var(--line);
    border-radius: 7px;
  }
  .cards-panel > summary:hover,
  .coverage-missing > summary:hover { border-color: var(--accent); color: var(--accent); }
  .cards-panel[open] > summary { margin-bottom: .8rem; }

  .coverage { margin-top: 1.2rem; }
  .coverage h3 {
    margin: 0 0 .3rem;
    font: 600 .84rem/1.5 var(--font-mono);
    display: flex;
    flex-wrap: wrap;
    gap: .5rem;
    align-items: baseline;
  }
  .coverage h3 b { font-weight: 500; color: var(--muted); }
  .coverage-percent {
    margin-left: auto;
    font: 600 .84rem/1.5 var(--font-mono);
    color: var(--accent);
  }
  .coverage-rule { margin: 0 0 .7rem; color: var(--muted); font-size: .8rem; line-height: 1.6; }
  .coverage-layers {
    list-style: none;
    margin: 0 0 .8rem;
    padding: 0;
    display: grid;
    gap: .25rem .9rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
  }
  .coverage-layers li {
    display: grid;
    grid-template-columns: 7rem 1fr auto;
    align-items: center;
    gap: .5rem;
    font: .68rem/1.6 var(--font-mono);
    color: var(--muted);
    min-width: 0;
  }
  .coverage-layer { overflow-wrap: anywhere; }
  .coverage-bar {
    height: 6px;
    border-radius: 3px;
    background: var(--line);
    overflow: hidden;
    min-width: 0;
  }
  .coverage-bar i { display: block; height: 100%; background: var(--accent); }
  .coverage-layers .partial .coverage-bar i { background: var(--signal); }
  .coverage-layers .partial .coverage-count { color: var(--signal); font-weight: 600; }
  .coverage-none { margin: 0; color: var(--muted); font-size: .78rem; }
  .coverage-missing > ul {
    list-style: none;
    margin: .6rem 0 0;
    padding: 0;
    display: grid;
    gap: .15rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
  }
  .coverage-missing > ul li { min-width: 0; overflow-wrap: anywhere; }

  .standards { display: grid; gap: 1rem; }
  .standard-picker { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: .8rem .9rem; }
  .standard-list { display: grid; gap: .3rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); margin-top: .45rem; }
  .standard-choice {
    display: grid; gap: .1rem; text-align: left; cursor: pointer; min-width: 0;
    background: var(--panel-sunk); border: 1px solid var(--line); border-radius: 7px; padding: .4rem .55rem;
  }
  .standard-choice:hover { border-color: var(--accent); }
  .standard-choice[aria-pressed='true'] { border-color: var(--accent); background: var(--accent-soft); }
  .standard-title { font: 600 .78rem/1.4 var(--font-mono); color: var(--ink); overflow-wrap: anywhere; }
  .standard-count { font: .66rem/1.5 var(--font-mono); color: var(--muted); }
  .standard-body { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: .9rem 1rem; min-width: 0; }
  .standard-rule { margin: 0 0 .8rem; color: var(--muted); font-size: .82rem; line-height: 1.6; }
  .standard-timeline-head { display: flex; flex-wrap: wrap; gap: .5rem; align-items: baseline; justify-content: space-between; }
  .standard-range { font: 600 .72rem/1.5 var(--font-mono); color: var(--accent); }
  .standard-timeline { display: flex; gap: .5rem; overflow-x: auto; padding: .5rem 0 .7rem; }
  .commit-cell { display: grid; gap: .2rem; min-width: 13rem; }
  .commit {
    display: grid; gap: .1rem; text-align: left; cursor: pointer;
    background: var(--panel-sunk); border: 1px solid var(--line); border-radius: 7px; padding: .45rem .55rem;
  }
  .commit:hover { border-color: var(--accent); }
  .commit.within { border-color: var(--accent); opacity: .75; }
  .commit.selected { border-color: var(--accent); background: var(--accent-soft); box-shadow: inset 0 0 0 1px var(--accent); }
  .commit code { font: 600 .74rem/1.5 var(--font-mono); color: var(--accent); }
  .commit-date { font: .66rem/1.5 var(--font-mono); color: var(--muted); }
  .commit-subject { font: .68rem/1.45 var(--font-mono); color: var(--muted); overflow-wrap: anywhere; }
  .commit-link { font: .64rem/1.5 var(--font-mono); color: var(--muted); text-decoration: none; padding-left: .1rem; }
  .commit-link:hover { color: var(--accent); text-decoration: underline; }
  .standard-diff-summary { margin: 0 0 .5rem; font: 600 .74rem/1.5 var(--font-mono); color: var(--muted); }
  .diff-rows { border: 1px solid var(--line); border-radius: 8px; overflow: auto; max-height: 34rem; }
  .diff-row { display: grid; grid-template-columns: 5.5rem 1fr; font: .74rem/1.6 var(--font-mono); }
  .diff-gutter { color: var(--muted); text-align: right; padding: 0 .5rem; opacity: .7; user-select: none; white-space: nowrap; }
  .diff-text { padding: 0 .6rem; white-space: pre-wrap; overflow-wrap: anywhere; min-width: 0; }
  .diff-added { background: var(--layer-service-bg); }
  .diff-added .diff-text { color: var(--layer-service); }
  .diff-removed { background: var(--layer-edge-bg); }
  .diff-removed .diff-text { color: var(--layer-edge); }
  .diff-gap { background: var(--panel-sunk); }
  .diff-gap .diff-text { color: var(--muted); font-style: italic; }
  .standard-empty { color: var(--muted); font-size: .8rem; }

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
