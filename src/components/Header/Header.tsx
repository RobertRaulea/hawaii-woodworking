import { ShoppingCart, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '@context/CartContext';

interface HeaderProps {
  logoSrc: string;
}

export const Header: React.FC<HeaderProps> = ({ logoSrc }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems } = useCart();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 bg-white/70 backdrop-blur-sm text-stone-900 z-50 font-bold">
      <nav className="relative z-20">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 sm:h-14 md:h-16">
            {/* Hamburger Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 hover:bg-stone-100 rounded-full transition-all duration-300 relative z-30"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-stone-900 transform rotate-0 transition-transform duration-300" />
              ) : (
                <Menu className="h-6 w-6 text-stone-900 transform rotate-0 transition-transform duration-300" />
              )}
            </button>

            {/* Left menu items - Desktop */}
            <div className="hidden md:flex items-center space-x-8">
              {!isActive('/') && (
                <Link 
                  to="/" 
                  className={`text-stone-900 transition-colors text-base ${isActive('/') ? 'text-amber-500 pointer-events-none' : 'hover:text-amber-500'}`}
                >
                  Acasă
                </Link>
              )}
              {!isActive('/products') && (
                <Link 
                  to="/products" 
                  className={`text-stone-900 transition-colors text-base ${isActive('/products') ? 'text-amber-500 pointer-events-none' : 'hover:text-amber-500'}`}
                >
                  Produse
                </Link>
              )}
              {!isActive('/catalog') && (
                <Link 
                  to="/catalog" 
                  className={`text-stone-900 transition-colors text-base ${isActive('/catalog') ? 'text-amber-500 pointer-events-none' : 'hover:text-amber-500'}`}
                >
                  Catalog
                </Link>
              )}
            </div>

            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex justify-center absolute left-1/2 transform -translate-x-1/2 z-20">
              <div className="p-1">
                <img src={logoSrc} alt="Hawaii Tâmplărie Logo" className="h-16 sm:h-20 md:h-24 lg:h-36 w-auto brightness-0 invert-0" style={{filter: 'brightness(0)'}} />
              </div>
            </Link>

            {/* Cart Icon */}
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/cart')}
                className="relative z-50 p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Shopping cart"
              >
                <ShoppingCart className="h-6 w-6 text-stone-900" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`md:hidden fixed top-[48px] sm:top-[56px] md:top-[64px] left-0 w-full bg-white/95 backdrop-blur-sm transform transition-all duration-300 ease-in-out shadow-lg ${isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
          <div className="px-4 py-3 space-y-2">
            {!isActive('/') && (
              <Link 
                to="/" 
                className={`block text-stone-900 transition-colors text-base py-2 ${isActive('/') ? 'text-amber-500 pointer-events-none' : 'hover:text-amber-500'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Acasă
              </Link>
            )}
            {!isActive('/products') && (
              <Link 
                to="/products" 
                className={`block text-stone-900 transition-colors text-base py-2 ${isActive('/products') ? 'text-amber-500 pointer-events-none' : 'hover:text-amber-500'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Produse
              </Link>
            )}
            {!isActive('/catalog') && (
              <Link 
                to="/catalog" 
                className={`block text-stone-900 transition-colors text-base py-2 ${isActive('/catalog') ? 'text-amber-500 pointer-events-none' : 'hover:text-amber-500'}`}
                onClick={() => setIsMenuOpen(false)}
              >
                Catalog
              </Link>
            )}
            <Link 
              to="#" 
              className={`block text-stone-900 transition-colors text-base py-2 ${isActive('/#') ? 'text-amber-500 pointer-events-none' : 'hover:text-amber-500'}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
};
