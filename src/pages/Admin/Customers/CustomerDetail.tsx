import type React from 'react';
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { ArrowLeft, Eye, ExternalLink, Edit, Trash2, X, Save } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { customerSpend } from '../../../../convex/lib/orders.utils';
import {
 AlertDialog,
 AlertDialogAction,
 AlertDialogCancel,
 AlertDialogContent,
 AlertDialogDescription,
 AlertDialogFooter,
 AlertDialogHeader,
 AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
 Dialog,
 DialogClose,
 DialogContent,
 DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';

type OrderStatus =
 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

const STATUS_BADGES: Record<
 OrderStatus,
 'yellow' | 'success' | 'blue' | 'emerald' | 'destructive' | 'stone'
> = {
 pending: 'yellow',
 paid: 'success',
 shipped: 'blue',
 delivered: 'emerald',
 cancelled: 'destructive',
 returned: 'stone',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
 pending: 'În așteptare',
 paid: 'Plătită',
 shipped: 'Expediată',
 delivered: 'Livrată',
 cancelled: 'Anulată',
 returned: 'Returnată',
};

const formatDate = (timestamp: number): string => {
 return new Date(timestamp).toLocaleDateString('ro-RO', {
 day: '2-digit',
 month: '2-digit',
 year: 'numeric',
 hour: '2-digit',
 minute: '2-digit',
 });
};

const formatPrice = (price: number): string => `${price.toFixed(2)} RON`;

interface AddressDisplayProps {
 label: string;
 address: {
 street: string;
 city: string;
 county: string;
 postalCode: string;
 country: string;
 };
}

const AddressDisplay: React.FC<AddressDisplayProps> = ({ label, address }) => (
 <div>
 <h4 className="text-sm font-medium text-muted-foreground mb-1">{label}</h4>
 <p className="text-sm text-foreground">{address.street}</p>
 <p className="text-sm text-foreground">
 {address.city}, {address.county} {address.postalCode}
 </p>
 <p className="text-sm text-foreground">{address.country}</p>
 </div>
);

interface EditFormData {
 email: string;
 phone: string;
 firstName: string;
 lastName: string;
 shippingAddress: {
 street: string;
 city: string;
 county: string;
 postalCode: string;
 country: string;
 };
 billingAddress: {
 street: string;
 city: string;
 county: string;
 postalCode: string;
 country: string;
 };
 newsletter: boolean;
}

export const CustomerDetail: React.FC = () => {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const [isEditing, setIsEditing] = useState(false);
 const [showDeleteModal, setShowDeleteModal] = useState(false);
 const [editForm, setEditForm] = useState<EditFormData | null>(null);
 const [error, setError] = useState<string | null>(null);
 
 const customer = useQuery(
 api.customers.getById,
 id ? { customerId: id as Id<'customers'> } : 'skip'
 );
 
 const updateCustomer = useMutation(api.customers.updateCustomer);
 const deleteCustomer = useMutation(api.customers.deleteCustomer);

 if (customer === undefined) {
 return (
 <div className="flex items-center justify-center py-20">
 <p className="text-muted-foreground">Se încarcă clientul...</p>
 </div>
 );
 }

 if (customer === null) {
 return (
 <div className="text-center py-20">
 <p className="text-muted-foreground mb-4">Clientul nu a fost găsit.</p>
 <Link
 to="/admin/customers"
 className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-400 font-medium text-sm"
 >
 ← Înapoi la clienți
 </Link>
 </div>
 );
 }

 const handleEdit = () => {
 setEditForm({
 email: customer.email,
 phone: customer.phone ?? '',
 firstName: customer.firstName,
 lastName: customer.lastName,
 shippingAddress: { ...customer.shippingAddress },
 billingAddress: { ...customer.billingAddress },
 newsletter: customer.newsletter,
 });
 setIsEditing(true);
 setError(null);
 };

 const handleSave = async () => {
 if (!editForm) return;
 try {
 setError(null);
 await updateCustomer({
 customerId: customer._id,
 email: editForm.email,
 phone: editForm.phone.trim() || undefined,
 firstName: editForm.firstName,
 lastName: editForm.lastName,
 shippingAddress: editForm.shippingAddress,
 billingAddress: editForm.billingAddress,
 newsletter: editForm.newsletter,
 });
 setIsEditing(false);
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Actualizarea clientului a eșuat.');
 }
 };

 const handleDelete = async () => {
 try {
 setError(null);
 await deleteCustomer({ customerId: customer._id });
 navigate('/admin/customers');
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Ștergerea clientului a eșuat.');
 setShowDeleteModal(false);
 }
 };

 const totalSpent = customerSpend(customer.orders);

 return (
 <section className="max-w-4xl space-y-6">
 {/* Header */}
 <div>
 <Link
 to="/admin/customers"
 className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-stone-700 dark:hover:text-stone-300 mb-2 transition-colors"
 >
 <ArrowLeft className="size-4" />
 Înapoi la clienți
 </Link>
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
 <div>
 <h1 className="text-2xl md:text-3xl font-medium font-serif text-foreground">
 {customer.firstName} {customer.lastName}
 </h1>
 <p className="text-sm text-muted-foreground mt-1">{customer.email}</p>
 </div>
 <div className="flex items-center gap-2">
 <Badge
 variant="soft"
 className={`px-3 py-1 text-sm font-medium ${
 customer.isRegistered ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 ' : ''
 }`}
 >
 {customer.isRegistered ? 'Înregistrat' : 'Vizitator'}
 </Badge>
 <Button
 variant="outline"
 onClick={handleEdit}
 className="gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium"
 >
 <Edit className="size-4" />
 Editează
 </Button>
 <Button
 variant="outline"
 onClick={() => setShowDeleteModal(true)}
 className="gap-1.5 rounded-md border-red-300 dark:border-red-700 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-400"
 >
 <Trash2 className="size-4" />
 Șterge
 </Button>
 </div>
 </div>
 {error && (
 <Alert variant="destructive" className="mt-3">
 <AlertDescription>{error}</AlertDescription>
 </Alert>
 )}
 </div>

 {/* Customer Info */}
 <Card className="rounded-lg">
 <CardContent className="p-5">
 <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">Informații client</h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div>
 <h4 className="text-sm font-medium text-muted-foreground mb-1">Client din</h4>
 <p className="text-sm text-foreground">{formatDate(customer.createdAt)}</p>
 </div>
 <div>
 <h4 className="text-sm font-medium text-muted-foreground mb-1">Telefon</h4>
 <p className="text-sm text-foreground">{customer.phone || '—'}</p>
 </div>
 <div>
 <h4 className="text-sm font-medium text-muted-foreground mb-1">Newsletter</h4>
 <p className="text-sm text-foreground">
 {customer.newsletter ? 'Abonat' : 'Neabonat'}
 {customer.newsletter && customer.newsletterConsentAt
 ? ` (din ${formatDate(customer.newsletterConsentAt)})`
 : ''}
 </p>
 </div>
 <AddressDisplay label="Adresă de livrare" address={customer.shippingAddress} />
 <AddressDisplay label="Adresă de facturare" address={customer.billingAddress} />
 {customer.stripeCustomerId && (
 <div>
 <h4 className="text-sm font-medium text-muted-foreground mb-1">Stripe Customer</h4>
 <a
 href={`https://dashboard.stripe.com/test/customers/${customer.stripeCustomerId}`}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-400 font-mono"
 >
 {customer.stripeCustomerId}
 <ExternalLink className="h-3.5 w-3.5" />
 </a>
 </div>
 )}
 {customer.clerkUserId && (
 <div>
 <h4 className="text-sm font-medium text-muted-foreground mb-1">ID utilizator Clerk</h4>
 <p className="text-sm font-mono text-stone-700 dark:text-stone-300 ">{customer.clerkUserId}</p>
 </div>
 )}
 </div>
 </CardContent>
 </Card>

 {/* Summary */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <Card className="rounded-lg">
 <CardContent className="p-5">
 <p className="text-sm text-muted-foreground mb-1">Total comenzi</p>
 <p className="text-2xl font-bold text-foreground">{customer.orders.length}</p>
 </CardContent>
 </Card>
 <Card className="rounded-lg">
 <CardContent className="p-5">
 <p className="text-sm text-muted-foreground mb-1">Total cheltuit</p>
 <p className="text-2xl font-bold text-foreground">{formatPrice(totalSpent)}</p>
 </CardContent>
 </Card>
 </div>

 {/* Order History */}
 <Card className="rounded-lg">
 <CardContent className="p-5">
 <h3 className="text-lg font-semibold text-stone-800 dark:text-stone-100 mb-4">Istoric comenzi</h3>
 {customer.orders.length === 0 ? (
 <p className="text-muted-foreground text-sm">Nicio comandă încă.</p>
 ) : (
 <div className="overflow-x-auto">
 <Table className="w-full text-sm">
 <TableHeader>
 <TableRow>
 <TableHead className="pb-2 text-left font-medium text-stone-600 dark:text-stone-300 ">Comandă</TableHead>
 <TableHead className="pb-2 text-right font-medium text-stone-600 dark:text-stone-300 ">Total</TableHead>
 <TableHead className="pb-2 text-center font-medium text-stone-600 dark:text-stone-300 ">Stare</TableHead>
 <TableHead className="pb-2 text-left font-medium text-stone-600 dark:text-stone-300 hidden md:table-cell">Data</TableHead>
 <TableHead className="pb-2 text-right font-medium text-stone-600 dark:text-stone-300 ">Acțiuni</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {customer.orders.map((order: { _id: string; total: number; status: string; createdAt: number }) => (
 <TableRow
 key={order._id}
 className="last:border-b-0 hover:bg-transparent"
 >
 <TableCell className="py-3 font-mono text-xs text-muted-foreground">
 {order._id.slice(-8).toUpperCase()}
 </TableCell>
 <TableCell className="py-3 text-right text-stone-700 dark:text-stone-300 ">
 {formatPrice(order.total)}
 </TableCell>
 <TableCell className="py-3 text-center">
 <Badge
 variant={STATUS_BADGES[order.status as OrderStatus]}
 >
 {STATUS_LABELS[order.status as OrderStatus]}
 </Badge>
 </TableCell>
 <TableCell className="py-3 text-muted-foreground hidden md:table-cell">
 {formatDate(order.createdAt)}
 </TableCell>
 <TableCell className="py-3 text-right">
 <Button
 asChild
 variant="ghost"
 size="sm"
 className="gap-1 px-2.5 text-xs font-medium"
 >
 <Link to={`/admin/orders/${order._id}`}>
 <Eye className="h-3.5 w-3.5" />
 Vezi
 </Link>
 </Button>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 )}
 </CardContent>
 </Card>

 {/* Edit Modal */}
 <Dialog open={isEditing && Boolean(editForm)} onOpenChange={setIsEditing}>
 <DialogContent
 hideClose
 className="max-h-[90vh] max-w-2xl gap-0 overflow-y-auto rounded-lg p-0"
 >
 {editForm ? (
 <>
 <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
 <DialogTitle className="text-xl font-bold text-foreground">
 Editează clientul
 </DialogTitle>
 <DialogClose
 aria-label="Închide"
 className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
 >
 <X className="size-5" />
 </DialogClose>
 </div>
 <div className="p-6 space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div>
 <Label htmlFor="edit-first-name" className="mb-1 block">Prenume</Label>
 <Input
 id="edit-first-name"
 type="text"
 value={editForm.firstName}
 onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
 className="h-auto w-full px-3 py-2"
 />
 </div>
 <div>
 <Label htmlFor="edit-last-name" className="mb-1 block">Nume</Label>
 <Input
 id="edit-last-name"
 type="text"
 value={editForm.lastName}
 onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
 className="h-auto w-full px-3 py-2"
 />
 </div>
 </div>
 <div>
 <Label htmlFor="edit-email" className="mb-1 block">Email</Label>
 <Input
 id="edit-email"
 type="email"
 value={editForm.email}
 onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
 className="h-auto w-full px-3 py-2"
 />
 </div>
 <div>
 <Label htmlFor="edit-phone" className="mb-1 block">Telefon</Label>
 <Input
 id="edit-phone"
 type="tel"
 value={editForm.phone}
 onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
 className="h-auto w-full px-3 py-2"
 />
 </div>
 <div className="flex items-center gap-2">
 <Checkbox
 id="newsletter"
 checked={editForm.newsletter}
 onCheckedChange={(checked) => setEditForm({ ...editForm, newsletter: checked === true })}
 className="size-4"
 />
 <Label htmlFor="newsletter" className="font-normal text-stone-700 dark:text-stone-300 ">Abonare la newsletter</Label>
 </div>
 <div>
 <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-2">Adresă de livrare</h3>
 <div className="space-y-3">
 <Input
 type="text"
 placeholder="Stradă"
 value={editForm.shippingAddress.street}
 onChange={(e) => setEditForm({ ...editForm, shippingAddress: { ...editForm.shippingAddress, street: e.target.value } })}
 className="h-auto w-full px-3 py-2"
 />
 <div className="grid grid-cols-2 gap-3">
 <Input
 type="text"
 placeholder="Oraș"
 value={editForm.shippingAddress.city}
 onChange={(e) => setEditForm({ ...editForm, shippingAddress: { ...editForm.shippingAddress, city: e.target.value } })}
 className="h-auto w-full px-3 py-2"
 />
 <Input
 type="text"
 placeholder="Județ"
 value={editForm.shippingAddress.county}
 onChange={(e) => setEditForm({ ...editForm, shippingAddress: { ...editForm.shippingAddress, county: e.target.value } })}
 className="h-auto w-full px-3 py-2"
 />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <Input
 type="text"
 placeholder="Cod poștal"
 value={editForm.shippingAddress.postalCode}
 onChange={(e) => setEditForm({ ...editForm, shippingAddress: { ...editForm.shippingAddress, postalCode: e.target.value } })}
 className="h-auto w-full px-3 py-2"
 />
 <Input
 type="text"
 placeholder="Țară"
 value={editForm.shippingAddress.country}
 onChange={(e) => setEditForm({ ...editForm, shippingAddress: { ...editForm.shippingAddress, country: e.target.value } })}
 className="h-auto w-full px-3 py-2"
 />
 </div>
 </div>
 </div>
 <div>
 <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-2">Adresă de facturare</h3>
 <div className="space-y-3">
 <Input
 type="text"
 placeholder="Stradă"
 value={editForm.billingAddress.street}
 onChange={(e) => setEditForm({ ...editForm, billingAddress: { ...editForm.billingAddress, street: e.target.value } })}
 className="h-auto w-full px-3 py-2"
 />
 <div className="grid grid-cols-2 gap-3">
 <Input
 type="text"
 placeholder="Oraș"
 value={editForm.billingAddress.city}
 onChange={(e) => setEditForm({ ...editForm, billingAddress: { ...editForm.billingAddress, city: e.target.value } })}
 className="h-auto w-full px-3 py-2"
 />
 <Input
 type="text"
 placeholder="Județ"
 value={editForm.billingAddress.county}
 onChange={(e) => setEditForm({ ...editForm, billingAddress: { ...editForm.billingAddress, county: e.target.value } })}
 className="h-auto w-full px-3 py-2"
 />
 </div>
 <div className="grid grid-cols-2 gap-3">
 <Input
 type="text"
 placeholder="Cod poștal"
 value={editForm.billingAddress.postalCode}
 onChange={(e) => setEditForm({ ...editForm, billingAddress: { ...editForm.billingAddress, postalCode: e.target.value } })}
 className="h-auto w-full px-3 py-2"
 />
 <Input
 type="text"
 placeholder="Țară"
 value={editForm.billingAddress.country}
 onChange={(e) => setEditForm({ ...editForm, billingAddress: { ...editForm.billingAddress, country: e.target.value } })}
 className="h-auto w-full px-3 py-2"
 />
 </div>
 </div>
 </div>
 </div>
 <div className="sticky bottom-0 bg-stone-50 dark:bg-stone-800 border-t border-border px-6 py-4 flex items-center justify-end gap-3">
 <Button
 variant="ghost"
 onClick={() => setIsEditing(false)}
 className="px-4 py-2 text-sm font-medium"
 >
 Anulează
 </Button>
 <Button variant="brand"
 onClick={handleSave}
 className="gap-1.5 rounded-lg"
 >
 <Save className="size-4" />
 Salvează modificările
 </Button>
 </div>
 </>
 ) : null}
 </DialogContent>
 </Dialog>

 {/* Delete Confirmation Modal */}
 <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
 <AlertDialogContent className="max-w-md">
 <div className="flex items-start gap-4">
 <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
 <Trash2 className="size-5 text-red-600 dark:text-red-400 " />
 </div>
 <div className="flex-1">
 <AlertDialogHeader>
 <AlertDialogTitle className="text-lg font-semibold text-foreground">
 Șterge clientul
 </AlertDialogTitle>
 <AlertDialogDescription className="text-stone-600 dark:text-stone-300 ">
 Sigur ștergi clientul {customer.firstName} {customer.lastName}? Acțiunea nu poate fi anulată.
 </AlertDialogDescription>
 </AlertDialogHeader>
 {customer.orders && customer.orders.length > 0 && (
 <Alert variant="warning" className="mb-4 mt-4 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300 ">
 <AlertDescription>
 Acest client are {customer.orders.length} comenzi. Clienții cu comenzi nu pot fi șterși.
 </AlertDescription>
 </Alert>
 )}
 <AlertDialogFooter>
 <AlertDialogCancel className="text-sm font-medium">
 Anulează
 </AlertDialogCancel>
 <AlertDialogAction
 onClick={handleDelete}
 disabled={customer.orders && customer.orders.length > 0}
 className="bg-red-600 text-white hover:bg-red-700 disabled:bg-stone-300 disabled:cursor-not-allowed"
 >
 Șterge
 </AlertDialogAction>
 </AlertDialogFooter>
 </div>
 </div>
 </AlertDialogContent>
 </AlertDialog>
 </section>
 );
};

export default CustomerDetail;
