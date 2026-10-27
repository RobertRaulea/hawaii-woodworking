import { FlaskConical } from 'lucide-react';
import type { EnvironmentName } from '../../../shared/environment';

interface EnvironmentBannerProps {
 environment?: EnvironmentName;
}

export const EnvironmentBanner = ({
 environment = import.meta.env?.VITE_APP_ENV,
}: EnvironmentBannerProps) => {
 if (environment !== 'test') return null;

 return (
 <aside aria-label="Mediu de test" className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
 <div className="mx-auto flex max-w-7xl flex-col gap-1 text-xs md:flex-row md:items-center md:justify-between lg:px-4">
 <p className="flex items-center gap-2">
 <FlaskConical aria-hidden="true" className="size-4 shrink-0" />
 <strong className="tracking-wider">TEST</strong>
 <span>Plati simulate. Nu se incaseaza bani si nu se livreaza produse.</span>
 </p>
 <p>Card Stripe: <span className="font-mono">4242 4242 4242 4242</span> | expirare viitoare | CVC 123</p>
 </div>
 </aside>
 );
};
