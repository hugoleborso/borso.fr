const STAGGER_BASE_MS = 80;
const STAGGER_STEP_MS = 60;
const MENU_OPEN_CLASS = 'menu-open';
const BURGER_OPEN_CLASS = 'is-open';
const ANIMATE_IN_CLASS = 'animate-in';
const LABEL_OPEN_MENU = 'Ouvrir le menu';
const LABEL_CLOSE_MENU = 'Fermer le menu';

const burger = document.getElementById('burger');
const menu = document.getElementById('menu');
const menuItems = menu.querySelectorAll('li');

let menuOpen = false;

function applyMenuState() {
  document.body.classList.toggle(MENU_OPEN_CLASS, menuOpen);
  burger.classList.toggle(BURGER_OPEN_CLASS, menuOpen);
  menu.classList.toggle('is-open', menuOpen);
  burger.setAttribute('aria-expanded', String(menuOpen));
  burger.setAttribute('aria-label', menuOpen ? LABEL_CLOSE_MENU : LABEL_OPEN_MENU);
  menu.setAttribute('aria-hidden', String(!menuOpen));

  menuItems.forEach((item, index) => {
    item.style.transitionDelay = menuOpen
      ? `${STAGGER_BASE_MS + index * STAGGER_STEP_MS}ms`
      : '0ms';
  });
}

burger.addEventListener('click', () => {
  menuOpen = !menuOpen;
  applyMenuState();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuOpen) {
    menuOpen = false;
    applyMenuState();
  }
});

// Opt in to the fade-in animation only when the tab is actually visible
// at load. Hidden tabs keep the title at full opacity (no animation tick
// = no chance of being stuck at opacity:0).
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

window.addEventListener('pageshow', () => {
  if (document.visibilityState !== 'hidden' && !prefersReducedMotion) {
    document.body.classList.add(ANIMATE_IN_CLASS);
  }
});
