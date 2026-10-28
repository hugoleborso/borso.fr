export const STANDALONE_DISPLAY_MODE_SHIM = `(() => {
  const originalMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = (query) => {
    const answer = originalMatchMedia(query);
    if (!/display-mode:\\s*standalone/.test(query)) return answer;
    return { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; } };
  };
})();`;

export const READ_VIEWPORT_SIZE = `() => innerWidth + 'x' + innerHeight`;

export const PAGE_SETTLED_PROBE = `() => document.readyState === 'complete' && !document.querySelector('[aria-busy="true"]')`;

export const READ_LOCATION = `() => {
  const dialog = [...document.querySelectorAll('dialog[open]')].pop();
  const heading = dialog ? (dialog.getAttribute('aria-label') || (dialog.querySelector('h1,h2,h3') || {}).textContent || 'dialog') : null;
  return { path: location.pathname, overlay: heading ? heading.replace(/\\s+/g, ' ').trim().slice(0, 60) : null };
}`;

export const FIND_TARGET = `(spec) => {
  const normalise = (text) => (text || '').replace(/\\s+/g, ' ').trim();
  const nameOf = (element) => normalise(element.getAttribute('aria-label') || element.innerText || element.textContent || element.getAttribute('title') || element.getAttribute('placeholder') || element.value || '');
  const isShown = (element) => { const box = element.getBoundingClientRect(); const style = getComputedStyle(element); return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'; };
  const openDialog = [...document.querySelectorAll('dialog[open]')].pop();
  let root = document;
  if (spec.scope === 'dialog') root = openDialog || document;
  else if (spec.scope && spec.scope !== 'page') root = document.querySelector(spec.scope) || document;
  else if (openDialog && spec.scope !== 'page') root = openDialog;
  if (spec.within) {
    const withinPattern = new RegExp(spec.within.text, 'i');
    const container = [...root.querySelectorAll(spec.within.css)].filter(isShown).find((element) => withinPattern.test(normalise(element.innerText)));
    if (!container) return null;
    root = container;
  }
  const selector = spec.css || 'button, a, [role=button], [role=tab], [role=option], [role=menuitem], input, select, textarea, summary, label, li';
  const textPattern = spec.text ? new RegExp(spec.text, 'i') : null;
  let candidates = [...root.querySelectorAll(selector)].filter(isShown);
  if (textPattern) candidates = candidates.filter((element) => textPattern.test(nameOf(element)));
  if (spec.exact) candidates = candidates.filter((element) => nameOf(element).toLowerCase() === spec.exact.toLowerCase());
  const target = candidates[spec.index ?? 0];
  if (!target) return null;
  target.setAttribute('data-tm-target', String(Date.now()));
  let scroller = target.parentElement;
  while (scroller && scroller !== document.body) { const style = getComputedStyle(scroller); if (/(auto|scroll)/.test(style.overflowY) && scroller.scrollHeight > scroller.clientHeight + 1) break; scroller = scroller.parentElement; }
  if (scroller === document.body) scroller = null;
  const box = target.getBoundingClientRect();
  const visual = window.visualViewport;
  const visualTop = visual.offsetTop, visualBottom = visual.offsetTop + visual.height, visualLeft = visual.offsetLeft, visualRight = visual.offsetLeft + visual.width;
  let visible = { top: visualTop, bottom: visualBottom };
  if (scroller) { const scrollerBox = scroller.getBoundingClientRect(); visible = { top: Math.max(visualTop, scrollerBox.top), bottom: Math.min(visualBottom, scrollerBox.bottom) }; }
  const tabBar = [...document.querySelectorAll('nav')].find((navigation) => { const style = getComputedStyle(navigation); const navigationBox = navigation.getBoundingClientRect(); return style.position === 'fixed' && navigationBox.bottom >= innerHeight - 2 && navigationBox.height < innerHeight / 3; });
  const tabBarTop = tabBar && !target.closest('nav') && !openDialog ? tabBar.getBoundingClientRect().top : visualBottom;
  const centreX = box.left + box.width / 2, centreY = box.top + box.height / 2;
  const hit = centreY >= 0 && centreY <= innerHeight && centreX >= 0 && centreX <= innerWidth ? document.elementFromPoint(centreX, centreY) : null;
  const hittable = !!hit && (hit === target || target.contains(hit) || hit.contains(target) || (target.tagName === 'INPUT' && hit.tagName === 'LABEL'));
  return { name: nameOf(target).slice(0, 80), tag: target.tagName.toLowerCase(), type: target.type || null, rect: [box.left, box.top, box.width, box.height].map(Math.round), centreX, centreY,
    viewportHeight: innerHeight, viewportWidth: innerWidth, screenHeight: visual.height, screenTop: visualTop, screenLeft: visualLeft, screenWidth: visual.width,
    container: scroller ? { rect: (() => { const scrollerBox = scroller.getBoundingClientRect(); return [scrollerBox.left, scrollerBox.top, scrollerBox.width, scrollerBox.height].map(Math.round); })(), scrollTop: scroller.scrollTop } : null,
    visibleTop: visible.top, visibleBottom: Math.min(visible.bottom, tabBarTop), hittable,
    inView: centreY >= visible.top && centreY <= Math.min(visible.bottom, tabBarTop) && centreX >= visualLeft && centreX <= visualRight && hittable };
}`;

