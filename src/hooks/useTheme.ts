import { useCallback, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

const getInitialTheme = (): Theme => {
 if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
 return 'dark';
 }
 if (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'dark') {
 return 'dark';
 }
 return 'light';
};

export function useTheme() {
 const [theme, setTheme] = useState<Theme>(getInitialTheme);

 const toggleTheme = useCallback(() => {
 setTheme((current) => {
 const next: Theme = current === 'dark' ? 'light' : 'dark';
 document.documentElement.classList.toggle('dark', next === 'dark');
 try {
 localStorage.setItem(STORAGE_KEY, next);
 } catch {
 // storage unavailable — theme still applies for this session
 }
 return next;
 });
 }, []);

 return { theme, toggleTheme };
}
