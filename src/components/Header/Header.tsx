import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useScrollShrink } from '../../hooks/useScrollShrink';
import { SettingsMenu } from '../SettingsMenu';
import { Button } from '@/components/ui/button';
import {
 Sheet,
 SheetClose,
 SheetContent,
 SheetDescription,
 SheetTitle,
 SheetTrigger,
} from '@/components/ui/sheet';

interface HeaderProps {
 logoSrc: string;
}

export const Header: React.FC<HeaderProps> = ({ logoSrc }) => {
 const [isMenuOpen, setIsMenuOpen] = useState(false);
 const scrolled = useScrollShrink();
 const { t } = useTranslation();
 const location = useLocation();
 const navigate = useNavigate();
 const { totalItems } = useCart();

 const isActive = (path: string) => location.pathname === path;

 const navLinks = [
 { to: '/', label: t('nav.home') },
 { to: '/products', label: t('nav.products') },
 { to: '/catalog', label: t('nav.catalog') },
 ];

 return (
 <header className={`sticky top-0 z-50 border-b border-stone-200/70 dark:border-stone-800/70 bg-white/80 dark:bg-stone-900/80 text-stone-900 dark:text-stone-50 backdrop-blur-md transition-all duration-300 ${scrolled ? 'py-0 shadow-soft' : 'py-2'}`}>
 <nav className="relative z-20">
 <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
 <div className="flex items-center justify-between h-12 sm:h-14 md:h-16">
 {/* Hamburger Menu Button */}
 <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
 <SheetTrigger asChild>
 <Button
 variant="ghost"
 className="md:hidden relative z-30 h-auto w-auto rounded-full p-2 hover:bg-stone-100 dark:hover:bg-stone-800 [&_svg]:size-6"
 aria-label={t('nav.menu')}
 >
 {isMenuOpen ? (
 <X className="h-6 w-6 text-stone-900 dark:text-stone-50 transition-transform duration-300" />
 ) : (
 <Menu className="h-6 w-6 text-stone-900 dark:text-stone-50 transition-transform duration-300" />
 )}
 </Button>
 </SheetTrigger>
 <SheetContent
 side="top"
 className="border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 px-4 pb-5 pt-16 backdrop-blur-sm md:hidden"
 >
 <SheetTitle className="sr-only">
 {t('nav.menu')}
 </SheetTitle>
 <SheetDescription className="sr-only">
 {t('nav.menu')}
 </SheetDescription>
 <div className="space-y-2">
 {navLinks.map(
 (link) =>
 !isActive(link.to) && (
 <SheetClose asChild key={link.to}>
 <Link
 to={link.to}
 className="block rounded-full px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 transition-all duration-200 hover:bg-stone-100 dark:hover:bg-stone-800"
 >
 {link.label}
 </Link>
 </SheetClose>
 ),
 )}
 </div>
 <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-3 dark:border-stone-800">
 <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
 {t('settings.title')}
 </span>
 <SettingsMenu />
 </div>
 </SheetContent>
 </Sheet>

 {/* Left menu items - Desktop */}
 <div className="hidden md:flex items-center space-x-8">
 {navLinks.map(
 (link) =>
 !isActive(link.to) && (
 <Link
 key={link.to}
 to={link.to}
 className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${isActive(link.to) ? 'bg-amber-500 text-white pointer-events-none' : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
 >
 {link.label}
 </Link>
 ),
 )}
 </div>

 {/* Logo */}
 <Link to="/" className="flex-shrink-0 flex justify-center absolute left-1/2 transform -translate-x-1/2 z-20">
 <div className={`p-1 transition-all duration-300 ${scrolled ? 'py-0' : 'py-1'}`}>
 <img
 src={logoSrc}
 alt="Hawaii Tâmplărie Logo"
 className={`w-auto transition-all duration-300 dark:brightness-0 dark:invert ${scrolled ? 'h-16 lg:h-20' : 'h-20 lg:h-28'}`}
 />
 </div>
 </Link>

 {/* Right side: Settings + Cart */}
 <div className="flex items-center gap-1">
 <div className="hidden md:block">
 <SettingsMenu />
 </div>
 <Button
 variant="ghost"
 onClick={() => navigate('/cart')}
 className="relative z-50 h-auto w-auto rounded-full p-2 hover:bg-stone-100 dark:hover:bg-stone-800 [&_svg]:size-6"
 aria-label={t('nav.cart')}
 >
 <ShoppingBag className="h-6 w-6 text-stone-900 dark:text-stone-50 " />
 {totalItems > 0 && (
 <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-white">
 {totalItems}
 </span>
 )}
 </Button>
 </div>
 </div>
 </div>
 </nav>
 </header>
 );
};