export const TAPPED_FIELD_FOCUS_PROBE = `() => {
  const marked = [...document.querySelectorAll('[data-tm-target]')];
  marked.sort((first, second) => Number(second.getAttribute('data-tm-target')) - Number(first.getAttribute('data-tm-target')));
  return marked[0] === document.activeElement;
}`;

export const DESCRIBE_FOCUS = `() => { const active = document.activeElement; return active ? (active.id || active.tagName) + '|' + active.hasAttribute('data-tm-target') + '|' + (active.getAttribute('data-tm-target') || '') : null; }`;

export const CHOOSE_NATIVE_OPTION = `(choice) => {
  const field = document.querySelector(choice.css);
  if (!field) return false;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value').set;
  let value = choice.value;
  if (field.tagName === 'SELECT' && value.startsWith('~')) {
    const option = [...field.options].find((candidate) => new RegExp(value.slice(1), 'i').test(candidate.textContent));
    if (!option) return false;
    value = option.value;
  }
  setter.call(field, value);
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  field.blur();
  return value;
}`;

export const COUNT_SCROLL_AREAS = `() => {
  const found = [];
  for (const element of document.querySelectorAll('*')) {
    if (element === document.scrollingElement || element === document.body) continue;
    const style = getComputedStyle(element);
    const scrollsVertically = /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 1;
    const scrollsHorizontally = /(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1;
    if (!scrollsVertically && !scrollsHorizontally) continue;
    const box = element.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;
    found.push({ axis: scrollsVertically && scrollsHorizontally ? 'xy' : scrollsVertically ? 'y' : 'x', tag: element.tagName.toLowerCase(), box: [box.x, box.y, box.width, box.height].map(Math.round), scrollHeight: element.scrollHeight, clientHeight: element.clientHeight, className: String(element.className).slice(0, 70) });
  }
  const root = document.scrollingElement;
  const isRootHidden = getComputedStyle(document.documentElement).overflowY === 'hidden' || getComputedStyle(document.body).overflowY === 'hidden';
  const documentScrolls = root.scrollHeight > visualViewport.height + 1 && !isRootHidden;
  const documentScrollsX = root.scrollWidth > visualViewport.width + 1;
  return { vertical: found.filter((area) => area.axis !== 'x').length + (documentScrolls ? 1 : 0), horizontal: found.filter((area) => area.axis !== 'y').length + (documentScrollsX ? 1 : 0),
    documentScrolls, documentScrollsX, pageHeightInScreens: Number((root.scrollHeight / visualViewport.height).toFixed(2)), layoutWidth: innerWidth, containers: found };
}`;

