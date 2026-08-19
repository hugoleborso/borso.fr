import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { i18next } from '@/i18n/i18n';
import { LANGUAGE_STORAGE_KEY } from '@/i18n/locale-storage.utils';
import { LanguageSwitcher } from './LanguageSwitcher';

beforeEach(async () => {
  window.localStorage.clear();
  await i18next.changeLanguage('en');
});

afterEach(async () => {
  await i18next.changeLanguage('en');
});

// @FollowsBlueprint test-component-render
describe('LanguageSwitcher', () => {
  it('shows both languages the application ships', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText('EN')).toBeTruthy();
    expect(screen.getByText('FR')).toBeTruthy();
  });

  it('switches the interface to French and remembers the choice', async () => {
    render(<LanguageSwitcher />);
    await act(async () => {
      await userEvent.click(screen.getByRole('button'));
    });
    expect(i18next.language).toBe('fr');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr');
  });

  it('switches back to English', async () => {
    render(<LanguageSwitcher />);
    await act(async () => {
      await userEvent.click(screen.getByRole('button'));
    });
    await act(async () => {
      await userEvent.click(screen.getByRole('button'));
    });
    expect(i18next.language).toBe('en');
    expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  });
});
