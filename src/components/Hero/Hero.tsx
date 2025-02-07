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

      {/* Hero Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-bold text-white mb-6">Atelier frezare CNC din Sibiu</h1>
          <p className="text-xl text-gray-300 mb-8">
          Atelier de frezare CNC în lemn, folosim tehnologie avansată pentru prelucrări precise în mobilier, decorațiuni și panouri personalizate.          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/catalog')}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded text-sm font-medium transition-colors"
            >
              Vezi Catalog
            </button>
            {/* <button className="border border-white hover:bg-white/10 text-white px-8 py-3 rounded text-sm font-medium transition-colors">
              Comandă Personalizată
            </button> */}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32">
        <div className="grid grid-cols-3 gap-8 text-center text-white">
          <div>
            <div className="text-4xl font-bold text-amber-500">1+</div>
            <div className="mt-2 text-gray-300">Ani Experiență</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-amber-500">10+</div>
            <div className="mt-2 text-gray-300">Proiecte Finalizate</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-amber-500">100+</div>
            <div className="mt-2 text-gray-300">Clienți Mulțumiți</div>
          </div>
        </div>
      </div>
    </div>
  );
};