export const COUNT_BUTTONS = `() => {
  const isShown = (element) => { const box = element.getBoundingClientRect(); const style = getComputedStyle(element); return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && !element.closest('dialog:not([open])'); };
  const readVisibleText = (element) => { let text = ''; const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT); let node; while ((node = walker.nextNode())) { const trimmed = node.textContent.trim(); if (!trimmed) continue; const range = document.createRange(); range.selectNodeContents(node); const box = range.getBoundingClientRect(); const parentStyle = getComputedStyle(node.parentElement); if (box.width > 1 && box.height > 1 && parentStyle.visibility !== 'hidden' && parentStyle.opacity !== '0') text += ' ' + trimmed; } return text.trim(); };
  const hasVisibleIcon = (element) => [...element.querySelectorAll('svg, img, [role=img]')].some((icon) => { const box = icon.getBoundingClientRect(); return box.width > 0 && box.height > 0; });
  const isGlyph = (text) => text.length > 0 && text.length <= 2 && !/[\\p{L}\\p{N}]/u.test(text);
  const emptyGroup = () => ({ iconOnly: [], textOnly: [], iconAndText: [], neither: [], total: 0 });
  const rows = { button: emptyGroup(), link: emptyGroup(), choice: emptyGroup() };
  const isChoice = (element) => element.matches('[aria-pressed], [role=tab], [role=radio], [role=option], [role=switch], [role=checkbox]');
  for (const element of document.querySelectorAll('button, [role=button], summary, input[type=button], input[type=submit], a[href]')) {
    if (!isShown(element)) continue;
    if (element.matches('a[href]') && !element.matches('[role=button]') && element.closest('button')) continue;
    const kind = element.matches('a[href]') && !element.matches('[role=button]') ? 'link' : isChoice(element) ? 'choice' : 'button';
    const text = element.tagName === 'INPUT' ? element.value : readVisibleText(element);
    const hasIcon = hasVisibleIcon(element) || isGlyph(text);
    const realText = isGlyph(text) ? '' : text;
    const accessibleName = (element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') && document.getElementById(element.getAttribute('aria-labelledby'))?.textContent || text || element.title || '').replace(/\\s+/g, ' ').trim();
    const box = element.getBoundingClientRect();
    const entry = { name: accessibleName.slice(0, 60), hasName: accessibleName.length > 0, y: Math.round(box.y + scrollY), width: Math.round(box.width), height: Math.round(box.height) };
    rows[kind].total++;
    if (hasIcon && !realText) rows[kind].iconOnly.push(entry); else if (realText && !hasIcon) rows[kind].textOnly.push(entry); else if (hasIcon && realText) rows[kind].iconAndText.push(entry); else rows[kind].neither.push(entry);
  }
  return rows;
}`;

export const FETCH_JSON = `async (path) => { const response = await fetch(path, { credentials: 'include' }); return response.ok ? response.json() : { status: response.status }; }`;

export const PUT_JSON = `async ({ path, body }) => { const response = await fetch(path, { method: 'PUT', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return response.status; }`;

export const POST_JSON = `async ({ path, body }) => { const response = await fetch(path, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return response.status; }`;

export const CLEAR_STORAGE = `() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }`;

export const STANDALONE_PROBE = `() => matchMedia('(display-mode: standalone)').matches`;

export const READ_PAGE_HEADING = `() => document.querySelector('main h1')?.textContent?.trim() ?? null`;

export const READ_PATHNAME = `() => location.pathname`;

export const READ_SCROLL_Y = `() => Math.round(scrollY)`;

export const MAIN_PRESENT = `() => document.querySelector('main') !== null`;

export const MAIN_TEXT_INCLUDES = `(needle) => document.querySelector('main').innerText.includes(needle)`;

export const LISTS_A_DURATION = `() => /\\d:\\d\\d/.test(document.querySelector('main').innerText)`;

export const STUDY_ROW_LINK_PROBE = `() => { const studied = [...document.querySelectorAll('main button')].find((element) => element.innerText.trim() === 'Studied'); return !!studied?.closest('li, div')?.querySelector('a[href*="/catalog/"]'); }`;

export const LIST_VISIBLE_BUTTON_NAMES = `(limit) => [...document.querySelectorAll('main button, dialog[open] button')].map((button) => (button.getAttribute('aria-label') || button.innerText).trim()).filter(Boolean).slice(0, limit)`;

export const READ_NEXT_SESSION_TEXT = `() => (document.querySelector('section[aria-label="Next session"]')?.innerText || '').replace(/\\s+/g, ' ')`;

const READ_CSS_COLOUR = `(cssColour) => {
  const canvas = window.__taskMetricsCanvas || (window.__taskMetricsCanvas = document.createElement('canvas'));
  canvas.width = 1; canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = '#000000';
  context.fillStyle = cssColour;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return { red, green, blue, alpha: alpha / 255 };
}`;

