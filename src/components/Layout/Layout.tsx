import { Outlet } from 'react-router-dom';
import { Header } from '../Header';
import { Footer } from '../Footer';
import { useSiteAssets } from '../../hooks/useSiteAssets';

export const Layout: React.FC = () => {
  const { assets: logoAssets } = useSiteAssets('logo');
  const logoSrc =
    logoAssets.find((asset) => asset.name === 'hawaii-logo.svg')?.url ??
    logoAssets[0]?.url ??
    '/hawaii-logo-without-text.png';

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Header logoSrc={logoSrc} />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
