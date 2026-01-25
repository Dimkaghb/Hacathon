"use client";

import React, { useState, useEffect } from 'react';
import { IconPalette, IconCheck, IconX } from '@tabler/icons-react';

type ThemePreset = 'midnight' | 'ocean' | 'forest' | 'sunset' | 'violet' | 'rose' | 'custom';

interface ThemeOption {
  id: ThemePreset;
  name: string;
  color: string;
  hue?: number;
}

const THEME_PRESETS: ThemeOption[] = [
  { id: 'midnight', name: 'Midnight', color: '#3b82f6', hue: 220 },
  { id: 'ocean', name: 'Ocean', color: '#06b6d4', hue: 188 },
  { id: 'forest', name: 'Forest', color: '#22c55e', hue: 142 },
  { id: 'sunset', name: 'Sunset', color: '#f97316', hue: 25 },
  { id: 'violet', name: 'Violet', color: '#8b5cf6', hue: 263 },
  { id: 'rose', name: 'Rose', color: '#ec4899', hue: 330 },
];

const STORAGE_KEY = 'flowgen-theme';
const CUSTOM_HUE_KEY = 'flowgen-custom-hue';

export function ThemePicker() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemePreset>('midnight');
  const [customHue, setCustomHue] = useState(220);

  // Load saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY) as ThemePreset | null;
    const savedHue = localStorage.getItem(CUSTOM_HUE_KEY);
    
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      applyTheme(savedTheme);
    }
    
    if (savedHue) {
      const hue = parseInt(savedHue, 10);
      setCustomHue(hue);
      if (savedTheme === 'custom') {
        applyCustomHue(hue);
      }
    }
  }, []);

  const applyTheme = (theme: ThemePreset) => {
    document.documentElement.setAttribute('data-theme', theme);
  };

  const applyCustomHue = (hue: number) => {
    document.documentElement.style.setProperty('--custom-hue', hue.toString());
  };

  const selectTheme = (theme: ThemePreset) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    
    if (theme !== 'custom') {
      setIsOpen(false);
    }
  };

  const handleCustomHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hue = parseInt(e.target.value, 10);
    setCustomHue(hue);
    applyCustomHue(hue);
    localStorage.setItem(CUSTOM_HUE_KEY, hue.toString());
    
    if (currentTheme !== 'custom') {
      selectTheme('custom');
    }
  };

  const getPreviewColor = (hue: number) => {
    return `hsl(${hue}, 90%, 56%)`;
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-[var(--color-bg-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        title="Change theme"
      >
        <IconPalette size={18} />
        <span className="text-sm font-medium hidden sm:inline">Theme</span>
        <div 
          className="w-3 h-3 rounded-full border border-[var(--color-border-default)]"
          style={{ 
            backgroundColor: currentTheme === 'custom' 
              ? getPreviewColor(customHue) 
              : THEME_PRESETS.find(t => t.id === currentTheme)?.color 
          }}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-default)]">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Color Theme
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]"
              >
                <IconX size={16} />
              </button>
            </div>

            {/* Theme Presets */}
            <div className="p-3">
              <p className="text-xs text-[var(--color-text-muted)] mb-2 px-1">Presets</p>
              <div className="grid grid-cols-3 gap-2">
                {THEME_PRESETS.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => selectTheme(theme.id)}
                    className={`relative flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all duration-200 ${
                      currentTheme === theme.id
                        ? 'bg-[var(--color-accent-primary-muted)] ring-1 ring-[var(--color-accent-primary)]'
                        : 'hover:bg-[var(--color-bg-hover)]'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full shadow-inner"
                      style={{ backgroundColor: theme.color }}
                    />
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {theme.name}
                    </span>
                    {currentTheme === theme.id && (
                      <div className="absolute top-1 right-1">
                        <IconCheck size={12} className="text-[var(--color-accent-primary)]" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Picker */}
            <div className="p-3 border-t border-[var(--color-border-default)]">
              <p className="text-xs text-[var(--color-text-muted)] mb-2 px-1">Custom Color</p>
              <div className="flex items-center gap-3 px-1">
                <div 
                  className={`w-10 h-10 rounded-lg shadow-inner flex-shrink-0 ${
                    currentTheme === 'custom' ? 'ring-2 ring-[var(--color-text-primary)]' : ''
                  }`}
                  style={{ backgroundColor: getPreviewColor(customHue) }}
                />
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={customHue}
                    onChange={handleCustomHueChange}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, 
                        hsl(0, 90%, 56%), 
                        hsl(60, 90%, 56%), 
                        hsl(120, 90%, 56%), 
                        hsl(180, 90%, 56%), 
                        hsl(240, 90%, 56%), 
                        hsl(300, 90%, 56%), 
                        hsl(360, 90%, 56%)
                      )`,
                    }}
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-[var(--color-text-muted)]">Hue: {customHue}°</span>
                    {currentTheme === 'custom' && (
                      <span className="text-xs text-[var(--color-accent-primary)]">Active</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-[var(--color-bg-primary)] border-t border-[var(--color-border-default)]">
              <p className="text-xs text-[var(--color-text-muted)] text-center">
                Theme is saved automatically
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ThemePicker;
