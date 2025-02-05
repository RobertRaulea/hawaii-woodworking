import { Outlet } from 'react-router-dom';
import { Header } from '../Header/Header';
import { Footer } from '../Footer/Footer';
import hawaiiLogo from '../../../assets/hawaii-logo.svg';

export const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Header logoSrc={hawaiiLogo} />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer logoSrc={hawaiiLogo} />
    </div>
  );
};
