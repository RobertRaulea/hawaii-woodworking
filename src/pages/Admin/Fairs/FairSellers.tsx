import { useMutation } from 'convex/react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { useStaffDirectory } from '../../../hooks/useStaffDirectory';
import { SearchableSelect } from '../../../components/SearchableSelect/SearchableSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { inventoryError } from '../../../utils/inventory.utils';

interface FairSellersProps {
 fairId: Id<'fairs'>;
}

const SellerEmailForm = ({ userId }: { userId: string }) => {
 const save = useMutation(api.staff.setDirectoryEntry);
 const {
 register,
 handleSubmit,
 reset,
 setError,
 formState: { errors, isSubmitting },
 } = useForm<{ email: string }>({ defaultValues: { email: '' } });

 const submit = handleSubmit(async ({ email }) => {
 try {
 await save({ userId, email: email.trim(), role: 'seller' });
 reset();
 } catch (cause) {
 setError('email', { message: inventoryError(cause) });
 }
 });

 return (
 <form onSubmit={submit} className="mt-2">
 <div className="flex gap-2">
 <Input
 type="email"
 disabled={isSubmitting}
 placeholder="email@exemplu.ro"
 aria-label={`Email pentru ${userId}`}
 className="min-h-11 flex-1 rounded-lg px-3"
 {...register('email', {
 validate: (value) =>
 /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ||
 'Introdu o adresă de email validă.',
 })}
 />
 <Button
 variant="outline"
 disabled={isSubmitting}
 className="min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold"
 >
 Setează email
 </Button>
 </div>
 {errors.email ? (
 <p role="alert" className="mt-1 text-sm text-red-700 dark:text-red-400 ">
 {errors.email.message}
 </p>
 ) : null}
 </form>
 );
};

export const FairSellers = ({ fairId }: FairSellersProps) => {
 const userLabel = useStaffDirectory();
 const { data: sellers } = useAdminQuery(api.staff.listFairSellers, {
 fairId,
 });
 const { data: allSellers } = useAdminQuery(api.staff.sellers, {});
 const assignable = useMemo(
 () =>
 (allSellers ?? [])
 .filter(
 (seller) =>
 !(sellers ?? []).some(
 (assigned) => assigned.userId === seller.userId,
 ),
 )
 .map((seller) => seller.email),
 [allSellers, sellers],
 );
 const assign = useMutation(api.staff.assignFairSeller);
 const unassign = useMutation(api.staff.unassignFairSeller);
 const {
 register,
 handleSubmit,
 reset,
 setValue,
 clearErrors,
 watch,
 setError,
 formState: { errors, isSubmitting },
 } = useForm<{ userId: string }>({ defaultValues: { userId: '' } });
 const selectedSeller = watch('userId');

 const submit = handleSubmit(async ({ userId }) => {
 try {
 await assign({ fairId, userId: userId.trim() });
 reset();
 } catch (cause) {
 setError('userId', { message: inventoryError(cause) });
 }
 });

 return (
 <div className="mt-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800 p-4">
 <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 ">
 Vânzători alocați
 </h3>
 {sellers === undefined ? (
 <p role="status" className="mt-2 text-sm text-stone-500 dark:text-stone-400 ">
 Se încarcă alocările...
 </p>
 ) : sellers.length === 0 ? (
 <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 ">
 Niciun vânzător alocat acestui târg.
 </p>
 ) : (
 <ul className="mt-2 space-y-2">
 {sellers.map((seller) => (
 <li
 key={seller.userId}
 className="rounded-lg bg-white dark:bg-stone-900 px-3 py-2"
 >
 <div className="flex items-center justify-between gap-3">
 <span className="truncate font-mono text-xs text-stone-700 dark:text-stone-300 ">
 {userLabel(seller.userId)}
 </span>
 <Button
 type="button"
 variant="ghost"
 aria-label={`Elimină ${userLabel(seller.userId)}`}
 onClick={() => {
 void unassign({ fairId, userId: seller.userId });
 }}
 className="min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-400"
 >
 Elimină
 </Button>
 </div>
 {seller.userId && userLabel(seller.userId) === seller.userId ? (
 <SellerEmailForm userId={seller.userId} />
 ) : null}
 </li>
 ))}
 </ul>
 )}
 <form onSubmit={submit} className="mt-3">
 <div className="flex items-start gap-2">
 <div className="flex-1">
 <SearchableSelect
 label="Vânzător"
 id={`seller-id-${fairId}`}
 options={assignable}
 value={selectedSeller}
 disabled={isSubmitting}
 placeholder="Alege vânzătorul"
 error={errors.userId?.message}
 onChange={(email) => {
 setValue('userId', email);
 clearErrors('userId');
 }}
 />
 </div>
 <Button
 variant="secondary"
 disabled={isSubmitting}
 className="mt-7 min-h-11 shrink-0 rounded-lg px-4 text-sm font-semibold"
 >
 Alocă
 </Button>
 </div>
 <input
 type="hidden"
 {...register('userId', {
 validate: (userId) =>
 Boolean(userId.trim()) || 'Alege un vânzător.',
 })}
 />
 {allSellers !== undefined && assignable.length === 0 ? (
 <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 ">
 Nu apare vânzătorul?{' '}
 <Link
 to="/admin/staff"
 className="font-semibold text-amber-800 dark:text-amber-300 underline"
 >
 Adaugă-l în Echipă
 </Link>{' '}
 sau așteaptă să se conecteze în zona de administrare.
 </p>
 ) : null}
 </form>
 </div>
 );
};