const LIST_TEXT_ELEMENTS = `() => [...document.querySelectorAll('body *')].filter((element) => {
  if (element.closest('dialog:not([open]), details:not([open]) > :not(summary)')) return false;
  const hasOwnText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0);
  if (!hasOwnText) return false;
  const box = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
})`;

export const READ_FONT_SIZES = `() => {
  const listTextElements = ${LIST_TEXT_ELEMENTS};
  return [...new Set(listTextElements().map((element) => getComputedStyle(element).fontSize))];
}`;

export const READ_MEMBER_COLOURED_TEXT = `(memberColours) => {
  const readColour = ${READ_CSS_COLOUR};
  const listTextElements = ${LIST_TEXT_ELEMENTS};
  const key = (colour) => colour.red + ',' + colour.green + ',' + colour.blue;
  const members = new Set(memberColours.map((hex) => key(readColour(hex))));
  const found = listTextElements().filter((element) => members.has(key(readColour(getComputedStyle(element).color))));
  return { count: found.length, samples: found.slice(0, 5).map((element) => element.textContent.trim().slice(0, 40)) };
}`;

export const READ_LOW_CONTRAST_TEXT = `(threshold) => {
  const readColour = ${READ_CSS_COLOUR};
  const listTextElements = ${LIST_TEXT_ELEMENTS};
  const channel = (value) => { const normalised = value / 255; return normalised <= 0.03928 ? normalised / 12.92 : ((normalised + 0.055) / 1.055) ** 2.4; };
  const luminance = (colour) => 0.2126 * channel(colour.red) + 0.7152 * channel(colour.green) + 0.0722 * channel(colour.blue);
  const over = (top, bottom) => ({ red: top.red * top.alpha + bottom.red * (1 - top.alpha), green: top.green * top.alpha + bottom.green * (1 - top.alpha), blue: top.blue * top.alpha + bottom.blue * (1 - top.alpha), alpha: 1 });
  const backgroundOf = (element) => {
    const layers = [];
    for (let current = element; current; current = current.parentElement) {
      const layer = readColour(getComputedStyle(current).backgroundColor);
      if (layer.alpha > 0) layers.push(layer);
      if (layer.alpha >= 1) break;
    }
    let colour = readColour(getComputedStyle(document.documentElement).backgroundColor);
    if (colour.alpha < 1) colour = { red: 255, green: 255, blue: 255, alpha: 1 };
    for (const layer of layers.reverse()) colour = over(layer, colour);
    return colour;
  };
  const failing = [];
  for (const element of listTextElements()) {
    const background = backgroundOf(element);
    const text = over(readColour(getComputedStyle(element).color), background);
    const lighter = Math.max(luminance(text), luminance(background));
    const darker = Math.min(luminance(text), luminance(background));
    const ratio = (lighter + 0.05) / (darker + 0.05);
    if (ratio < threshold) failing.push({ text: element.textContent.trim().slice(0, 40), ratio: Number(ratio.toFixed(2)) });
  }
  return { count: failing.length, samples: failing.slice(0, 8) };
}`;

