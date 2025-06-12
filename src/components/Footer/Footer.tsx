import React from 'react';
import { FaFacebook, FaInstagram, FaTiktok } from 'react-icons/fa';
import { Link } from 'react-router-dom';

interface FooterProps {}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-3 text-base">Link-uri rapide</h4>
            <ul className="space-y-1">
              <li><Link to="/" className="hover:text-amber-500 transition-colors text-sm">Acasă</Link></li>
              <li><Link to="/products" className="hover:text-amber-500 transition-colors text-sm">Produse</Link></li>
              <li><Link to="/catalog" className="hover:text-amber-500 transition-colors text-sm">Catalog</Link></li>
              <li><Link to="/cart" className="hover:text-amber-500 transition-colors text-sm">Coș</Link></li>
            </ul>
          </div>

          {/* Column 2: Legal Info */}
          <div className="text-left md:text-center">
            <h4 className="text-white font-semibold mb-3 text-base">Informații legale</h4>
            <ul className="space-y-1">
              <li><Link to="/terms-and-conditions" className="hover:text-amber-500 transition-colors text-sm">Termeni și Condiții</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-amber-500 transition-colors text-sm">Politica de Confidențialitate</Link></li>
              <li><Link to="/return-policy" className="hover:text-amber-500 transition-colors text-sm">Politica de Retur</Link></li>
              <li><Link to="/legal-information" className="hover:text-amber-500 transition-colors text-sm">Informații Legale</Link></li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div className="text-left md:text-right">
            <h4 className="text-white font-semibold mb-3 text-base">Contact</h4>
            <ul className="space-y-1">
              <li><p className="text-sm">Email: hawaiisibiu@gmail.com</p></li>
              <li><p className="text-sm">Telefon: +40 748 831 477</p></li>
            </ul>
            <div className="flex space-x-4 mt-4 justify-start md:justify-end">
              <a href="https://www.facebook.com/profile.php?id=100093461934429" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors"><FaFacebook size={20} /></a>
              <a href="https://www.instagram.com/hawaii_woodworks/" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors"><FaInstagram size={20} /></a>
              <a href="https://www.tiktok.com/@hawaii_woodworks" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors"><FaTiktok size={20} /></a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-6 border-t border-stone-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
            {/* Legal Details */}
            <div className="text-center md:text-left">
              <p className="font-semibold">HAWAII WOODWORKING SIBIU SRL</p>
              <p>CUI: 48789961 | Nr. Reg. Com.: J32/1718/2023</p>
              <p>Sediu: Cristian, Str. XIII, Nr. 113, Jud. Sibiu</p>
            </div>
            
            {/* ANPC Links */}
            <div className="text-center">
              <p><a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">Soluționarea Alternativă a Litigiilor (SAL)</a></p>
              <p><a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">Soluționarea Online a Litigiilor (SOL)</a></p>
            </div>
            
            {/* Copyright */}
            <div className="text-center md:text-right">
              <p>&copy; {new Date().getFullYear()} Hawaii Woodworking Sibiu.</p>
              <p>Toate drepturile rezervate.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
