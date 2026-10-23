import { useEffect, useRef } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { useUser } from '@clerk/clerk-react';
import { api } from '../../../convex/_generated/api';
import { useStaffAccess } from '../../hooks/useStaffAccess';
import type { Permission } from '../../../convex/lib/permissions';

interface AdminRouteProps {
  permission?: Permission;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ permission }) => {
  const { isLoading, isAuthenticated, role, userId, homePath, can } =
    useStaffAccess();
  const location = useLocation();
  const register = useMutation(api.staff.register);
  const { user } = useUser();
  const registeredFor = useRef<string | null>(null);
  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.fullName ?? undefined;

  // Records the signed-in staff member once so admin screens can show
  // their email instead of the Clerk user id.
  useEffect(() => {
    if (!userId || registeredFor.current === userId) return;
    registeredFor.current = userId;
    void register({ email, name }).catch(() => {
      registeredFor.current = null;
    });
  }, [userId, email, name, register]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-stone-500">Se încarcă...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!role) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
        <p className="text-red-600 font-medium">Acces intern indisponibil</p>
        <p className="text-stone-500 text-sm">
          Contul tău nu are un rol intern.
        </p>
        <Link to="/" className="text-sm font-semibold text-amber-800 underline">
          Înapoi la magazin
        </Link>
      </div>
    );
  }

  if (permission && !can(permission)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
        <p className="text-red-600 font-medium">Acces intern indisponibil</p>
        <p className="text-stone-500 text-sm">
          Rolul tău nu are acces la această secțiune.
        </p>
        <Link
          to={homePath ?? '/admin'}
          className="text-sm font-semibold text-amber-800 underline"
        >
          Înapoi la panoul tău
        </Link>
      </div>
    );
  }

  return <Outlet />;
};
