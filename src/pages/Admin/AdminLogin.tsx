import type React from 'react';
import { SignIn, useAuth } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '../../hooks/useAdmin';

export const AdminLogin: React.FC = () => {
  const { isSignedIn } = useAuth();
  const { isAdmin, isLoaded } = useAdmin();

  if (isLoaded && isSignedIn && isAdmin) {
    return <Navigate to="/admin/products" replace />;
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-stone-50 px-4">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Admin Login</h1>

      {isLoaded && isSignedIn && !isAdmin && (
        <p className="mb-4 text-sm text-red-600 max-w-sm text-center">
          Your account does not have admin access. Please sign in with an admin account.
        </p>
      )}

      <SignIn
        routing="hash"
        afterSignInUrl="/admin/products"
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
