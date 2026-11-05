import type React from 'react';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const toCents = (value: string): number | null => {
 const trimmed = value.trim().replace(',', '.');
 if (trimmed === '') return null;
 const parsed = Number(trimmed);
 if (!Number.isFinite(parsed) || parsed < 0) return Number.NaN;
 return Math.round(parsed * 100);
};

const formatDate = (ts: number): string =>
 new Date(ts).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const AdminShipping: React.FC = () => {
 const data = useQuery(api.shipping.getAdminSettings);
 const updateSettings = useMutation(api.shipping.updateSettings);
 const [flatRate, setFlatRate] = useState('');
 const [threshold, setThreshold] = useState('');
 const [codEnabled, setCodEnabled] = useState(true);
 const [codFee, setCodFee] = useState('');
 const [codMax, setCodMax] = useState('');
 const [error, setError] = useState('');
 const [saving, setSaving] = useState(false);
 const [savedAt, setSavedAt] = useState<number | null>(null);

 useEffect(() => {
 if (!data) return;
 setFlatRate((data.settings.flatRateCents / 100).toFixed(2));
 setThreshold(data.settings.freeShippingThresholdCents !== undefined ? (data.settings.freeShippingThresholdCents / 100).toFixed(2) : '');
 setCodEnabled(data.settings.codEnabled);
 setCodFee((data.settings.codFeeCents / 100).toFixed(2));
 setCodMax(data.settings.codMaxOrderCents !== undefined ? (data.settings.codMaxOrderCents / 100).toFixed(2) : '');
 setSavedAt(data.updatedAt);
 }, [data]);

 if (data === undefined) {
 return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Se încarcă setările...</p></div>;
 }

 const handleSave = async () => {
 const flatRateCents = toCents(flatRate);
 const thresholdCents = toCents(threshold);
 const codFeeCents = toCents(codFee);
 const codMaxCents = toCents(codMax);
 if (flatRateCents === null || Number.isNaN(flatRateCents)) return setError('Tariful de transport trebuie să fie un număr valid.');
 if (Number.isNaN(thresholdCents ?? 0) || (thresholdCents === 0)) return setError('Pragul de transport gratuit trebuie să fie pozitiv sau gol.');
 if (codFeeCents === null || Number.isNaN(codFeeCents)) return setError('Taxa ramburs trebuie să fie un număr valid.');
 if (Number.isNaN(codMaxCents ?? 0) || codMaxCents === 0) return setError('Valoarea maximă ramburs trebuie să fie pozitivă sau goală.');
 setError('');
 setSaving(true);
 try {
 await updateSettings({
 flatRateCents: flatRateCents as number,
 freeShippingThresholdCents: thresholdCents ?? undefined,
 codEnabled,
 codFeeCents: codFeeCents as number,
 codMaxOrderCents: codMaxCents ?? undefined,
 });
 toast.success('Setările de livrare au fost salvate.');
 setSavedAt(Date.now());
 } catch (err) {
 setError(err instanceof Error ? err.message : 'Salvarea a eșuat.');
 } finally {
 setSaving(false);
 }
 };

 return (
 <section className="max-w-2xl space-y-6">
 <h1 className="text-2xl md:text-3xl font-medium font-serif text-foreground">Livrare</h1>
 <Card className="rounded-lg">
 <CardContent className="p-5 space-y-5">
 <div>
 <Label htmlFor="flatRate" className="mb-1 block">Tarif transport (RON)</Label>
 <Input id="flatRate" inputMode="decimal" value={flatRate} onChange={(e) => setFlatRate(e.target.value)} className="h-auto w-full px-3 py-2" />
 </div>
 <div>
 <Label htmlFor="threshold" className="mb-1 block">Prag transport gratuit (RON)</Label>
 <Input id="threshold" inputMode="decimal" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="h-auto w-full px-3 py-2" />
 <p className="text-xs text-muted-foreground mt-1">gol = dezactivat</p>
 </div>
 <div className="flex items-center gap-2">
 <Checkbox id="codEnabled" checked={codEnabled} onCheckedChange={(v) => setCodEnabled(v === true)} className="size-4" />
 <Label htmlFor="codEnabled" className="font-normal text-stone-700 dark:text-stone-300">Ramburs activ</Label>
 </div>
 <div>
 <Label htmlFor="codFee" className="mb-1 block">Taxă ramburs (RON)</Label>
 <Input id="codFee" inputMode="decimal" value={codFee} onChange={(e) => setCodFee(e.target.value)} className="h-auto w-full px-3 py-2" />
 </div>
 <div>
 <Label htmlFor="codMax" className="mb-1 block">Valoare maximă ramburs (RON)</Label>
 <Input id="codMax" inputMode="decimal" value={codMax} onChange={(e) => setCodMax(e.target.value)} className="h-auto w-full px-3 py-2" />
 <p className="text-xs text-muted-foreground mt-1">gol = fără limită</p>
 </div>
 {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
 <div className="flex items-center gap-3">
 <Button variant="brand" onClick={handleSave} disabled={saving} className="rounded-lg">
 {saving ? 'Se salvează...' : 'Salvează'}
 </Button>
 {savedAt && !error && <p className="text-xs text-muted-foreground">Salvat · ultima actualizare {formatDate(savedAt)}</p>}
 </div>
 </CardContent>
 </Card>
 </section>
 );
};

export default AdminShipping;
