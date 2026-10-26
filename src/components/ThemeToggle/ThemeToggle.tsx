import type React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn.utils';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
 const { theme, toggleTheme } = useTheme();
 const { t } = useTranslation();
 const isDark = theme === 'dark';

 return (
 <Button
 variant="ghost"
 onClick={toggleTheme}
 className={cn('h-auto w-auto rounded-full p-2 text-stone-700 dark:text-stone-200 [&_svg]:size-6', className)}
 aria-label={isDark ? t('theme.light') : t('theme.dark')}
 aria-pressed={isDark}
 >
 {isDark ? (
 <Sun className="h-6 w-6 text-amber-400 transition-transform duration-300" />
 ) : (
 <Moon className="h-6 w-6 transition-transform duration-300" />
 )}
 </Button>
 );
};
