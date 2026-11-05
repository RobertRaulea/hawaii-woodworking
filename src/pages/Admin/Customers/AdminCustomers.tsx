import type React from 'react';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { Users, Eye, Search, Mail, Download, X } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Empty } from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
 Dialog,
 DialogClose,
 DialogContent,
 DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OptionSelect } from '../../../components/OptionSelect';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';

const formatDate = (timestamp: number): string => {
 return new Date(timestamp).toLocaleDateString('ro-RO', {
 day: '2-digit',
 month: '2-digit',
 year: 'numeric',
 });
};

const formatPrice = (price: number): string => `${price.toFixed(2)} RON`;

const csvCell = (value: string | number | undefined | null): string =>
 `"${String(value ?? '').replace(/"/g, '""')}"`;

export const AdminCustomers: React.FC = () => {
 const [search, setSearch] = useState('');
 const [typeFilter, setTypeFilter] = useState<'all' | 'registered' | 'guest'>('all');
 const [newsletterFilter, setNewsletterFilter] = useState<'all' | 'yes' | 'no'>('all');
 const [showNewsletterModal, setShowNewsletterModal] = useState(false);
 const customers = useQuery(api.customers.getAll);
 const newsletterSubscribers = useQuery(api.customers.getNewsletterSubscribers);

 const filtered = useMemo(() => {
 if (!customers) return [];

 let result = customers;

 if (typeFilter === 'registered') {
 result = result.filter((c) => c.isRegistered);
 } else if (typeFilter === 'guest') {
 result = result.filter((c) => !c.isRegistered);
 }

 if (newsletterFilter === 'yes') {
 result = result.filter((c) => c.newsletter);
 } else if (newsletterFilter === 'no') {
 result = result.filter((c) => !c.newsletter);
 }

 if (search.trim()) {
 const q = search.toLowerCase();
 result = result.filter(
 (c) =>
 c.firstName.toLowerCase().includes(q) ||
 c.lastName.toLowerCase().includes(q) ||
 c.email.toLowerCase().includes(q) ||
 (c.phone ?? '').toLowerCase().includes(q) ||
 c.shippingAddress.street.toLowerCase().includes(q) ||
 c.shippingAddress.city.toLowerCase().includes(q) ||
 c.shippingAddress.county.toLowerCase().includes(q)
 );
 }

 return result;
 }, [customers, search, typeFilter, newsletterFilter]);

 if (customers === undefined) {
 return (
 <div className="flex items-center justify-center py-20">
 <p className="text-muted-foreground">Se încarcă clienții...</p>
 </div>
 );
 }

 const registeredCount = customers.filter((c) => c.isRegistered).length;
 const guestCount = customers.filter((c) => !c.isRegistered).length;
 const newsletterCount = customers.filter((c) => c.newsletter).length;

 const handleExportEmails = () => {
 if (!newsletterSubscribers) return;
 const emails = newsletterSubscribers.map((sub) => sub.email).join(', ');
 navigator.clipboard.writeText(emails);
 toast.success(`${newsletterSubscribers.length} adrese de email copiate în clipboard!`);
 };

 const handleDownloadCSV = () => {
 if (!newsletterSubscribers) return;
 const csvContent = [
 ['Email', 'Prenume', 'Nume', 'Telefon', 'Tip', 'Data înscrierii', 'Consimțământ'],
 ...newsletterSubscribers.map((sub) => [
 sub.email,
 sub.firstName,
 sub.lastName,
 sub.phone ?? '',
 sub.isRegistered ? 'Înregistrat' : 'Vizitator',
 new Date(sub.createdAt).toLocaleDateString('ro-RO'),
 sub.newsletterConsentAt
 ? new Date(sub.newsletterConsentAt).toLocaleString('ro-RO')
 : '',
 ]),
 ]
 .map((row) => row.map(csvCell).join(','))
 .join('\r\n');

 const blob = new Blob([csvContent], { type: 'text/csv' });
 const url = window.URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 window.URL.revokeObjectURL(url);
 };

 return (
 <section className="space-y-8">
 <div>
 <h1 className="text-2xl md:text-3xl font-medium font-serif text-foreground mb-4">Clienți</h1>

 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
 <Card className="rounded-lg">
 <CardContent className="p-5">
 <p className="text-sm text-muted-foreground mb-1">Total clienți</p>
 <p className="text-2xl font-bold text-foreground">{customers.length}</p>
 </CardContent>
 </Card>
 <Card className="rounded-lg">
 <CardContent className="p-5">
 <p className="text-sm text-muted-foreground mb-1">Înregistrați</p>
 <p className="text-2xl font-bold text-foreground">{registeredCount}</p>
 </CardContent>
 </Card>
 <Card className="rounded-lg">
 <CardContent className="p-5">
 <p className="text-sm text-muted-foreground mb-1">Vizitatori</p>
 <p className="text-2xl font-bold text-foreground">{guestCount}</p>
 </CardContent>
 </Card>
 <Button
 type="button"
 variant="ghost"
 onClick={() => setShowNewsletterModal(true)}
 className="h-auto w-full flex-col items-start justify-start gap-0 whitespace-normal rounded-lg border border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 dark:from-amber-950 to-amber-100 dark:to-amber-900/40 p-5 text-left hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:shadow-md [&_svg]:size-4"
 >
 <div className="flex w-full items-center justify-between mb-1">
 <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Newsletter</p>
 <Mail className="size-4 text-amber-600 dark:text-amber-400 " />
 </div>
 <p className="text-2xl font-bold text-amber-900 dark:text-amber-300 ">{newsletterCount}</p>
 <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Apasă pentru export</p>
 </Button>
 </div>
 </div>

 {/* Filters */}
 <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
 <div className="relative w-full md:w-80">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400 dark:text-stone-500 " />
 <Input
 type="text"
 placeholder="Caută după nume, email, telefon sau adresă..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="h-auto w-full pl-10 pr-4 py-2"
 />
 </div>
 <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
 <div className="flex items-center gap-2">
 <Label htmlFor="typeFilter">Tip:</Label>
 <OptionSelect
 id="typeFilter"
 value={typeFilter}
 onValueChange={(v) => setTypeFilter(v as 'all' | 'registered' | 'guest')}
 className="min-h-0 rounded-lg px-3 py-1.5"
 options={[
 { value: 'all', label: 'Toți' },
 { value: 'registered', label: 'Înregistrați' },
 { value: 'guest', label: 'Vizitatori' },
 ]}
 />
 </div>
 <div className="flex items-center gap-2">
 <Label htmlFor="newsletterFilter">Newsletter:</Label>
 <OptionSelect
 id="newsletterFilter"
 value={newsletterFilter}
 onValueChange={(v) => setNewsletterFilter(v as 'all' | 'yes' | 'no')}
 className="min-h-0 rounded-lg px-3 py-1.5"
 options={[
 { value: 'all', label: 'Toți' },
 { value: 'yes', label: 'Abonați' },
 { value: 'no', label: 'Neabonați' },
 ]}
 />
 </div>
 </div>
 </div>

 {/* Table */}
 {filtered.length === 0 ? (
 <Empty className="gap-0 flex-initial rounded-lg border border-dashed border-stone-300 dark:border-stone-700 bg-card p-12 text-center">
 <Users className="size-10 text-stone-300 mx-auto mb-3" />
 <p className="text-muted-foreground">Niciun client găsit.</p>
 </Empty>
 ) : (
 <div className="overflow-x-auto rounded-lg border border-border bg-card">
 <Table className="w-full text-sm">
 <TableHeader>
 <TableRow className="bg-stone-50 dark:bg-stone-800 ">
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 ">Nume</TableHead>
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 hidden md:table-cell">Email</TableHead>
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 hidden lg:table-cell">Telefon</TableHead>
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 hidden lg:table-cell">Adresă de livrare</TableHead>
 <TableHead className="px-4 py-3 text-center font-medium text-stone-600 dark:text-stone-300 ">Tip</TableHead>
 <TableHead className="px-4 py-3 text-center font-medium text-stone-600 dark:text-stone-300 hidden md:table-cell">Newsletter</TableHead>
 <TableHead className="px-4 py-3 text-right font-medium text-stone-600 dark:text-stone-300 ">Comenzi</TableHead>
 <TableHead className="px-4 py-3 text-right font-medium text-stone-600 dark:text-stone-300 hidden lg:table-cell">Total cheltuit</TableHead>
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 hidden lg:table-cell">Înscris</TableHead>
 <TableHead className="px-4 py-3 text-right font-medium text-stone-600 dark:text-stone-300 ">Acțiuni</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {filtered.map((customer) => (
 <TableRow
 key={customer._id}
 className="last:border-b-0 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
 >
 <TableCell className="px-4 py-3 font-medium text-foreground">
 {customer.firstName} {customer.lastName}
 {customer.phone && (
 <span className="block text-xs font-normal text-muted-foreground lg:hidden">
 {customer.phone}
 </span>
 )}
 </TableCell>
 <TableCell className="px-4 py-3 text-muted-foreground hidden md:table-cell">
 {customer.email}
 </TableCell>
 <TableCell className="px-4 py-3 text-stone-700 dark:text-stone-300 hidden lg:table-cell">
 {customer.phone || '—'}
 </TableCell>
 <TableCell className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
 {customer.shippingAddress.street}, {customer.shippingAddress.city},{' '}
 {customer.shippingAddress.county}
 {customer.shippingAddress.country !== 'România' &&
 `, ${customer.shippingAddress.country}`}
 </TableCell>
 <TableCell className="px-4 py-3 text-center">
 <Badge
 variant="soft"
 className={
 customer.isRegistered
 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 '
 : undefined
 }
 >
 {customer.isRegistered ? 'Înregistrat' : 'Vizitator'}
 </Badge>
 </TableCell>
 <TableCell className="px-4 py-3 text-center hidden md:table-cell">
 <Badge
 variant="soft"
 className={
 customer.newsletter
 ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 '
 : undefined
 }
 >
 {customer.newsletter ? 'Da' : 'Nu'}
 </Badge>
 {customer.newsletter && customer.newsletterConsentAt && (
 <p className="mt-0.5 text-[11px] text-muted-foreground">
 {formatDate(customer.newsletterConsentAt)}
 </p>
 )}
 </TableCell>
 <TableCell className="px-4 py-3 text-right text-stone-700 dark:text-stone-300 ">
 {customer.orderCount}
 </TableCell>
 <TableCell className="px-4 py-3 text-right text-stone-700 dark:text-stone-300 hidden lg:table-cell">
 {formatPrice(customer.totalSpent)}
 </TableCell>
 <TableCell className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
 {formatDate(customer.createdAt)}
 </TableCell>
 <TableCell className="px-4 py-3 text-right">
 <Button
 asChild
 variant="ghost"
 size="sm"
 className="gap-1 px-2.5 text-xs font-medium"
 >
 <Link to={`/admin/customers/${customer._id}`}>
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

 {/* Newsletter Subscribers Modal */}
 <Dialog open={showNewsletterModal} onOpenChange={setShowNewsletterModal}>
 <DialogContent
 hideClose
 className="max-h-[90vh] max-w-3xl gap-0 overflow-hidden rounded-lg p-0"
 >
 <div className="flex flex-col max-h-[90vh]">
 <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-white/20 dark:bg-stone-900/20 flex items-center justify-center">
 <Mail className="size-5 text-white" />
 </div>
 <div>
 <DialogTitle className="text-xl font-bold text-white">
 Abonați la newsletter
 </DialogTitle>
 <p className="text-sm text-amber-100">
 {(newsletterSubscribers ?? []).length} abonați în total
 </p>
 </div>
 </div>
 <DialogClose
 aria-label="Închide"
 className="text-white/80 hover:text-white transition-colors"
 >
 <X className="size-6" />
 </DialogClose>
 </div>

 <div className="p-6 space-y-4">
 <div className="flex flex-col sm:flex-row gap-3">
 <Button variant="brand"
 onClick={handleExportEmails}
 className="flex-1 rounded-lg py-3"
 >
 <Mail className="size-4" />
 Copiază toate emailurile
 </Button>
 <Button
 variant="outline"
 onClick={handleDownloadCSV}
 className="flex-1 gap-2 rounded-lg border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:text-amber-700 dark:hover:text-amber-400"
 >
 <Download className="size-4" />
 Descarcă CSV
 </Button>
 </div>

 <div className="rounded-lg border border-border bg-stone-50 dark:bg-stone-800 p-4">
 <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">Cum trimiți emailuri promoționale:</h3>
 <ol className="text-sm text-stone-600 dark:text-stone-300 space-y-1.5 list-decimal list-inside">
 <li>Apasă „Copiază toate emailurile" ca să copiezi adresele abonaților</li>
 <li>Deschide clientul tău de email (Gmail, Outlook etc.)</li>
 <li>Lipește adresele în câmpul BCC pentru a le păstra private</li>
 <li>Scrie mesajul promoțional</li>
 <li>Trimite o dată către toți abonații</li>
 </ol>
 <p className="text-xs text-muted-foreground mt-3 italic">
 💡 Sfat: Folosește BCC (copie oarbă) ca abonații să nu-și vadă adresele între ei.
 </p>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto px-6 pb-6">
 <div className="rounded-lg border border-border overflow-hidden">
 <Table className="w-full text-sm">
 <TableHeader>
 <TableRow className="bg-stone-50 dark:bg-stone-800 ">
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 ">Email</TableHead>
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 hidden md:table-cell">Nume</TableHead>
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 hidden md:table-cell">Telefon</TableHead>
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 hidden lg:table-cell">Consimțământ</TableHead>
 <TableHead className="px-4 py-3 text-center font-medium text-stone-600 dark:text-stone-300 hidden sm:table-cell">Tip</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="bg-card">
 {(newsletterSubscribers ?? []).map((sub, idx) => (
 <TableRow
 key={idx}
 className="last:border-b-0 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
 >
 <TableCell className="px-4 py-3 text-stone-700 dark:text-stone-300 font-mono text-xs">
 {sub.email}
 </TableCell>
 <TableCell className="px-4 py-3 text-foreground hidden md:table-cell">
 {sub.firstName} {sub.lastName}
 </TableCell>
 <TableCell className="px-4 py-3 text-muted-foreground hidden md:table-cell">
 {sub.phone || '—'}
 </TableCell>
 <TableCell className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
 {sub.newsletterConsentAt ? formatDate(sub.newsletterConsentAt) : '—'}
 </TableCell>
 <TableCell className="px-4 py-3 text-center hidden sm:table-cell">
 <Badge
 variant="soft"
 className={
 sub.isRegistered
 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 '
 : undefined
 }
 >
 {sub.isRegistered ? 'Înregistrat' : 'Vizitator'}
 </Badge>
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 </section>
 );
};

export default AdminCustomers;
