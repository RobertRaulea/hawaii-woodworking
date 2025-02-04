import {ShoppingCart, Menu, X, Hammer, Trees, Shield } from 'lucide-react';
import hawaiiLogo from '../assets/hawaii-logo.svg';
import { useState } from 'react';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 bg-white/70 backdrop-blur-sm text-stone-900 z-10 font-bold">
        <nav className="relative z-20">
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-12 sm:h-14 md:h-16">
              {/* Hamburger Menu Button */}
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 hover:bg-stone-100 rounded-full transition-all duration-300"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6 text-stone-900 transform rotate-0 transition-transform duration-300" />
                ) : (
                  <Menu className="h-6 w-6 text-stone-900 transform rotate-0 transition-transform duration-300" />
                )}
              </button>

              {/* Left menu items - Desktop */}
              <div className="hidden md:flex items-center space-x-8">
                <a href="#" className="text-stone-900 hover:text-amber-500 transition-colors text-base">Produse</a>
                <a href="#" className="text-stone-900 hover:text-amber-500 transition-colors text-base">Comenzi Personalizate</a>
              </div>

              {/* Logo */}
              <div className="flex-shrink-0 flex justify-center absolute left-1/2 transform -translate-x-1/2">
                <div className="p-1">
                  <img src={hawaiiLogo} alt="Hawaii Tâmplărie Logo" className="h-16 sm:h-20 md:h-24 lg:h-36 w-auto brightness-0 invert-0" style={{filter: 'brightness(0)'}} />
                </div>
              </div>

              {/* Cart Icon */}
              <div className="flex items-center">
                <button className="p-2 hover:bg-stone-100 rounded-full relative">
                  <ShoppingCart className="h-6 w-6 text-stone-900" />
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">3</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className={`md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-sm transform transition-all duration-300 ease-in-out ${isMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
            <div className="px-4 py-3 space-y-2">
              <a href="#" className="block text-stone-900 hover:text-amber-500 transition-colors text-base py-2">Produse</a>
              <a href="#" className="block text-stone-900 hover:text-amber-500 transition-colors text-base py-2">Comenzi Personalizate</a>
              <a href="#" className="block text-stone-900 hover:text-amber-500 transition-colors text-base py-2">Contact</a>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main>
        <div className="relative min-h-screen">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1611275484845-52a71f2b0a6a?auto=format&fit=crop&q=80"
              alt="Woodworking background"
              className="w-full h-full object-cover brightness-50"
            />
            <div className="absolute inset-0 bg-black/50"></div>
          </div>

          {/* Hero Content */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32">
            <div className="max-w-3xl">
              <h1 className="text-5xl font-bold text-white mb-6">Artă în Lemn din Sibiu</h1>
              <p className="text-xl text-gray-300 mb-8">
                Descoperiți creații unice în lemn, realizate cu pasiune și măiestrie tradițională
              </p>
              <div className="flex gap-4">
                <button className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded text-sm font-medium transition-colors">
                  Vezi Colecția
                </button>
                <button className="border border-white hover:bg-white/10 text-white px-8 py-3 rounded text-sm font-medium transition-colors">
                  Comandă Personalizată
                </button>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32">
            <div className="grid grid-cols-3 gap-8 text-center text-white">
              <div>
                <div className="text-4xl font-bold text-amber-500">30+</div>
                <div className="mt-2 text-gray-300">Ani Experiență</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-amber-500">150+</div>
                <div className="mt-2 text-gray-300">Proiecte Finalizate</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-amber-500">100+</div>
                <div className="mt-2 text-gray-300">Clienți Mulțumiți</div>
              </div>
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div className="bg-white py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900">Serviciile Noastre</h2>
              <p className="mt-4 text-gray-600">Descoperă gama noastră completă de servicii de tâmplărie</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div className="bg-amber-50 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Hammer className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-center">Calitate Artizanală</h3>
                <p className="text-gray-600 text-center">Fiecare piesă este creată cu atenție la detalii și pasiune pentru perfecțiune</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div className="bg-amber-50 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Trees className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-center">Materiale Premium</h3>
                <p className="text-gray-600 text-center">Lemn selectat cu grijă de la furnizori locali de încredere</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
                <div className="bg-amber-50 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-amber-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-center">Garanție pe Viață</h3>
                <p className="text-gray-600 text-center">Construit să dureze generații cu promisiunea noastră de calitate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Products */}
        <div className="py-24 bg-stone-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-center mb-16">Creații în Evidență</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  name: "Masă din Lemn Masiv",
                  price: "2.999 RON",
                  image: "https://images.unsplash.com/photo-1578685666972-015e0f32e477?auto=format&fit=crop&q=80"
                },
                {
                  name: "Dulap Personalizat",
                  price: "4.899 RON",
                  image: "https://images.unsplash.com/photo-1609587312208-cea54be969e7?auto=format&fit=crop&q=80"
                },
                {
                  name: "Ramă Foto Artizanală",
                  price: "799 RON",
                  image: "https://images.unsplash.com/photo-1533377379833-82591c6e4e78?auto=format&fit=crop&q=80"
                }
              ].map((product, index) => (
                <div key={index} className="group">
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="relative">
                      <img src={product.image} alt={product.name} className="w-full h-80 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform">
                          Vizualizare Rapidă
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                      <p className="text-amber-700 font-medium text-lg">{product.price}</p>
                      <button className="mt-4 w-full bg-stone-100 hover:bg-stone-200 text-gray-900 px-4 py-3 rounded-lg transition-colors">
                        Adaugă în Coș
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Orders CTA */}
        <div className="relative py-24">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1581897271939-e31cc9eb2892?auto=format&fit=crop&q=80"
              alt="Woodworking workshop"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-amber-900/90"></div>
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">Comenzi Personalizate Binevenite</h2>
            <p className="text-amber-100 mb-10 max-w-2xl mx-auto text-lg">
              Aveți o piesă specifică în minte? Vom lucra împreună pentru a crea creația perfectă personalizată pentru dumneavoastră.
            </p>
            <button className="bg-white hover:bg-amber-50 text-amber-900 px-10 py-4 rounded-lg text-lg font-medium transition-colors">
              Începeți Comanda Personalizată
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center mb-6">
                <img src={hawaiiLogo} alt="Hawaii Tâmplărie Logo" className="h-24 w-auto" />
                <span className="ml-2 text-xl font-semibold text-white">Hawaii Tâmplărie Sibiu</span>
              </div>
              <p className="text-sm leading-relaxed">Artizanat în lemn din Sibiu, realizat cu spiritul tradiției și al calității. Fiecare piesă spune o poveste despre meșteșugul și tradiția lemnului.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-6 text-lg">Linkuri rapide</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-amber-500 transition-colors">Produse</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Comenzi Personalizate</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Despre Noi</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-6 text-lg">Servicii Clienți</h4>
              <ul className="space-y-3">
                <li><a href="#" className="hover:text-amber-500 transition-colors">Informații despre livrare</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Retururi</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Instrucțiuni de îngrijire</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Întrebări frecvente</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-6 text-lg">Newsletter</h4>
              <p className="text-sm mb-6">Abonează-te pentru a primi știri și oferte speciale.</p>
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Introduceți adresa de email"
                  className="w-full bg-stone-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button className="w-full bg-amber-700 hover:bg-amber-600 text-white px-4 py-3 rounded-lg transition-colors">
                  Abonează-te
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-stone-800 mt-16 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Hawaii Tâmplărie Sibiu. Toate drepturile rezervate.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;