export const COUNT_SMALL_TAP_TARGETS = `(minimum) => {
  const isShown = (element) => { const box = element.getBoundingClientRect(); const style = getComputedStyle(element); return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && element.checkVisibility() && !element.closest('dialog:not([open])'); };
  const clipExtension = (element, box, rect) => {
    let { top, right, bottom, left } = rect;
    for (let node = element.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      const frame = node.getBoundingClientRect();
      const scrolls = (overflow) => overflow === 'auto' || overflow === 'scroll';
      if (style.overflowX !== 'visible') {
        const start = frame.left + node.clientLeft - (scrolls(style.overflowX) ? node.scrollLeft : 0);
        const end = start + (scrolls(style.overflowX) ? node.scrollWidth : node.clientWidth);
        if (box.left >= start) left = Math.max(left, start);
        if (box.right <= end) right = Math.min(right, end);
      }
      if (style.overflowY !== 'visible') {
        const start = frame.top + node.clientTop - (scrolls(style.overflowY) ? node.scrollTop : 0);
        const end = start + (scrolls(style.overflowY) ? node.scrollHeight : node.clientHeight);
        if (box.top >= start) top = Math.max(top, start);
        if (box.bottom <= end) bottom = Math.min(bottom, end);
      }
    }
    return { top, right, bottom, left };
  };
  const ownHitRect = (element) => {
    const box = element.getBoundingClientRect();
    const after = getComputedStyle(element, '::after');
    if (after.content === 'none' || after.position !== 'absolute') return { top: box.top, right: box.right, bottom: box.bottom, left: box.left };
    const inset = (value) => { const parsed = parseFloat(value); return Number.isNaN(parsed) ? 0 : Math.min(0, parsed); };
    return clipExtension(element, box, { top: box.top + inset(after.top), right: box.right - inset(after.right), bottom: box.bottom - inset(after.bottom), left: box.left + inset(after.left) });
  };
  const controls = [...document.querySelectorAll('button, [role=button], a[href], input:not([type=hidden]), select, textarea, summary')].filter((element) => isShown(element) && !element.closest('p'));
  const rects = new Map(controls.map((element) => [element, ownHitRect(element)]));
  const isRelated = (first, second) => first.contains(second) || second.contains(first);
  const pinnedLayerOf = (element) => { for (let node = element; node; node = node.parentElement) { const position = getComputedStyle(node).position; if (position === 'fixed' || position === 'sticky') return node; } return null; };
  const isPositioned = (element) => getComputedStyle(element).position !== 'static' || getComputedStyle(element, '::after').position === 'absolute';
  const followsInDocument = (candidate, element) => (element.compareDocumentPosition(candidate) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  const winsOver = (candidate, element) => pinnedLayerOf(candidate) === pinnedLayerOf(element) && (isPositioned(candidate) === isPositioned(element) ? followsInDocument(candidate, element) : isPositioned(candidate));
  const reachableHitBox = (element) => {
    const rect = rects.get(element);
    const centreX = (rect.left + rect.right) / 2;
    const centreY = (rect.top + rect.bottom) / 2;
    let { top, right, bottom, left } = rect;
    for (const other of controls) {
      if (other === element || isRelated(other, element) || !winsOver(other, element)) continue;
      const blocking = rects.get(other);
      const overlapsVertically = blocking.top < rect.bottom && blocking.bottom > rect.top;
      const overlapsHorizontally = blocking.left < rect.right && blocking.right > rect.left;
      if (blocking.left <= centreX && blocking.right >= centreX && overlapsVertically) {
        if (blocking.top > centreY) bottom = Math.min(bottom, blocking.top);
        if (blocking.bottom < centreY) top = Math.max(top, blocking.bottom);
      }
      if (blocking.top <= centreY && blocking.bottom >= centreY && overlapsHorizontally) {
        if (blocking.left > centreX) right = Math.min(right, blocking.left);
        if (blocking.right < centreX) left = Math.max(left, blocking.right);
      }
    }
    return { width: right - left, height: bottom - top };
  };
  const hitBox = (element) => {
    const labelBoxes = [...(element.labels ?? [])].filter(isShown).map((label) => label.getBoundingClientRect());
    return [reachableHitBox(element), ...labelBoxes].reduce((best, box) => (Math.min(box.width, box.height) > Math.min(best.width, best.height) ? { width: box.width, height: box.height } : best));
  };
  const small = [];
  for (const element of controls) {
    const box = hitBox(element);
    if (Math.round(box.width) < minimum || Math.round(box.height) < minimum) small.push((element.getAttribute('aria-label') || element.innerText || element.tagName).trim().slice(0, 30) + ' ' + Math.round(box.width) + 'x' + Math.round(box.height));
  }
  return { count: small.length, samples: small.slice(0, 8) };
}`;

