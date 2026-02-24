/**
 * src/app/components/layout/SettingsPopover.tsx — Theme and font settings.
 *
 * Light/Dark/Dim theme switching + font family selection.
 * Persisted to localStorage, restored on load without flash.
 */

import React, { useState, useEffect, useRef } from 'react';

type Theme = 'light' | 'dark' | 'dim';

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

const STORAGE_THEME_KEY = 'css-theme';
const STORAGE_FONT_KEY = 'css-font-family';

function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_THEME_KEY);
  if (stored === 'dark' || stored === 'dim' || stored === 'light') return stored;
  return 'light';
}

function getStoredFont(): string {
  return localStorage.getItem(STORAGE_FONT_KEY) ?? "'Space Grotesk'";
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

export function SettingsPopover() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [font, setFont] = useState(getStoredFont);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyFont(font);
  }, [font]);

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
        <div className="absolute right-0 top-8 w-56 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-50">
          {/* Theme selector */}
          <p className="text-xs font-medium text-slate-500 mb-2">Theme</p>
          <div className="flex gap-1 mb-3">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  theme === t.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Font family selector */}
          <p className="text-xs font-medium text-slate-500 mb-2">Font Family</p>
          <div className="space-y-1">
            {FONTS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFont(f.value)}
                className={`w-full text-left px-2 py-1 text-xs rounded transition-colors ${
                  font === f.value
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-slate-400 mt-2 italic">
            JetBrains Mono stays as monospace for code
          </p>
        </div>
      )}
    </div>
  );
}
