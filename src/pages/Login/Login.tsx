import type React from 'react';
import { SignIn, useAuth } from '@clerk/clerk-react';
import { Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WoodenLoginReveal } from '@/components/WoodenLoginReveal/WoodenLoginReveal';
import { signInAppearance } from '@/utils/clerkAppearance.utils';

export const Login: React.FC = () => {
 const { isSignedIn } = useAuth();
 const { t, i18n } = useTranslation();
 const language = i18n.resolvedLanguage?.split('-')[0] ?? i18n.language?.split('-')[0];
 const copy = {
 ro: {
 title: 'Conectează-te la contul tău',
 subtitle: 'Folosește contul tău existent pentru a finaliza comanda mai rapid.',
 continueWithout: 'Continuă fără cont →',
 },
 en: {
 title: 'Sign in to your account',
 subtitle: 'Use your existing account to check out faster.',
 continueWithout: 'Continue without an account →',
 },
 de: {
 title: 'Melde dich bei deinem Konto an',
 subtitle: 'Nutze dein bestehendes Konto, um schneller zu bezahlen.',
 continueWithout: 'Ohne Konto fortfahren →',
 },
 }[language === 'en' || language === 'de' ? language : 'ro'];

 if (isSignedIn) {
 return <Navigate to="/shipping" replace />;
 }

 return (
 <div className="max-w-md mx-auto px-6 py-16 lg:py-20">
 <h1 className="font-serif text-2xl font-medium text-foreground mb-2 text-center">
 {t('login.title', { defaultValue: copy.title })}
 </h1>
 <p className="text-muted-foreground text-sm mb-10 text-center">
 {t('login.subtitle', { defaultValue: copy.subtitle })}
 </p>

 <div className="flex justify-center">
 <WoodenLoginReveal className="w-fit max-w-full mx-auto">
 <SignIn
 routing="hash"
 afterSignInUrl="/shipping"
 appearance={signInAppearance}
 />
 </WoodenLoginReveal>
 </div>

 <div className="mt-8 text-center">
 <Link
 to="/shipping"
 className="text-sm text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors duration-200"
 >
 {t('login.continueWithout', { defaultValue: copy.continueWithout })}
 </Link>
 </div>
 </div>
 );
};

export default Login;
