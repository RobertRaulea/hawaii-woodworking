import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserButton } from '@clerk/clerk-react';
import { useCart } from '../../context/CartContext';
import { useScrollShrink } from '../../hooks/useScrollShrink';
import { ShoppingBagIcon, Bars3Icon, XMarkIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  logoSrc: string;
}

export const Header: React.FC<HeaderProps> = ({ logoSrc }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const scrolled = useScrollShrink();
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { isSignedIn } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className={`sticky top-0 bg-white/70 backdrop-blur-sm text-stone-900 z-50 font-bold transition-all duration-300 ${scrolled ? 'py-0' : 'py-2'}`}>
      <nav className="relative z-20">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-14 md:h-16">
            {/* Hamburger Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 hover:bg-stone-100 rounded-full transition-all duration-300 relative z-30"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6 text-stone-900 transition-transform duration-300" />
              ) : (
                <Bars3Icon className="h-6 w-6 text-stone-900 transition-transform duration-300" />
              )}
            </button>

            {/* Left menu items - Desktop */}
            <div className="hidden md:flex items-center space-x-8">
              {!isActive('/') && (
                <Link 
                  to="/" 
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${isActive('/') ? 'bg-amber-500 text-white pointer-events-none' : 'text-stone-700 hover:bg-stone-100'}`}
                >
                  Acasă
                </Link>
              )}
              {!isActive('/products') && (
                <Link 
                  to="/products" 
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${isActive('/products') ? 'bg-amber-500 text-white pointer-events-none' : 'text-stone-700 hover:bg-stone-100'}`}
                >
                  Produse
                </Link>
              )}
              {!isActive('/catalog') && (
                <Link 
                  to="/catalog" 
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${isActive('/catalog') ? 'bg-amber-500 text-white pointer-events-none' : 'text-stone-700 hover:bg-stone-100'}`}
                >
                  Catalog
                </Link>
              )}
            </div>

            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex justify-center absolute left-1/2 transform -translate-x-1/2 z-20">
              <div className={`p-1 transition-all duration-300 ${scrolled ? 'py-0' : 'py-1'}`}>
                <img 
                  src={logoSrc} 
                  alt="Hawaii Tâmplărie Logo" 
                  className={`w-auto transition-all duration-300 ${scrolled ? 'h-14 sm:h-16 md:h-20' : 'h-16 sm:h-20 md:h-24 lg:h-28'}`} 
                />
              </div>
            </Link>

            {/* Right side: My Orders + Cart + User */}
            <div className="flex items-center gap-1">
              {isSignedIn && (
                <Link
                  to="/my-orders"
                  className="hidden md:flex items-center gap-1 p-2 hover:bg-stone-100 rounded-full transition-colors text-sm font-medium text-stone-700"
                  aria-label="Comenzile mele"
                >
                  <ClipboardDocumentListIcon className="h-5 w-5" />
                </Link>
              )}
              <button 
                onClick={() => navigate('/cart')}
                className="relative z-50 p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Shopping cart"
              >
                <ShoppingBagIcon className="h-6 w-6 text-stone-900" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
              {isSignedIn && (
                <div className="ml-1">
                  <UserButton afterSignOutUrl="/" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden fixed top-[48px] sm:top-[56px] md:top-[64px] left-0 w-full bg-white/70 backdrop-blur-sm transform transition-all duration-300 ease-in-out shadow-lg ${isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
          <div className="px-4 py-3 space-y-2">
            {!isActive('/') && (
              <Link 
                to="/" 
                className={`block px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive('/') ? 'bg-amber-500 text-white pointer-events-none' : 'text-stone-700 hover:bg-stone-100'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Acasă
              </Link>
            )}
            {!isActive('/products') && (
              <Link 
                to="/products" 
                className={`block px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive('/products') ? 'bg-amber-500 text-white pointer-events-none' : 'text-stone-700 hover:bg-stone-100'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Produse
              </Link>
            )}
            {!isActive('/catalog') && (
              <Link 
                to="/catalog" 
                className={`block px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${isActive('/catalog') ? 'bg-amber-500 text-white pointer-events-none' : 'text-stone-700 hover:bg-stone-100'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Catalog
              </Link>
            )}
            {isSignedIn && !isActive('/my-orders') && (
              <Link
                to="/my-orders"
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 text-stone-700 hover:bg-stone-100"
                onClick={() => setIsMenuOpen(false)}
              >
                <ClipboardDocumentListIcon className="h-4 w-4" />
                Comenzile mele
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};
