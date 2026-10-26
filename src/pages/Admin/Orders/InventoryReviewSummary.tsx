import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const InventoryReviewSummary = () => {
 const { data, error } = useAdminQuery(api.orders.getInventoryIssues, {});
 if (error)
 return (
 <Alert variant="warning" className="rounded-xl">
 <AlertDescription>
 Verificarea comenzilor cu probleme de stoc nu este disponibilă.
 Verifică sincronizarea backendului.
 </AlertDescription>
 </Alert>
 );
 if (!data?.length) return null;
 return (
 <section aria-label="Plăți online cu stoc de verificat">
 <Alert variant="warning" className="rounded-xl">
 <AlertTriangle className="h-6 w-6" />
 <AlertTitle>
 {data.length} comenzi plătite au stoc de verificat
 </AlertTitle>
 <AlertDescription className="mt-1">
 Plata este confirmată. Verifică inventarul înainte de expediere; nu
 solicita o nouă plată.
 </AlertDescription>
 <ul className="mt-3 space-y-2 text-sm">
 {data.slice(0, 5).map((issue) => (
 <li key={issue.orderId}>
 <Link
 to={`/admin/orders/${issue.orderId}`}
 className="font-medium underline underline-offset-4"
 >
 Comanda #{issue.orderId.slice(-8).toUpperCase()}
 </Link>
 <span className="ml-2">{issue.error}</span>
 </li>
 ))}
 </ul>
 {data.length > 5 ? (
 <Link
 to="/admin/orders"
 className="mt-3 inline-block text-sm underline"
 >
 Vezi toate comenzile
 </Link>
 ) : null}
 </Alert>
 </section>
 );
};
