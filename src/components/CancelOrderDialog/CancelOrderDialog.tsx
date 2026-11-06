import type React from 'react';
import { useState } from 'react';
import { AdminDialog } from '../AdminDialog/AdminDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CancelOrderDialogProps {
 paid: boolean;
 cod: boolean;
 canAct: boolean;
 onClose: () => void;
 onSubmit: (reason: string) => void;
}

export const CancelOrderDialog: React.FC<CancelOrderDialogProps> = ({
 paid,
 cod,
 canAct,
 onClose,
 onSubmit,
}) => {
 const [reason, setReason] = useState('');

 return (
 <AdminDialog title="Anulează comanda" onClose={onClose}>
 <form
 onSubmit={(event) => {
 event.preventDefault();
 onSubmit(reason.trim());
 }}
 className="space-y-4"
 >
 {paid ? (
 <Alert variant="warning">
 <AlertDescription>
 Comanda este plătită. Dacă stocul a fost alocat, va fi
 returnat automat în Atelier. Rambursarea banilor se face
 manual în Stripe — nu este procesată automat.
 </AlertDescription>
 </Alert>
 ) : cod ? (
 <Alert variant="info">
 <AlertDescription>
 Comanda este ramburs: clientul nu a plătit nimic.
 Stocul alocat va fi eliberat automat în Atelier.
 </AlertDescription>
 </Alert>
 ) : (
 <Alert variant="info">
 <AlertDescription>
 Comanda nu este plătită; stocul nu va fi modificat.
 </AlertDescription>
 </Alert>
 )}
 <div>
 <Label htmlFor="cancel-reason">
 Motivul anulării (obligatoriu)
 </Label>
 <Textarea
 id="cancel-reason"
 value={reason}
 onChange={(event) => setReason(event.target.value)}
 rows={3}
 required
 minLength={3}
 maxLength={300}
 className="mt-1 w-full rounded-lg px-3 py-2"
 />
 </div>
 <div className="flex justify-end gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={onClose}
 className="rounded-lg"
 >
 Renunță
 </Button>
 <Button
 type="submit"
 variant="destructive"
 disabled={!canAct || reason.trim().length < 3}
 className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-700"
 >
 Anulează comanda
 </Button>
 </div>
 </form>
 </AdminDialog>
 );
};

export default CancelOrderDialog;
