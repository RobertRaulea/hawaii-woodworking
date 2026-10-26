import { useMutation } from 'convex/react';
import { useForm } from 'react-hook-form';
import { api } from '../../../../convex/_generated/api';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { inventoryError } from '../../../utils/inventory.utils';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface StaffFormValues {
 userId: string;
 email: string;
 name: string;
 role: string;
}

const ROLE_LABELS: Record<string, string> = {
 admin: 'Administrator',
 seller: 'Vânzător',
 atelier: 'Atelier',
};

const formatDate = (timestamp: number): string =>
 new Date(timestamp).toLocaleDateString('ro-RO', {
 day: '2-digit',
 month: '2-digit',
 year: 'numeric',
 });

export const AdminStaff = () => {
 const { data: entries } = useAdminQuery(api.staff.directory, {});
 const save = useMutation(api.staff.setDirectoryEntry);
 const {
 register,
 handleSubmit,
 reset,
 setError,
 formState: { errors, isSubmitting },
 } = useForm<StaffFormValues>({
 defaultValues: { userId: '', email: '', name: '', role: '' },
 });

 const submit = handleSubmit(async (values) => {
 try {
 await save({
 userId: values.userId.trim(),
 email: values.email.trim(),
 name: values.name.trim() || undefined,
 role: values.role || undefined,
 });
 reset();
 } catch (cause) {
 setError('email', { message: inventoryError(cause) });
 }
 });

 return (
 <div className="mx-auto max-w-3xl p-4 md:p-6">
 <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50 ">Echipă</h1>
 <p className="mt-1 text-sm text-stone-500 dark:text-stone-400 ">
 Emailurile apar automat când fiecare membru staff intră în zona de
 administrare. Pentru conturile care nu s-au conectat încă, asociază
 manual ID-ul Clerk cu adresa de email.
 </p>

 <section
 aria-labelledby="staff-directory-heading"
 className="mt-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4"
 >
 <h2
 id="staff-directory-heading"
 className="text-sm font-semibold text-stone-800 dark:text-stone-100 "
 >
 Membri cunoscuți
 </h2>
 {entries === undefined ? (
 <p role="status" className="mt-2 text-sm text-stone-500 dark:text-stone-400 ">
 Se încarcă echipa...
 </p>
 ) : entries.length === 0 ? (
 <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 ">
 Niciun membru staff înregistrat încă.
 </p>
 ) : (
 <ul className="mt-2 divide-y divide-stone-100 dark:divide-stone-800 ">
 {entries.map((entry) => (
 <li
 key={entry.userId}
 className="flex flex-col gap-0.5 py-2 md:flex-row md:items-center md:justify-between"
 >
 <div className="min-w-0">
 <p className="truncate text-sm font-medium text-stone-800 dark:text-stone-100 ">
 {entry.name ?? entry.email}
 {entry.role ? (
 <Badge variant="soft" className="ml-2 align-middle">
 {ROLE_LABELS[entry.role] ?? entry.role}
 </Badge>
 ) : null}
 </p>
 <p className="truncate font-mono text-xs text-stone-500 dark:text-stone-400 ">
 {entry.userId}
 </p>
 </div>
 <div className="shrink-0 text-xs text-stone-500 dark:text-stone-400md:text-right">
 <p className="truncate text-sm text-stone-700 dark:text-stone-300 ">
 {entry.email}
 </p>
 <p>Actualizat {formatDate(entry.updatedAt)}</p>
 </div>
 </li>
 ))}
 </ul>
 )}
 </section>

 <section
 aria-labelledby="staff-add-heading"
 className="mt-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800 p-4"
 >
 <h2
 id="staff-add-heading"
 className="text-sm font-semibold text-stone-800 dark:text-stone-100 "
 >
 Asociază un ID Clerk cu un email
 </h2>
 <form onSubmit={submit} className="mt-3 space-y-3">
 <div>
 <Label
 htmlFor="staff-user-id"
 className="block text-xs font-medium text-stone-600 dark:text-stone-300 "
 >
 ID utilizator Clerk
 </Label>
 <Input
 id="staff-user-id"
 disabled={isSubmitting}
 placeholder="user_…"
 className="mt-1 min-h-11 h-auto w-full rounded-lg border-stone-300 dark:border-stone-700 px-3 font-mono text-sm"
 {...register('userId', {
 validate: (value) =>
 /^user_[A-Za-z0-9]{1,100}$/.test(value.trim()) ||
 'Introdu un ID Clerk valid (user_…).',
 })}
 />
 {errors.userId ? (
 <Alert variant="destructive" className="mt-1 border-0 bg-transparent p-0 text-sm text-red-700 dark:text-red-400 ">
 {errors.userId.message}
 </Alert>
 ) : null}
 </div>
 <div>
 <Label
 htmlFor="staff-email"
 className="block text-xs font-medium text-stone-600 dark:text-stone-300 "
 >
 Email
 </Label>
 <Input
 id="staff-email"
 type="email"
 disabled={isSubmitting}
 placeholder="email@exemplu.ro"
 className="mt-1 min-h-11 h-auto w-full rounded-lg border-stone-300 dark:border-stone-700 px-3 text-sm"
 {...register('email', {
 validate: (value) =>
 /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ||
 'Introdu o adresă de email validă.',
 })}
 />
 {errors.email ? (
 <Alert variant="destructive" className="mt-1 border-0 bg-transparent p-0 text-sm text-red-700 dark:text-red-400 ">
 {errors.email.message}
 </Alert>
 ) : null}
 </div>
 <div>
 <Label
 htmlFor="staff-name"
 className="block text-xs font-medium text-stone-600 dark:text-stone-300 "
 >
 Nume (opțional)
 </Label>
 <Input
 id="staff-name"
 disabled={isSubmitting}
 className="mt-1 min-h-11 h-auto w-full rounded-lg border-stone-300 dark:border-stone-700 px-3 text-sm"
 {...register('name')}
 />
 </div>
 <div>
 <Label
 htmlFor="staff-role"
 className="block text-xs font-medium text-stone-600 dark:text-stone-300 "
 >
 Rol (opțional)
 </Label>
 <select
 id="staff-role"
 disabled={isSubmitting}
 className="mt-1 min-h-11 w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 text-sm"
 {...register('role')}
 >
 <option value="">—</option>
 <option value="seller">Vânzător</option>
 <option value="atelier">Atelier</option>
 <option value="admin">Administrator</option>
 </select>
 </div>
 <Button
 disabled={isSubmitting}
 className="min-h-11 h-auto rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white disabled:opacity-40"
 >
 Salvează
 </Button>
 </form>
 </section>
 </div>
 );
};
