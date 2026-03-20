/**
 * src/app/components/layout/SettingsPopover.tsx — Theme and font settings.
 *
 * Light/Dark/Dim theme switching + font family selection.
 * Persisted to localStorage, restored on load without flash.
 */

import React, { useState, useEffect, useRef } from 'react';

type Theme = 'light' | 'dark' | 'dim';
type TextSize = 'small' | 'normal' | 'large' | 'xlarge';

interface FontOption {
  label: string;
  value: string;
}

const THEMES: { id: Theme; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'dim', label: 'Dim' },
];

const FONTS: FontOption[] = [
  { label: 'Space Grotesk', value: "'Space Grotesk'" },
  { label: 'Inter', value: "'Inter'" },
  { label: 'Outfit', value: "'Outfit'" },
  { label: 'IBM Plex Sans', value: "'IBM Plex Sans'" },
  { label: 'Geist', value: "'Geist'" },
];

const TEXT_SIZES: { id: TextSize; label: string; value: string }[] = [
  { id: 'small', label: 'Small', value: '14px' },
  { id: 'normal', label: 'Normal', value: '16px' },
  { id: 'large', label: 'Large', value: '18px' },
  { id: 'xlarge', label: 'XL', value: '20px' },
];

const STORAGE_THEME_KEY = 'css-theme';
const STORAGE_FONT_KEY = 'css-font-family';
const STORAGE_TEXT_SIZE_KEY = 'css-text-size';

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_THEME_KEY);
  if (stored === 'dark' || stored === 'dim' || stored === 'light') return stored;
  return 'light';
}

function getStoredFont(): string {
  return localStorage.getItem(STORAGE_FONT_KEY) ?? "'Space Grotesk'";
}

function getStoredTextSize(): TextSize {
  const stored = localStorage.getItem(STORAGE_TEXT_SIZE_KEY);
  if (stored === 'small' || stored === 'normal' || stored === 'large' || stored === 'xlarge') return stored;
  return 'normal';
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  html.classList.remove('dark', 'dim');
  if (theme === 'dark') html.classList.add('dark');
  if (theme === 'dim') html.classList.add('dim');
  localStorage.setItem(STORAGE_THEME_KEY, theme);
}

function applyFont(fontValue: string) {
  document.documentElement.style.setProperty(
    '--font-sans',
    `${fontValue}, ui-sans-serif, system-ui, sans-serif`
  );
  localStorage.setItem(STORAGE_FONT_KEY, fontValue);
}

function applyTextSize(size: TextSize) {
  const px = TEXT_SIZES.find((s) => s.id === size)?.value ?? '16px';
  document.documentElement.style.fontSize = px;
  localStorage.setItem(STORAGE_TEXT_SIZE_KEY, size);
}

export function SettingsPopover() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [font, setFont] = useState(getStoredFont);
  const [textSize, setTextSize] = useState<TextSize>(getStoredTextSize);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyFont(font);
  }, [font]);

  useEffect(() => {
    applyTextSize(textSize);
  }, [textSize]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-slate-400 hover:text-white transition-colors"
        aria-label="Settings"
      >
        {'\u2699'}
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-56 bg-surface-raised border border-border rounded-lg shadow-lg p-3 z-50">
          {/* Theme selector */}
          <p className="text-xs font-medium text-th-text-secondary mb-2">Theme</p>
          <div className="flex gap-1 mb-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  theme === t.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-surface-inset text-th-text-secondary hover:bg-th-hover'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Text size selector */}
          <p className="text-xs font-medium text-th-text-secondary mb-2">Text Size</p>
          <div className="flex gap-1 mb-3">
            {TEXT_SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setTextSize(s.id)}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  textSize === s.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-surface-inset text-th-text-secondary hover:bg-th-hover'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Font family selector */}
          <p className="text-xs font-medium text-th-text-secondary mb-2">Font Family</p>
          <div className="space-y-1">
            {FONTS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFont(f.value)}
                className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                  font === f.value
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-th-text-secondary hover:bg-th-hover'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-th-text-muted mt-2 italic">
            JetBrains Mono stays as monospace for code
          </p>
        </div>
      )}
    </div>
  );
}
