import { Toaster as Sonner } from 'sonner';
import type { ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
 return (
 <Sonner
 position="bottom-left"
 closeButton
 toastOptions={{
 closeButtonAriaLabel: 'Închide notificarea',
 classNames: {
 toast: 'group toast !rounded-lg !shadow-lg !font-sans',
 success: '!bg-green-700 !text-white !border-green-800',
 error: '!bg-red-700 !text-white !border-red-800',
 warning: '!bg-amber-600 !text-white !border-amber-700',
 info: '!bg-stone-800 !text-white !border-stone-900',
 description: 'group-[.toast]:!text-current group-[.toast]:!opacity-80',
 actionButton:
 '!bg-transparent !font-semibold !underline !underline-offset-2 !text-current',
 closeButton: '!bg-transparent !border-transparent !text-current hover:!bg-white/20',
 },
 }}
 {...props}
 />
 );
};

export { Toaster };
export { toast } from 'sonner';