export const READ_SETLIST_FIRST_SCREEN = `() => {
  const entryPattern = /^(?:\\S+ )?\\d\\d /;
  const rows = [...document.querySelectorAll('main li')].filter((row) => [...row.querySelectorAll('button')].some((button) => button.closest('li') === row && entryPattern.test(button.innerText.replace(/\\s+/g, ' '))));
  const tabBar = [...document.querySelectorAll('nav')].find((navigation) => { const style = getComputedStyle(navigation); const box = navigation.getBoundingClientRect(); return style.position === 'fixed' && box.bottom >= innerHeight - 2 && box.height < innerHeight / 3; });
  const visibleBottom = tabBar ? tabBar.getBoundingClientRect().top : innerHeight;
  const chart = [...document.querySelectorAll('main *')].find((element) => getComputedStyle(element).position === 'sticky' && element.querySelector('svg'));
  const chartBottom = chart ? chart.getBoundingClientRect().bottom : null;
  const stickyElements = [...document.querySelectorAll('main *')].filter((element) => getComputedStyle(element).position === 'sticky').length;
  const boxes = rows.map((row) => row.getBoundingClientRect());
  return {
    rowCount: rows.length,
    firstRowTop: boxes[0] ? Math.round(boxes[0].top) : null,
    rowsFullyVisible: boxes.filter((box) => box.top >= 0 && box.bottom <= visibleBottom).length,
    chartBottom: chartBottom === null ? null : Math.round(chartBottom),
    stickyElements,
    rowsBelowChart: chartBottom === null ? null : boxes.filter((box) => box.top >= chartBottom && box.bottom <= visibleBottom).length,
  };
}`;

export const READ_OPEN_SHEET = `() => {
  const dialog = [...document.querySelectorAll('dialog[open]')].pop();
  if (!dialog) return null;
  const fields = dialog.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select');
  const active = document.activeElement;
  const activeName = active ? (active.getAttribute('aria-label') || active.innerText || active.value || '').replace(/\\s+/g, ' ').trim() : '';
  const isOnCancelOrClose = !!active && dialog.contains(active) && active.tagName === 'BUTTON' && /^(cancel|close|annuler|fermer)$/i.test(activeName);
  const innerScrolls = [...dialog.querySelectorAll('*')].filter((element) => !element.hasAttribute('data-sheet-body') && /(auto|scroll)/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + 1).length;
  const box = dialog.getBoundingClientRect();
  return {
    title: (dialog.getAttribute('aria-label') || (dialog.querySelector('h1,h2,h3') || {}).textContent || 'dialog').replace(/\\s+/g, ' ').trim().slice(0, 60),
    holdsField: fields.length > 0,
    focusedTag: active ? active.tagName.toLowerCase() : null,
    focusedName: activeName.slice(0, 40),
    isFocusOnCancelOrClose: isOnCancelOrClose,
    innerVerticalScrollAreas: innerScrolls,
    box: [box.left, box.top, box.width, box.height].map(Math.round),
  };
}`;

export const FIND_BACKDROP_POINT = `() => {
  const dialog = [...document.querySelectorAll('dialog[open]')].pop();
  if (!dialog) return null;
  const box = dialog.getBoundingClientRect();
  if (box.top > 24) return { x: 0.5, y: box.top / 2 / innerHeight };
  if (innerHeight - box.bottom > 24) return { x: 0.5, y: (box.bottom + (innerHeight - box.bottom) / 2) / innerHeight };
  if (box.left > 8) return { x: box.left / 2 / innerWidth, y: 0.5 };
  return null;
}`;

export const READ_OPEN_TEXTAREA_VALUE = `() => { const dialog = [...document.querySelectorAll('dialog[open]')].pop(); const field = dialog && dialog.querySelector('textarea'); return field ? field.value : null; }`;

export const READ_PRIMARY_STRIP_POSITION = `(names) => {
  const isShown = (element) => { const box = element.getBoundingClientRect(); const style = getComputedStyle(element); return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) > 0; };
  const target = [...document.querySelectorAll('button, a[href]')].find((element) => names.includes((element.getAttribute('aria-label') || element.innerText).replace(/\\s+/g, ' ').trim()));
  if (!target) return null;
  const box = target.getBoundingClientRect();
  return { top: Math.round(box.top), isOnScreen: isShown(target) && box.top >= 0 && box.bottom <= innerHeight };
}`;

export const SCROLL_TO_PAGE_END = `() => { window.scrollTo(0, document.scrollingElement.scrollHeight); return Math.round(scrollY); }`;

