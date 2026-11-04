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
 <h1 className="text-2xl md:text-3xl font-medium font-serif text-stone-900 dark:text-stone-50 mb-6">
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
 rootBox: 'mx-auto w-full max-w-md',
 card: 'shadow-soft rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-50',
 headerTitle: 'font-serif text-stone-900 dark:text-stone-50',
 headerSubtitle: 'text-stone-500 dark:text-stone-400',
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
 </main>
 );
};
