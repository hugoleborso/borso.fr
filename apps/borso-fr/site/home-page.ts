import {
  canAnimateIn,
  selectBurgerLabelKey,
  selectMenuItemTransitionDelay,
  isMenuOpenAfterKey,
} from './home-menu.core';
import { i18next } from './i18n/i18n';

const BODY_MENU_OPEN_CLASS = 'menu-open';
const OPEN_CLASS = 'is-open';
const ANIMATE_IN_CLASS = 'animate-in';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function getElementById(elementId: string): HTMLElement {
  const element = document.getElementById(elementId);
  if (element === null) throw new Error(`#${elementId} not found`);
  return element;
}

function getDialogById(elementId: string): HTMLDialogElement {
  const element = document.querySelector<HTMLDialogElement>(`#${elementId}`);
  if (element === null) throw new Error(`#${elementId} not found`);
  return element;
}

const burger = getElementById('burger');
const menu = getElementById('menu');
const dateRequestTrigger = getElementById('date-request-trigger');
const dateRequestDialog = getDialogById('date-request-dialog');
const dateRequestClose = getElementById('date-request-close');

const menuItems = [...menu.querySelectorAll('li')];

function isMenuOpen(): boolean {
  return document.body.classList.contains(BODY_MENU_OPEN_CLASS);
}

function applyMenuState(isOpen: boolean): void {
  document.body.classList.toggle(BODY_MENU_OPEN_CLASS, isOpen);
  burger.classList.toggle(OPEN_CLASS, isOpen);
  menu.classList.toggle(OPEN_CLASS, isOpen);
  burger.setAttribute('aria-expanded', String(isOpen));
  burger.setAttribute('aria-label', i18next.t(selectBurgerLabelKey(isOpen)));
  menu.setAttribute('aria-hidden', String(!isOpen));

  for (const [itemIndex, menuItem] of menuItems.entries()) {
    menuItem.style.transitionDelay = selectMenuItemTransitionDelay(isOpen, itemIndex);
  }
}

burger.addEventListener('click', () => {
  applyMenuState(!isMenuOpen());
});

document.addEventListener('keydown', (event) => {
  applyMenuState(isMenuOpenAfterKey(event.key, isMenuOpen(), dateRequestDialog.open));
});

dateRequestTrigger.addEventListener('click', () => {
  dateRequestDialog.showModal();
});

dateRequestClose.addEventListener('click', () => {
  dateRequestDialog.close();
});

/** A click on the backdrop reaches the dialog element itself, and closes it. */
const CLOSE_ON_BACKDROP_CLICK: Readonly<Record<`${boolean}`, () => void>> = {
  true: () => {
    dateRequestDialog.close();
  },
  false: () => undefined,
};

dateRequestDialog.addEventListener('click', (event) => {
  CLOSE_ON_BACKDROP_CLICK[`${event.target === dateRequestDialog}`]();
});

const isReducedMotionPreferred = window.matchMedia(REDUCED_MOTION_QUERY).matches;

window.addEventListener('pageshow', () => {
  document.body.classList.toggle(
    ANIMATE_IN_CLASS,
    canAnimateIn(document.visibilityState, isReducedMotionPreferred),
  );
});
