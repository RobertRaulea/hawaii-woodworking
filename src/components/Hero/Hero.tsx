import type React from 'react';
import { useNavigate } from 'react-router-dom';

interface HeroProps {
  backgroundImage: string;
}

export const Hero: React.FC<HeroProps> = ({ backgroundImage }) => {
  const navigate = useNavigate();
  return (
    <div className="relative min-h-screen">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={backgroundImage}
          alt="Woodworking background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>
      </div>

      {/* Centred Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center w-full px-6 sm:px-8 lg:px-12 min-h-[85vh] gap-6">
        <p className="text-amber-400 text-sm font-medium tracking-[0.25em] uppercase animate-fade-in">Artizanat & Tehnologie CNC</p>
        <h1 className="font-serif text-4xl sm:text-5xl lg:text-7xl font-medium text-white leading-tight max-w-4xl animate-fade-in-up">
          Bun venit la Hawaii Woodworking
        </h1>
        <p className="max-w-2xl text-base md:text-lg text-white/70 leading-relaxed font-light animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          Îmbinăm tradiția prelucrării lemnului cu tehnologia CNC de ultimă generație pentru a crea piese unice, durabile și personalizate.
        </p>
        <button
          onClick={() => navigate('/catalog')}
          className="mt-4 bg-white text-stone-900 hover:bg-amber-50 px-10 py-3.5 rounded-md text-sm font-medium tracking-wide transition-all duration-300 hover:shadow-soft-lg animate-fade-in-up"
          style={{ animationDelay: '0.3s' }}
        >
          Vezi Catalog
        </button>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-fade-in" style={{ animationDelay: '0.6s' }}>
        <div className="w-5 h-8 rounded-full border-2 border-white/30 flex justify-center pt-1.5">
          <div className="w-1 h-2 bg-white/50 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  );
};
