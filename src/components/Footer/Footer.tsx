import type React from 'react';
import { FaFacebook, FaInstagram, FaTiktok } from 'react-icons/fa';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-stone-400 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          {/* Column 1: Quick Links */}
          <div>
            <h4 className="font-serif text-white text-lg mb-5 tracking-wide">Link-uri rapide</h4>
            <ul className="space-y-3">
              <li><Link to="/" className="text-stone-400 hover:text-amber-400 transition-colors duration-200 text-sm">Acasă</Link></li>
              <li><Link to="/products" className="text-stone-400 hover:text-amber-400 transition-colors duration-200 text-sm">Produse</Link></li>
              <li><Link to="/catalog" className="text-stone-400 hover:text-amber-400 transition-colors duration-200 text-sm">Catalog</Link></li>
              <li><Link to="/cart" className="text-stone-400 hover:text-amber-400 transition-colors duration-200 text-sm">Coș</Link></li>
            </ul>
          </div>

          {/* Column 2: Legal Info */}
          <div className="text-left md:text-center">
            <h4 className="font-serif text-white text-lg mb-5 tracking-wide">Informații legale</h4>
            <ul className="space-y-3">
              <li><Link to="/terms-and-conditions" className="text-stone-400 hover:text-amber-400 transition-colors duration-200 text-sm">Termeni și Condiții</Link></li>
              <li><Link to="/privacy-policy" className="text-stone-400 hover:text-amber-400 transition-colors duration-200 text-sm">Politica de Confidențialitate</Link></li>
              <li><Link to="/return-policy" className="text-stone-400 hover:text-amber-400 transition-colors duration-200 text-sm">Politica de Retur</Link></li>
              <li><Link to="/legal-information" className="text-stone-400 hover:text-amber-400 transition-colors duration-200 text-sm">Informații Legale</Link></li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div className="text-left md:text-right">
            <h4 className="font-serif text-white text-lg mb-5 tracking-wide">Contact</h4>
            <ul className="space-y-3">
              <li><p className="text-sm">hawaiisibiu@gmail.com</p></li>
              <li><p className="text-sm">+40 748 831 477</p></li>
            </ul>
            <div className="flex space-x-5 mt-6 justify-start md:justify-end">
              <a href="https://www.facebook.com/profile.php?id=100093461934429" target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-amber-400 transition-colors duration-200"><FaFacebook size={18} /></a>
              <a href="https://www.instagram.com/hawaii_woodworks/" target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-amber-400 transition-colors duration-200"><FaInstagram size={18} /></a>
              <a href="https://www.tiktok.com/@hawaii_woodworks" target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-amber-400 transition-colors duration-200"><FaTiktok size={18} /></a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-14 pt-8 border-t border-stone-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-stone-500">
            {/* Legal Details */}
            <div className="text-center md:text-left space-y-0.5">
              <p className="font-medium text-stone-400">HAWAII WOODWORKING SIBIU SRL</p>
              <p>CUI: 48789961 | Nr. Reg. Com.: J32/1718/2023</p>
              <p>Sediu: Cristian, Str. XIII, Nr. 113, Jud. Sibiu</p>
            </div>
            
            {/* ANPC Links */}
            <div className="text-center space-y-0.5">
              <p><a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-amber-400 transition-colors duration-200">Soluționarea Alternativă a Litigiilor (SAL)</a></p>
              <p><a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-amber-400 transition-colors duration-200">Soluționarea Online a Litigiilor (SOL)</a></p>
            </div>
            
            {/* Copyright */}
            <div className="text-center md:text-right space-y-0.5">
              <p>&copy; {new Date().getFullYear()} Hawaii Woodworking Sibiu.</p>
              <p>Toate drepturile rezervate.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