export const READ_COVERED_TEXT = `() => {
  const listTextElements = ${LIST_TEXT_ELEMENTS};
  const controlSelector = 'button, [role=button], a[href], input, select, textarea, summary';
  const isInFixedLayer = (element) => { for (let current = element; current; current = current.parentElement) { const position = getComputedStyle(current).position; if (position === 'fixed' || position === 'sticky') return true; } return false; };
  const clipOf = (element) => {
    let clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    for (let current = element; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
      const box = current.getBoundingClientRect();
      clip = { left: Math.max(clip.left, box.left), top: Math.max(clip.top, box.top), right: Math.min(clip.right, box.right), bottom: Math.min(clip.bottom, box.bottom) };
    }
    return clip;
  };
  const inset = 2;
  const found = [];
  for (const element of listTextElements()) {
    if (isInFixedLayer(element)) continue;
    const clip = clipOf(element);
    const lines = [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()).flatMap((node) => { const range = document.createRange(); range.selectNodeContents(node); return [...range.getClientRects()]; });
    const covering = new Set();
    for (const line of lines) {
      const left = Math.max(line.left, clip.left) + inset, right = Math.min(line.right, clip.right) - inset;
      const top = Math.max(line.top, clip.top), bottom = Math.min(line.bottom, clip.bottom);
      const middle = (top + bottom) / 2;
      if (right <= left || bottom <= top) continue;
      for (const x of [left, (left + right) / 2, right]) {
        const hit = document.elementFromPoint(x, middle);
        if (!hit || hit === element || hit.contains(element) || element.contains(hit) || isInFixedLayer(hit)) continue;
        const cover = hit.closest(controlSelector) ?? hit;
        if (cover.contains(element)) continue;
        const box = hit.getBoundingClientRect();
        const isInsideOwnBox = x >= box.left && x <= box.right && middle >= box.top && middle <= box.bottom;
        if (isInsideOwnBox) covering.add(cover);
      }
    }
    for (const control of covering) found.push(element.textContent.trim().slice(0, 30) + ' under ' + (control.getAttribute('aria-label') || control.innerText || control.tagName).trim().replace(/\\s+/g, ' ').slice(0, 30));
  }
  return { count: found.length, samples: found.slice(0, 8) };
}`;

export const READ_SHELL_TABS = `(label) => {
  const nav = document.querySelector('nav[aria-label="' + label + '"]');
  if (!nav) return null;
  const controls = [...nav.querySelectorAll('a, button')];
  return {
    labels: controls.map((control) => (control.innerText || control.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim()),
    active: controls.filter((control) => control.getAttribute('aria-current') === 'page').map((control) => control.innerText.replace(/\\s+/g, ' ').trim()),
  };
}`;

export const READ_PRIMARY_ACTIONS = `() => {
  const isShown = (element) => { const box = element.getBoundingClientRect(); const style = getComputedStyle(element); return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'; };
  return [...document.querySelectorAll('[data-variant="primary"]')]
    .filter((element) => !element.closest('nav') && !element.closest('dialog:not([open])') && isShown(element))
    .map((element) => { const box = element.getBoundingClientRect(); return { name: (element.getAttribute('aria-label') || element.innerText).replace(/\\s+/g, ' ').trim().slice(0, 40), centreFraction: Number(((box.top + box.height / 2) / innerHeight).toFixed(3)) }; });
}`;

export const READ_FIRST_CONTENT_TOP = `() => {
  const main = document.querySelector('main');
  if (!main) return null;
  const tops = [...main.querySelectorAll('*')]
    .filter((element) => { const box = element.getBoundingClientRect(); const style = getComputedStyle(element); const isLeafContent = element.tagName === 'svg' || [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim()); return isLeafContent && box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.position !== 'fixed'; })
    .map((element) => element.getBoundingClientRect().top + scrollY);
  return tops.length === 0 ? null : Math.round(Math.min(...tops));
}`;

export const READ_THEME_COLOUR = `() => {
  const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
  const matching = metas.find((meta) => !meta.media || matchMedia(meta.media).matches);
  return { values: metas.map((meta) => ({ media: meta.media || null, content: meta.content })), shown: matching ? matching.content : null };
}`;

export const READ_LANGUAGE_CHIPS = `() => {
  const isChip = (element) => /^(FR|EN)$/.test(element.innerText.trim());
  const isShown = (element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; };
  const chips = [...document.querySelectorAll('button')].filter(isChip);
  const inMain = chips.filter((chip) => chip.closest('main'));
  return { outsideMain: chips.length - inMain.length, inMainShown: inMain.filter(isShown).length };
}`;

export const READ_OPEN_FIELD_VALUE = `(selector) => { const dialog = [...document.querySelectorAll('dialog[open]')].pop(); const field = dialog && dialog.querySelector(selector); return field ? field.value : null; }`;

