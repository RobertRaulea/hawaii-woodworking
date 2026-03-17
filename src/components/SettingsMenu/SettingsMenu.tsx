import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, UserButton } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { ClipboardDocumentListIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { LanguageSwitcher } from './LanguageSwitcher';

export const SettingsMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isSignedIn } = useAuth();
  const { t } = useTranslation();

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300); // 300ms delay for smoothness
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div 
      className="relative" 
      ref={menuRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-stone-100 rounded-full transition-colors relative z-10"
        aria-label={t('settings.title')}
      >
        <UserCircleIcon className="h-6 w-6 text-stone-900" />
      </button>

      {/* Hover Bridge: prevents the menu from closing when moving between button and dropdown */}
      <div className={`absolute left-0 right-0 h-4 top-full transition-all ${isOpen ? 'block' : 'hidden'}`} />

      <div className={`absolute right-0 top-full mt-1 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-100 py-2 z-50 overflow-hidden transition-all duration-300 transform origin-top-right ease-[cubic-bezier(0.23,1,0.32,1)] ${
        isOpen 
          ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
          : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
      }`}>
          <div className="px-3 pb-1 mb-1 border-b border-stone-100">
            <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
              {t('settings.language')}
            </h3>
          </div>
          
          <div className="px-2 mb-2">
            <LanguageSwitcher />
          </div>

          {isSignedIn && (
            <div className="mt-1 pt-2 border-t border-stone-100">
              <div className="px-3 pb-1.5">
                <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                  {t('settings.account')}
                </h3>
              </div>
              <div className="px-2 pb-1">
                <div className="flex items-center justify-between gap-3 px-3 py-2 bg-stone-50 rounded-xl border border-stone-100/50 hover:border-amber-200/50 transition-colors group">
                  <Link
                    to="/my-orders"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 text-xs font-bold text-stone-600 group-hover:text-amber-600 transition-colors"
                  >
                    <ClipboardDocumentListIcon className="h-4 w-4" />
                    <span>{t('nav.myOrders')}</span>
                  </Link>
                  <div className="h-8 w-px bg-stone-200/60" />
                  <div className="flex-shrink-0">
                    <UserButton 
                      afterSignOutUrl="/" 
                      appearance={{ 
                        elements: { 
                          userButtonAvatarBox: 'h-8 w-8 shadow-sm ring-2 ring-white hover:ring-amber-100 transition-all' 
                        } 
                      }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
    </div>
  );
};
