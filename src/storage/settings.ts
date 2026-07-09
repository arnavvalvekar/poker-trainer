export interface AppSettings {
  theme: 'dark' | 'light';
  smallBlind: number;
  bigBlind: number;
  startingStackBB: number;
}

const SETTINGS_KEY = 'poker-trainer-settings';

const DEFAULTS: AppSettings = {
  theme: 'dark',
  smallBlind: 1,
  bigBlind: 2,
  startingStackBB: 100,
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const current = loadSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  applyTheme(updated.theme);
  return updated;
}

export function applyTheme(theme: 'dark' | 'light'): void {
  document.documentElement.classList.toggle('light', theme === 'light');
}

export function initSettings(): AppSettings {
  const settings = loadSettings();
  applyTheme(settings.theme);
  return settings;
}
