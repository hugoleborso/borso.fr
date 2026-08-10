import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';
import { i18next } from '../i18n/i18n';
import { App } from './App';

describe('the twelve labours page', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('fr');
  });

  it('reads in French, which is the language of the site', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Les douzetravaux.');
    expect(screen.getByText('Le projet')).toBeDefined();
    expect(screen.getByText("L'année en douze chapitres")).toBeDefined();
    expect(screen.getByText('borso.fr · les 12 travaux')).toBeDefined();
  });

  it('offers one button per edition', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: '2025' })).toBeDefined();
    expect(screen.getByRole('button', { name: '2026' })).toBeDefined();
  });

  it('brings the month a reader picks into focus', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: '2025' }));
    await userEvent.click(screen.getByRole('button', { name: /Mars/ }));
    const featured = screen.getByRole('article');
    expect(within(featured).getByRole('heading', { level: 2, name: 'Mars.' })).toBeDefined();
    expect(within(featured).getByText("Passer la Flèche d'Or")).toBeDefined();
  });
});
