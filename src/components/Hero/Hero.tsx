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
          className="w-full h-full object-cover brightness-50"
        />
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      {/* Centred Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center w-full px-4 sm:px-6 lg:px-8 min-h-[70vh] gap-8">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white">Bun venit la Hawaii Woodworking</h1>
        <p className="max-w-3xl text-lg md:text-xl text-gray-200 leading-relaxed">
          La Hawaii Woodworking îmbinăm tradiția prelucrării lemnului cu tehnologia CNC de ultimă generație pentru a crea piese unice, durabile și personalizate. Echipa noastră te poate ajuta de la concept la produs finit, fie că ai nevoie de mobilier, decorațiuni sau prototipuri speciale.
        </p>
        <button
          onClick={() => navigate('/catalog')}
          className="bg-amber-600 hover:bg-amber-700 text-white px-10 py-4 rounded text-base font-medium transition-colors"
        >
          Vezi Catalog
        </button>
      </div>
    </div>
  );
};