export const SEND_JSON = `async ({ method, path, body }) => { const response = await fetch(path, { method, credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return response.status; }`;

export const READ_LINEUP_GRID = `() => {
  const tabBar = [...document.querySelectorAll('nav')].find((navigation) => { const style = getComputedStyle(navigation); const box = navigation.getBoundingClientRect(); return style.position === 'fixed' && box.bottom >= innerHeight - 2 && box.height < innerHeight / 3; });
  const visibleBottom = tabBar ? tabBar.getBoundingClientRect().top : innerHeight;
  const rows = [...document.querySelectorAll('[data-lineup-row]')];
  const cells = [...document.querySelectorAll('[data-lineup-cell]')].map((cell) => ({
    entryId: cell.closest('[data-lineup-row]')?.getAttribute('data-lineup-row') ?? '',
    memberId: cell.getAttribute('data-lineup-cell') ?? '',
    isPlaying: cell.getAttribute('data-lineup-playing') === 'true',
    isChanged: cell.getAttribute('data-lineup-changed') === 'true',
    fill: cell.firstElementChild ? getComputedStyle(cell.firstElementChild).backgroundColor : '',
    height: Math.round(cell.getBoundingClientRect().height),
  }));
  const lanes = [...document.querySelectorAll('[data-lineup-lane]')].map((lane) => ({ memberId: lane.getAttribute('data-lineup-lane') ?? '', style: (lane.getAttribute('style') ?? '').toLowerCase() }));
  return {
    rowCount: rows.length,
    rowsFullyVisible: rows.filter((row) => { const box = row.getBoundingClientRect(); return box.top >= 0 && box.bottom <= visibleBottom; }).length,
    cells,
    lanes,
    pageWidth: document.documentElement.scrollWidth,
    viewportWidth: innerWidth,
  };
}`;

export const READ_OPEN_DIALOG_LABELS = `() => [...document.querySelectorAll('dialog[open]')].map((dialog) => (dialog.getAttribute('aria-label') || '').slice(0, 60))`;

export const READ_BACK_LINK = `() => { const link = document.querySelector('main a[href]'); return link ? { name: link.innerText.replace(/\\s+/g, ' ').trim(), href: link.getAttribute('href') } : null; }`;

export const READ_ORDER_SCREEN = `() => {
  const strip = [...document.querySelectorAll('button, a[href]')].find((element) => element.innerText.replace(/\\s+/g, ' ').trim() === 'Done');
  const stripTop = strip ? strip.getBoundingClientRect().top : innerHeight;
  const rows = [...document.querySelectorAll('[data-order-row]')];
  const handle = rows[0] ? rows[0].querySelector('button') : null;
  const handleBox = handle ? handle.getBoundingClientRect() : null;
  const curve = document.querySelector('[data-energy-curve]');
  return {
    rowCount: rows.length,
    rowsVisibleWithCurve: rows.filter((row) => { const box = row.getBoundingClientRect(); return box.top >= 0 && box.bottom <= stripTop; }).length,
    isCurveShown: curve !== null,
    curveBars: curve ? curve.children.length : 0,
    handle: handleBox ? { width: Math.round(handleBox.width), height: Math.round(handleBox.height) } : null,
  };
}`;

export const READ_ADD_SONGS_SHEET = `(setlistTitles) => {
  const dialog = document.querySelector('dialog[open]');
  if (!dialog) return null;
  const confirm = [...dialog.querySelectorAll('footer button')].find((element) => /^Add /.test(element.innerText.trim()));
  const box = confirm ? confirm.getBoundingClientRect() : null;
  const rows = [...dialog.querySelectorAll('[role=checkbox]')];
  const titleOf = (row) => { const line = row.querySelector('.font-display'); return line ? line.innerText.trim() : ''; };
  const isInSetlist = (row) => setlistTitles.includes(titleOf(row));
  return {
    confirmCentreFraction: box ? Math.round(((box.top + box.height / 2) / innerHeight) * 1000) / 1000 : null,
    rows: rows.length,
    rowsInSetlist: rows.filter(isInSetlist).length,
    rowsInSetlistPickable: rows.filter((row) => isInSetlist(row) && !row.disabled).length,
  };
}`;
