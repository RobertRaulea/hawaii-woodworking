import type React from 'react';
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
 <div className="flex min-h-screen flex-col overflow-x-clip bg-stone-50 dark:bg-stone-950 ">
 <Header logoSrc={logoSrc} />
 <main className="flex-grow">
 <Outlet />
 </main>
 <Footer />
 </div>
 );
};
