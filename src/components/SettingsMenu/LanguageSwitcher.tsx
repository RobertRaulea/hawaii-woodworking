import { useLanguage } from '../../context/LanguageContext';
import { Button } from '@/components/ui/button';

const languages = [
 { code: 'ro' as const, name: 'RO', flag: '🇷🇴' },
 { code: 'en' as const, name: 'EN', flag: '🇬🇧' },
 { code: 'de' as const, name: 'DE', flag: '🇩🇪' },
];

export const LanguageSwitcher: React.FC = () => {
 const { language, setLanguage } = useLanguage();

 return (
 <div className="flex p-1 bg-stone-100 dark:bg-stone-800 rounded-full w-full" role="group" aria-label="Limba">
 {languages.map((lang) => (
 <Button
 key={lang.code}
 variant="ghost"
 aria-pressed={language === lang.code}
 onClick={() => setLanguage(lang.code)}
 className={`h-auto flex-1 gap-1.5 rounded-full py-1.5 text-xs font-bold transition-all duration-300 ${
 language === lang.code
 ? 'bg-white dark:bg-stone-900 text-amber-600 dark:text-amber-400 shadow-sm scale-[1.02] hover:bg-white dark:hover:bg-stone-800 hover:text-amber-600 dark:hover:text-amber-400'
 : 'text-stone-500 dark:text-stone-400 hover:bg-transparent hover:text-stone-700 dark:hover:text-stone-300'
 }`}
 >
 <span className="text-sm leading-none">{lang.flag}</span>
 <span>{lang.name}</span>
 </Button>
 ))}
 </div>
 );
};
