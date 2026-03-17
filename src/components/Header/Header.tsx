import { ShoppingBagIcon, Bars3Icon, XMarkIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, UserButton } from '@clerk/clerk-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useCart } from '../../context/CartContext';

interface HeaderProps {
  logoSrc: string;
}

export const Header: React.FC<HeaderProps> = ({ logoSrc }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isProductsDropdownOpen, setIsProductsDropdownOpen] = useState(false);
  const [isMobileProductsOpen, setIsMobileProductsOpen] = useState(false);
  const productsDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { isSignedIn } = useAuth();
  const categories = useQuery(api.categories.getAll);
  const products = useQuery(api.products.getAll);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const SHRINK_THRESHOLD = 20;
    const EXPAND_THRESHOLD = 5;
    const DEBOUNCE_MS = 50;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (timeoutId) return;
      
      timeoutId = setTimeout(() => {
        const currentScroll = window.scrollY;
        
        if (!scrolled && currentScroll > SHRINK_THRESHOLD) {
          setScrolled(true);
        } else if (scrolled && currentScroll < EXPAND_THRESHOLD) {
          setScrolled(false);
        }
        
        timeoutId = null;
      }, DEBOUNCE_MS);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [scrolled]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productsDropdownRef.current && !productsDropdownRef.current.contains(event.target as Node)) {
        setIsProductsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/products?category=${encodeURIComponent(categoryName)}`);
    setIsProductsDropdownOpen(false);
    setIsMenuOpen(false);
    setIsMobileProductsOpen(false);
  };

  const handleAllProductsClick = () => {
    navigate('/products');
    setIsProductsDropdownOpen(false);
    setIsMenuOpen(false);
    setIsMobileProductsOpen(false);
  };

  const handleDropdownMouseEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setIsProductsDropdownOpen(true);
  };

  const handleDropdownMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setIsProductsDropdownOpen(false);
    }, 150);
  };

  // Filter categories that have products
  const categoriesWithProducts = useMemo(() => {
    if (!categories || !products) return [];
    return categories.filter(category => 
      products.some(product => product.category === category.name)
    );
  }, [categories, products]);

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
              {/* Products dropdown */}
              {!isActive('/products') && (
                <div 
                  className="relative" 
                  ref={productsDropdownRef}
                  onMouseEnter={handleDropdownMouseEnter}
                  onMouseLeave={handleDropdownMouseLeave}
                >
                  <button
                    className="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 text-stone-700 hover:bg-stone-100"
                  >
                    Produse
                  </button>

                {/* Dropdown menu */}
                {isProductsDropdownOpen && (
                  <div className="absolute top-full left-0 pt-2 w-52 z-50">
                    <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 py-3 transition-all duration-200">
                      <div className="px-2 space-y-0.5">
                        <button
                          onClick={handleAllProductsClick}
                          className="w-full text-left px-3 py-1.5 text-sm text-stone-900 hover:bg-white/60 hover:text-stone-900 rounded-full transition-all duration-200"
                        >
                          Toate Produsele
                        </button>
                        {categoriesWithProducts && categoriesWithProducts.length > 0 && (
                          <>
                            <div className="h-px bg-stone-300/30 my-1.5"></div>
                            {categoriesWithProducts.map((category) => (
                              <button
                                key={category._id}
                                onClick={() => handleCategoryClick(category.name)}
                                className="w-full text-left px-3 py-1.5 text-sm text-stone-700 hover:bg-white/60 hover:text-stone-900 rounded-full transition-all duration-200"
                              >
                                {category.name}
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                </div>
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
            {/* Mobile Products with categories */}
            {!isActive('/products') && (
              <div>
                <button
                  onClick={() => setIsMobileProductsOpen(!isMobileProductsOpen)}
                  className="w-full flex items-center justify-between px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 text-stone-700 hover:bg-stone-100"
                >
                  Produse
                </button>
              
              {isMobileProductsOpen && (
                <div className="mt-2 ml-3 space-y-0.5 bg-white/80 backdrop-blur-md rounded-2xl p-2 border border-white/20 shadow-lg">
                  <button
                    onClick={handleAllProductsClick}
                    className="w-full text-left px-3 py-1.5 text-sm text-stone-900 hover:bg-white/60 hover:text-stone-900 rounded-full transition-all duration-200"
                  >
                    Toate Produsele
                  </button>
                  {categoriesWithProducts && categoriesWithProducts.length > 0 && (
                    <>
                      <div className="h-px bg-stone-300/30 my-1.5"></div>
                      {categoriesWithProducts.map((category) => (
                        <button
                          key={category._id}
                          onClick={() => handleCategoryClick(category.name)}
                          className="w-full text-left px-3 py-1.5 text-sm text-stone-700 hover:bg-white/60 hover:text-stone-900 rounded-full transition-all duration-200"
                        >
                          {category.name}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
              </div>
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
