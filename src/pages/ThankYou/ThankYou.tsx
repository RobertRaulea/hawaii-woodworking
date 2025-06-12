import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useCart } from '@context/CartContext';

export const ThankYou: React.FC = () => {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container mx-auto px-4 py-20 text-center">
      <h1 className="text-3xl font-bold mb-4">Îți mulțumim pentru comandă!</h1>
      <p className="text-gray-700 mb-8">Comanda ta a fost plasată cu succes. Vei primi în curând un e-mail de confirmare.</p>
      <Link
        to="/"
        className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
      >
        Înapoi la pagină principală
      </Link>
    </div>
  );
};
