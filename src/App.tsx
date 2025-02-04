import { Header } from './components/Header/Header';
import { Hero } from './components/Hero/Hero';
import { Services } from './components/Services/Services';
import { FeaturedProducts } from './components/Products/FeaturedProducts';
import { Footer } from './components/Footer/Footer';
import hawaiiLogo from '../assets/hawaii-logo.svg';

function App() {
  return (
    <div className="min-h-screen bg-stone-50">
      <Header logoSrc={hawaiiLogo} />
      <main>
        <Hero backgroundImage="https://images.unsplash.com/photo-1611275484845-52a71f2b0a6a?auto=format&fit=crop&q=80" />
        <Services />
        <FeaturedProducts />
      </main>
      <Footer logoSrc={hawaiiLogo} />
    </div>
  );
}

export default App;