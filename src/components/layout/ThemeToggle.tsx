import { MoonStar, Sun } from 'lucide-react';

import { useTheme } from '@/components/theme/ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      className="flex size-9 items-center justify-center rounded-full text-muted transition duration-200 ease-[var(--ease-ios)] hover:bg-black/[0.05] hover:text-text active:scale-95 dark:hover:bg-white/[0.08]"
    >
      {isDark ? (
        <Sun className="size-[18px]" strokeWidth={1.75} aria-hidden />
      ) : (
        <MoonStar className="size-[18px]" strokeWidth={1.75} aria-hidden />
      )}
    </button>
  );
}
