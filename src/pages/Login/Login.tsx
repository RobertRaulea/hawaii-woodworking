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
      <h1 className="font-serif text-2xl font-medium text-stone-900 mb-2 text-center">
        Conectează-te la contul tău
      </h1>
      <p className="text-stone-500 text-sm mb-10 text-center">
        Folosește contul tău existent pentru a finaliza comanda mai rapid.
      </p>

      <div className="flex justify-center">
        <SignIn
          routing="hash"
          afterSignInUrl="/shipping"
          appearance={{
            elements: {
              rootBox: 'mx-auto w-full',
              card: 'shadow-soft rounded-lg border border-stone-200',
              headerTitle: 'font-serif text-stone-900',
              headerSubtitle: 'text-stone-500',
              socialButtonsBlockButton:
                'border-stone-200 text-stone-700 hover:bg-stone-50 rounded-md',
              formFieldInput:
                'border-stone-300 focus:ring-amber-500/40 focus:border-amber-500 rounded-md',
              formButtonPrimary:
                'bg-stone-900 hover:bg-stone-800 text-white rounded-md',
              footerActionLink: 'text-amber-600 hover:text-amber-700',
            },
          }}
        />
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/shipping"
          className="text-sm text-stone-400 hover:text-stone-600 transition-colors duration-200"
        >
          Continuă fără cont →
        </Link>
      </div>
    </div>
  );
};

export default Login;
