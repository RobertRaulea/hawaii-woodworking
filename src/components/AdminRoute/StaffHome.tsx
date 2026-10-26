import { Navigate } from 'react-router-dom';
import { useStaffAccess } from '../../hooks/useStaffAccess';

export const StaffHome: React.FC = () => {
 const { isLoading, homePath } = useStaffAccess();

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-20">
 <p className="text-stone-500 dark:text-stone-400 ">Se încarcă...</p>
 </div>
 );
 }

 return <Navigate to={homePath ?? '/'} replace />;
};
