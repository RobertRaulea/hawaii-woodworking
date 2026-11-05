import type React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WoodenLoginReveal } from '@/components/WoodenLoginReveal/WoodenLoginReveal';
import { signInElements } from '@/utils/clerkAppearance.utils';
import { useStaffAccess } from '../../hooks/useStaffAccess';

export const AdminLogin: React.FC = () => {
 const { isLoading, isAuthenticated, role, homePath } = useStaffAccess();

 if (isLoading) {
 return (
 <main className="flex items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-800 ">
 <p className="text-muted-foreground">Se încarcă...</p>
 </main>
 );
 }

 if (isAuthenticated && role && homePath) {
 return <Navigate to={homePath} replace />;
 }

 return (
 <main className="flex flex-col items-center justify-center min-h-screen bg-stone-50 dark:bg-stone-800 px-4">
 <h1 className="text-2xl md:text-3xl font-medium font-serif text-foreground mb-6">
 Autentificare personal
 </h1>

 {isAuthenticated && !role && (
 <Alert variant="destructive" className="mb-4 max-w-sm">
 <AlertDescription className="text-center">
 Contul tău nu are un rol intern. Autentifică-te cu un cont de personal.
 </AlertDescription>
 </Alert>
 )}

 <WoodenLoginReveal className="w-fit max-w-full mx-auto">
 <SignIn
 routing="hash"
 afterSignInUrl="/admin"
 appearance={{
 elements: {
 ...signInElements,
 rootBox: 'mx-auto w-full max-w-md',
 },
 }}
 />
 </WoodenLoginReveal>
 </main>
 );
};
