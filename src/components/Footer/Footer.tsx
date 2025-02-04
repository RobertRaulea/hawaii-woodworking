interface FooterProps {
  logoSrc: string;
}

export const Footer: React.FC<FooterProps> = ({ logoSrc }) => {
  return (
    <footer className="bg-stone-900 text-stone-300 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center mb-6">
              <img src={logoSrc} alt="Hawaii Tâmplărie Logo" className="h-24 w-auto" />
              <span className="ml-2 text-xl font-semibold text-white">Hawaii Tâmplărie Sibiu</span>
            </div>
            <p className="text-sm leading-relaxed">
              Artizanat în lemn din Sibiu, realizat cu spiritul tradiției și al calității. 
              Fiecare piesă spune o poveste despre meșteșugul și tradiția lemnului.
            </p>
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
  );
};
