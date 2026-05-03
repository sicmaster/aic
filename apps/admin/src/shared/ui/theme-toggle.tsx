'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/shared/providers/theme-provider';
import { Button } from './button';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <Button type="button" variant="ghost" size="icon" onClick={toggleTheme} aria-label={label}>
      {isDark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </Button>
  );
}
