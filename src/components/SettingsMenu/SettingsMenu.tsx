import { Link } from 'react-router-dom';
import { useAuth, UserButton } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { ClipboardList, LogIn, Settings } from 'lucide-react';
import { HeaderDropdown } from './HeaderDropdown';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from '../ThemeToggle';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

export const SettingsMenu: React.FC = () => {
 const { isSignedIn } = useAuth();
 const { t } = useTranslation();

 return (
 <HeaderDropdown
 label={t('settings.title')}
 icon={<Settings className="h-6 w-6 text-stone-900 dark:text-stone-50" />}
 >
 <div className="px-3 pb-1 mb-1 border-b border-stone-100 dark:border-stone-800">
 <h3 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
 {t('settings.title')}
 </h3>
 </div>

 <div className="px-2 mb-2">
 <div className="flex items-center justify-between gap-3 px-3 py-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-100/50 dark:border-stone-800/50">
 <span className="text-xs font-bold text-stone-600 dark:text-stone-300">
 {t('settings.theme')}
 </span>
 <ThemeToggle className="[&_svg]:size-5" />
 </div>
 </div>

 <div className="px-3 pb-1 mb-1">
 <h3 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
 {t('settings.language')}
 </h3>
 </div>
 <div className="px-2 mb-1">
 <LanguageSwitcher />
 </div>

 <div className="mt-1 pt-2 border-t border-stone-100 dark:border-stone-800">
 <div className="px-3 pb-1.5">
 <h3 className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
 {t('settings.account')}
 </h3>
 </div>
 {isSignedIn ? (
 <div className="px-2 pb-1">
 <div className="flex items-center justify-between gap-3 px-3 py-2 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-100/50 dark:border-stone-800/50 hover:border-amber-200/50 dark:hover:border-amber-800/50 transition-colors group">
 <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
 <Link
 to="/my-orders"
 className="flex min-w-0 items-center gap-2.5 text-xs font-bold text-stone-600 dark:text-stone-300 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors"
 >
 <ClipboardList className="h-4 w-4" />
 <span>{t('nav.myOrders')}</span>
 </Link>
 </DropdownMenuItem>
 <div className="h-8 w-px bg-stone-200/60 dark:bg-stone-700/60" />
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
 ) : (
 <div className="px-2 pb-1">
 <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
 <Link
 to="/login"
 className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800 border border-stone-100/50 dark:border-stone-800/50 hover:border-amber-200/50 dark:hover:border-amber-800/50 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
 >
 <LogIn className="h-4 w-4" />
 <span>{t('auth.signIn')}</span>
 </Link>
 </DropdownMenuItem>
 </div>
 )}
 </div>
 </HeaderDropdown>
 );
};
