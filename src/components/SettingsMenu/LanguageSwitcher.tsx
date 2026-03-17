import { useLanguage } from '../../context/LanguageContext';

const languages = [
  { code: 'ro' as const, name: 'RO', flag: '🇷🇴' },
  { code: 'en' as const, name: 'EN', flag: '🇬🇧' },
  { code: 'de' as const, name: 'DE', flag: '🇩🇪' },
];

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex p-1 bg-stone-100 rounded-full w-full">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
            language === lang.code
              ? 'bg-white text-amber-600 shadow-sm scale-[1.02]'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <span className="text-sm leading-none">{lang.flag}</span>
          <span>{lang.name}</span>
        </button>
      ))}
    </div>
  );
};
