import type React from 'react';
import { SignIn, useAuth } from '@clerk/clerk-react';
import { Navigate, Link } from 'react-router-dom';

export const Login: React.FC = () => {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Navigate to="/shipping" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <h1 className="text-2xl font-bold text-stone-900 mb-2 text-center">
        Conectează-te la contul tău
      </h1>
      <p className="text-stone-500 text-sm mb-8 text-center">
        Folosește contul tău existent pentru a finaliza comanda mai rapid.
      </p>

      <div className="flex justify-center">
        <SignIn
          routing="hash"
          afterSignInUrl="/shipping"
          appearance={{
            elements: {
              rootBox: 'mx-auto w-full',
              card: 'shadow-lg rounded-xl border border-stone-200',
              headerTitle: 'text-stone-900',
              headerSubtitle: 'text-stone-500',
              socialButtonsBlockButton:
                'border-stone-300 text-stone-700 hover:bg-stone-50',
              formFieldInput:
                'border-stone-300 focus:ring-amber-500 focus:border-amber-500',
              formButtonPrimary:
                'bg-amber-600 hover:bg-amber-700 text-white',
              footerActionLink: 'text-amber-600 hover:text-amber-700',
            },
          }}
        />
      </div>

      <div className="mt-6 text-center">
        <Link
          to="/shipping"
          className="text-sm text-stone-500 hover:text-stone-700 underline transition-colors"
        >
          Continuă fără cont →
        </Link>
      </div>
    </div>
  );
};

export default Login;
