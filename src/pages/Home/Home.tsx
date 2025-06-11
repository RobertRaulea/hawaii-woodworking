import { Hero } from '../../components/Hero';
import { Products } from '../Products/Products';
import WoodPhoto from '../../../assets/HeroAssets/WoodPhoto.jpg';

export const Home: React.FC = () => {
  return (
    <>
      <Hero backgroundImage={WoodPhoto} />
      {/* Product listing directly on homepage */}
      <Products />
    </>
  );
};
