import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useConvexAuth } from 'convex/react';
import { useAdmin } from '../../hooks/useAdmin';

export const AdminRoute: React.FC = () => {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { isAdmin, isLoaded: isAdminLoaded } = useAdmin();
  const location = useLocation();

  if (isLoading || !isAdminLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-stone-500">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600 font-medium">Access denied — admin role required.</p>
        <p className="text-stone-500 text-sm">
          Make sure your Clerk user has <code className="bg-stone-100 px-1 rounded">{"{ \"role\": \"admin\" }"}</code> in Public Metadata.
        </p>
      </div>
    );
  }

  return <Outlet />;
};
