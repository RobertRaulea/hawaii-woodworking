import type React from 'react';
import { SignIn, useAuth } from '@clerk/clerk-react';
import { Navigate, Link } from 'react-router-dom';

export const Login: React.FC = () => {
 const { isSignedIn } = useAuth();

 if (isSignedIn) {
 return <Navigate to="/shipping" replace />;
 }

 return (
 <div className="max-w-md mx-auto px-6 py-16 lg:py-20">
 <h1 className="font-serif text-2xl font-medium text-stone-900 dark:text-stone-50 mb-2 text-center">
 Conectează-te la contul tău
 </h1>
 <p className="text-stone-500 dark:text-stone-400 text-sm mb-10 text-center">
 Folosește contul tău existent pentru a finaliza comanda mai rapid.
 </p>

 <div className="flex justify-center">
 <SignIn
 routing="hash"
 afterSignInUrl="/shipping"
 appearance={{
 elements: {
 rootBox: 'mx-auto w-full',
 card: 'shadow-soft rounded-lg border border-stone-200 dark:border-stone-800 ',
 headerTitle: 'font-serif text-stone-900 dark:text-stone-50 ',
 headerSubtitle: 'text-stone-500 dark:text-stone-400 ',
 socialButtonsBlockButton:
 'border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-md',
 formFieldInput:
 'border-stone-300 dark:border-stone-700 focus:ring-amber-500/40 focus:border-amber-500 rounded-md',
 formButtonPrimary:
 'bg-stone-900 hover:bg-stone-800 text-white rounded-md dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white',
 footerActionLink: 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-400',
 },
 }}
 />
 </div>

 <div className="mt-8 text-center">
 <Link
 to="/shipping"
 className="text-sm text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300: transition-colors duration-200"
 >
 Continuă fără cont →
 </Link>
 </div>
 </div>
 );
};

export default Login;
