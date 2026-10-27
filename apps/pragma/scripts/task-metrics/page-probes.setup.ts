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
  const rows = { button: { iconOnly: [], textOnly: [], iconAndText: [], neither: [], total: 0 }, link: { iconOnly: [], textOnly: [], iconAndText: [], neither: [], total: 0 } };
  for (const element of document.querySelectorAll('button, [role=button], summary, input[type=button], input[type=submit], a[href]')) {
    if (!isShown(element)) continue;
    if (element.matches('a[href]') && !element.matches('[role=button]') && element.closest('button')) continue;
    const kind = element.matches('a[href]') && !element.matches('[role=button]') ? 'link' : 'button';
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

export const CLEAR_STORAGE = `() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} }`;

export const STANDALONE_PROBE = `() => matchMedia('(display-mode: standalone)').matches`;

export const READ_PATHNAME = `() => location.pathname`;

export const READ_SCROLL_Y = `() => Math.round(scrollY)`;

export const MAIN_TEXT_INCLUDES = `(needle) => document.querySelector('main').innerText.includes(needle)`;

export const LISTS_A_DURATION = `() => /\\d:\\d\\d/.test(document.querySelector('main').innerText)`;

export const STUDY_ROW_LINK_PROBE = `() => { const studied = [...document.querySelectorAll('main button')].find((element) => element.innerText.trim() === 'Studied'); return !!studied?.closest('li, div')?.querySelector('a[href*="/catalog/"]'); }`;

export const LIST_VISIBLE_BUTTON_NAMES = `(limit) => [...document.querySelectorAll('main button, dialog[open] button')].map((button) => (button.getAttribute('aria-label') || button.innerText).trim()).filter(Boolean).slice(0, limit)`;

export const READ_SESSION_HEADER_LINK = `(topInset) => { const link = [...document.querySelectorAll('a')].find((element) => /\\/sessions\\//.test(element.getAttribute('href') || '')); const box = link?.getBoundingClientRect(); return link ? { text: link.innerText.replace(/\\s+/g, ' '), y: Math.round(box.y), aboveSafeArea: box.y < topInset } : null; }`;

export const COUNT_ENTRY_BUTTONS = `(bottomAllowance) => [...document.querySelectorAll('main button')].filter((button) => /^\\S+ \\d\\d /.test(button.innerText.replace(/\\s+/g, ' ')) && (bottomAllowance === null || button.getBoundingClientRect().bottom < innerHeight - bottomAllowance)).length`;
