import type React from 'react';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { Users, Eye, Search, Mail, Download, X } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import { Badge } from '@/components/ui/badge';
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

export const AdminCustomers: React.FC = () => {
 const [search, setSearch] = useState('');
 const [typeFilter, setTypeFilter] = useState<'all' | 'registered' | 'guest'>('all');
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

 if (search.trim()) {
 const q = search.toLowerCase();
 result = result.filter(
 (c) =>
 c.firstName.toLowerCase().includes(q) ||
 c.lastName.toLowerCase().includes(q) ||
 c.email.toLowerCase().includes(q)
 );
 }

 return result;
 }, [customers, search, typeFilter]);

 if (customers === undefined) {
 return (
 <div className="flex items-center justify-center py-20">
 <p className="text-stone-500 dark:text-stone-400 ">Se încarcă clienții...</p>
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
 alert(`${newsletterSubscribers.length} adrese de email copiate în clipboard!`);
 };

 const handleDownloadCSV = () => {
 if (!newsletterSubscribers) return;
 const csvContent = [
 ['Email', 'Prenume', 'Nume', 'Tip', 'Data înscrierii'].join(','),
 ...newsletterSubscribers.map((sub) =>
 [
 sub.email,
 sub.firstName,
 sub.lastName,
 sub.isRegistered ? 'Înregistrat' : 'Vizitator',
 new Date(sub.createdAt).toLocaleDateString('ro-RO'),
 ].join(',')
 ),
 ].join('\n');

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
 <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50 mb-4">Clienți</h1>

 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
 <Card className="rounded-lg">
 <CardContent className="p-5">
 <p className="text-sm text-stone-500 dark:text-stone-400 mb-1">Total clienți</p>
 <p className="text-2xl font-bold text-stone-900 dark:text-stone-50 ">{customers.length}</p>
 </CardContent>
 </Card>
 <Card className="rounded-lg">
 <CardContent className="p-5">
 <p className="text-sm text-stone-500 dark:text-stone-400 mb-1">Înregistrați</p>
 <p className="text-2xl font-bold text-stone-900 dark:text-stone-50 ">{registeredCount}</p>
 </CardContent>
 </Card>
 <Card className="rounded-lg">
 <CardContent className="p-5">
 <p className="text-sm text-stone-500 dark:text-stone-400 mb-1">Vizitatori</p>
 <p className="text-2xl font-bold text-stone-900 dark:text-stone-50 ">{guestCount}</p>
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
 <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400 " />
 </div>
 <p className="text-2xl font-bold text-amber-900 dark:text-amber-300 ">{newsletterCount}</p>
 <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Apasă pentru export</p>
 </Button>
 </div>
 </div>

 {/* Filters */}
 <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
 <div className="relative w-full md:w-80">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-stone-500 " />
 <Input
 type="text"
 placeholder="Caută după nume sau email..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="h-auto w-full pl-10 pr-4 py-2"
 />
 </div>
 <div className="flex items-center gap-2">
 <Label htmlFor="typeFilter">Tip:</Label>
 <select
 id="typeFilter"
 value={typeFilter}
 onChange={(e) => setTypeFilter(e.target.value as 'all' | 'registered' | 'guest')}
 className="rounded-lg border border-stone-300 dark:border-stone-700 px-3 py-1.5 text-sm bg-white dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
 >
 <option value="all">Toți</option>
 <option value="registered">Înregistrați</option>
 <option value="guest">Vizitatori</option>
 </select>
 </div>
 </div>

 {/* Table */}
 {filtered.length === 0 ? (
 <div className="rounded-lg border border-dashed border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-12 text-center">
 <Users className="h-10 w-10 text-stone-300 mx-auto mb-3" />
 <p className="text-stone-500 dark:text-stone-400 ">Niciun client găsit.</p>
 </div>
 ) : (
 <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 ">
 <Table className="w-full text-sm">
 <TableHeader>
 <TableRow className="bg-stone-50 dark:bg-stone-800 ">
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 ">Nume</TableHead>
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 hidden md:table-cell">Email</TableHead>
 <TableHead className="px-4 py-3 text-center font-medium text-stone-600 dark:text-stone-300 ">Tip</TableHead>
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
 <TableCell className="px-4 py-3 font-medium text-stone-900 dark:text-stone-50 ">
 {customer.firstName} {customer.lastName}
 </TableCell>
 <TableCell className="px-4 py-3 text-stone-500 dark:text-stone-400 hidden md:table-cell">
 {customer.email}
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
 <TableCell className="px-4 py-3 text-right text-stone-700 dark:text-stone-300 ">
 {customer.orderCount}
 </TableCell>
 <TableCell className="px-4 py-3 text-right text-stone-700 dark:text-stone-300 hidden lg:table-cell">
 {formatPrice(customer.totalSpent)}
 </TableCell>
 <TableCell className="px-4 py-3 text-stone-500 dark:text-stone-400 hidden lg:table-cell">
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
 <Mail className="h-5 w-5 text-white" />
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
 <X className="h-6 w-6" />
 </DialogClose>
 </div>

 <div className="p-6 space-y-4">
 <div className="flex flex-col sm:flex-row gap-3">
 <Button
 onClick={handleExportEmails}
 className="flex-1 gap-2 rounded-lg bg-amber-600 px-4 py-3 text-sm font-medium hover:bg-amber-700"
 >
 <Mail className="h-4 w-4" />
 Copiază toate emailurile
 </Button>
 <Button
 variant="outline"
 onClick={handleDownloadCSV}
 className="flex-1 gap-2 rounded-lg border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:text-amber-700 dark:hover:text-amber-400"
 >
 <Download className="h-4 w-4" />
 Descarcă CSV
 </Button>
 </div>

 <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800 p-4">
 <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">Cum trimiți emailuri promoționale:</h3>
 <ol className="text-sm text-stone-600 dark:text-stone-300 space-y-1.5 list-decimal list-inside">
 <li>Apasă „Copiază toate emailurile" ca să copiezi adresele abonaților</li>
 <li>Deschide clientul tău de email (Gmail, Outlook etc.)</li>
 <li>Lipește adresele în câmpul BCC pentru a le păstra private</li>
 <li>Scrie mesajul promoțional</li>
 <li>Trimite o dată către toți abonații</li>
 </ol>
 <p className="text-xs text-stone-500 dark:text-stone-400 mt-3 italic">
 💡 Sfat: Folosește BCC (copie oarbă) ca abonații să nu-și vadă adresele între ei.
 </p>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto px-6 pb-6">
 <div className="rounded-lg border border-stone-200 dark:border-stone-800 overflow-hidden">
 <Table className="w-full text-sm">
 <TableHeader>
 <TableRow className="bg-stone-50 dark:bg-stone-800 ">
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 ">Email</TableHead>
 <TableHead className="px-4 py-3 text-left font-medium text-stone-600 dark:text-stone-300 hidden md:table-cell">Nume</TableHead>
 <TableHead className="px-4 py-3 text-center font-medium text-stone-600 dark:text-stone-300 hidden sm:table-cell">Tip</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody className="bg-white dark:bg-stone-900 ">
 {(newsletterSubscribers ?? []).map((sub, idx) => (
 <TableRow
 key={idx}
 className="last:border-b-0 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
 >
 <TableCell className="px-4 py-3 text-stone-700 dark:text-stone-300 font-mono text-xs">
 {sub.email}
 </TableCell>
 <TableCell className="px-4 py-3 text-stone-900 dark:text-stone-50 hidden md:table-cell">
 {sub.firstName} {sub.lastName}
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
