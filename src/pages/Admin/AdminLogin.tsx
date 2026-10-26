import type React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStaffAccess } from '../../hooks/useStaffAccess';

export const AdminLogin: React.FC = () => {
 const { isLoading, isAuthenticated, role, homePath } = useStaffAccess();

 if (isLoading) {
 return (
 <main className="flex items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-800 ">
 <p className="text-stone-500 dark:text-stone-400 ">Se încarcă...</p>
 </main>
 );
 }

 if (isAuthenticated && role && homePath) {
 return <Navigate to={homePath} replace />;
 }

 return (
 <main className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-800 px-4">
 <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50 mb-6">
 Autentificare personal
 </h1>

 {isAuthenticated && !role && (
 <Alert variant="destructive" className="mb-4 max-w-sm">
 <AlertDescription className="text-center">
 Contul tău nu are un rol intern. Autentifică-te cu un cont de personal.
 </AlertDescription>
 </Alert>
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
