import type React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { useStaffAccess } from '../../hooks/useStaffAccess';

export const AdminLogin: React.FC = () => {
  const { isLoading, isAuthenticated, role, homePath } = useStaffAccess();

  if (isLoading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-stone-50">
        <p className="text-stone-500">Se încarcă...</p>
      </main>
    );
  }

  if (isAuthenticated && role && homePath) {
    return <Navigate to={homePath} replace />;
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-stone-50 px-4">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">
        Autentificare personal
      </h1>

      {isAuthenticated && !role && (
        <p className="mb-4 text-sm text-red-600 max-w-sm text-center">
          Contul tău nu are un rol intern. Autentifică-te cu un cont de personal.
        </p>
      )}

      <SignIn
        routing="hash"
        afterSignInUrl="/admin"
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-lg',
          },
        }}
      />
    </main>
  );
};
