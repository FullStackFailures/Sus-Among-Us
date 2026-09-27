import { ThemeName, ThemeTokens } from './types';

export const THEME_STORAGE_KEY = 'sus_watch_theme_v1';

export const THEMES: Record<ThemeName, ThemeTokens> = {
  light: {
    background: '#F2F7FF',
    surface: '#FFFFFF',
    surfaceAlt: '#EDF5FF',

    text: '#111827',
    muted: '#64748B',
    border: 'rgba(17,24,39,0.12)',

    // Brighter Among Us Red
    primary: '#E11D2E',
    primaryText: '#FFFFFF',

    success: '#00C853',
    danger: '#C1121F',

    chip: '#EDF5FF',
    chipActive: '#E11D2E',

    shadow: '#111827',
  },

  dark: {
    background: '#060A14',
    surface: '#121C2F',
    surfaceAlt: '#1B2942',

    text: '#F8FAFC',
    muted: '#9DB5DA',
    border: 'rgba(255,255,255,0.08)',

    // Brighter Among Us Red
    primary: '#E11D2E',
    primaryText: '#FFFFFF',

    success: '#00E676',
    danger: '#C1121F',

    chip: '#121C2F',
    chipActive: '#E11D2E',

    shadow: '#000000',
  },
};