import { Hero } from '../../components/Hero/Hero';
import { Services } from '../../components/Services/Services';
import { FeaturedProducts } from '../../components/Products/FeaturedProducts';
import WoodPhoto from '../../../assets/HeroAssets/WoodPhoto.jpg';

export const Home: React.FC = () => {
  return (
    <>
      <Hero backgroundImage={WoodPhoto} />
      <Services />
      <FeaturedProducts />
    </>
  );
};
