import { Hero } from '../../components/Hero/Hero';
import { Services } from '../../components/Services/Services';
import { FeaturedProducts } from '../../components/Products/FeaturedProducts';

export const Home: React.FC = () => {
  return (
    <>
      <Hero backgroundImage="https://images.unsplash.com/photo-1611275484845-52a71f2b0a6a?auto=format&fit=crop&q=80" />
      <Services />
      <FeaturedProducts />
    </>
  );
};
