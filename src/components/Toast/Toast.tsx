import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface ToastProps {
  message: string;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-[60] animate-slide-up md:left-auto md:max-w-lg"
    >
      <div className="bg-green-700 text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-2">
        <CheckCircle className="mt-1 h-5 w-5 shrink-0" />
        <p className="min-w-0 flex-1 break-words text-sm leading-6">
          {message}
        </p>
        <button
          type="button"
          aria-label="Închide notificarea"
          onClick={onClose}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-green-800"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
