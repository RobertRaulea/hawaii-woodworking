import type React from 'react';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useShipping } from '../../context/ShippingContext';
import type { ShippingFormData } from '../../types/shipping.types';
import { useCart } from '../../context/CartContext';
import { useCustomerProfile } from '../../hooks/useCustomerProfile';

const COUNTRIES = [
  'România',
  'Austria',
  'Belgium',
  'Bulgaria',
  'Croatia',
  'Czech Republic',
  'Denmark',
  'Estonia',
  'Finland',
  'France',
  'Germany',
  'Greece',
  'Hungary',
  'Ireland',
  'Italy',
  'Latvia',
  'Lithuania',
  'Luxembourg',
  'Netherlands',
  'Poland',
  'Portugal',
  'Slovakia',
  'Slovenia',
  'Spain',
  'Sweden',
  'United Kingdom',
  'United States',
] as const;

interface InputFieldProps {
  label: string;
  id: string;
  type?: string;
  placeholder?: string;
  error?: string;
  registration: ReturnType<ReturnType<typeof useForm>['register']>;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  id,
  type = 'text',
  placeholder,
  error,
  registration,
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-stone-700 mb-1">
      {label}
    </label>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      className={`w-full rounded-lg border px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${
        error ? 'border-red-400 focus:ring-red-400' : 'border-stone-300'
      }`}
      {...registration}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

interface SelectFieldProps {
  label: string;
  id: string;
  options: readonly string[];
  error?: string;
  registration: ReturnType<ReturnType<typeof useForm>['register']>;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  id,
  options,
  error,
  registration,
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-stone-700 mb-1">
      {label}
    </label>
    <select
      id={id}
      className={`w-full rounded-lg border px-3 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors ${
        error ? 'border-red-400 focus:ring-red-400' : 'border-stone-300'
      }`}
      {...registration}
    >
      <option value="">Select...</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
);

const EMPTY_DEFAULTS: ShippingFormData = {
  email: '',
  firstName: '',
  lastName: '',
  shippingAddress: {
    street: '',
    city: '',
    county: '',
    postalCode: '',
    country: 'România',
  },
  billingAddress: {
    street: '',
    city: '',
    county: '',
    postalCode: '',
    country: 'România',
  },
  sameAsShipping: true,
  newsletter: false,
  acceptPolicy: false,
  createAccount: false,
};

export const Shipping: React.FC = () => {
  const navigate = useNavigate();
  const { setShippingData, shippingData } = useShipping();
  const { state: cartState } = useCart();
  const { customer } = useCustomerProfile();
  const hasPreFilled = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ShippingFormData>({
    defaultValues: shippingData ?? EMPTY_DEFAULTS,
  });

  // Pre-fill form when a returning Clerk user's profile loads
  useEffect(() => {
    if (customer && !hasPreFilled.current && !shippingData) {
      hasPreFilled.current = true;
      reset({
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        shippingAddress: customer.shippingAddress,
        billingAddress: customer.billingAddress,
        sameAsShipping: true,
        newsletter: customer.newsletter,
        acceptPolicy: false,
        createAccount: false,
      });
    }
  }, [customer, shippingData, reset]);

  const sameAsShipping = watch('sameAsShipping');

  if (cartState.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-semibold text-stone-800 mb-2">Coșul tău este gol</h2>
        <p className="text-stone-600 mb-6">Adaugă produse înainte de a continua.</p>
        <button
          onClick={() => navigate('/products')}
          className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
        >
          Înapoi la produse
        </button>
      </div>
    );
  }

  const onSubmit = (data: ShippingFormData) => {
    if (data.sameAsShipping) {
      data.billingAddress = { ...data.shippingAddress };
    }
    setShippingData(data);
    navigate('/checkout');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-stone-900 mb-2">Informații de livrare</h1>
      <p className="text-stone-500 text-sm mb-8">
        Completează datele de mai jos pentru a continua comanda.
      </p>

      <div className="text-sm text-stone-500 mb-6">
        <Link to="/login" className="text-amber-600 hover:text-amber-700 font-medium underline">
          Ai deja cont? Conectează-te
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
        {/* Contact */}
        <section>
          <h2 className="text-lg font-semibold text-stone-800 mb-4 border-b border-stone-200 pb-2">
            Contact
          </h2>
          <InputField
            label="Email"
            id="email"
            type="email"
            placeholder="your@email.com"
            error={errors.email?.message}
            registration={register('email', {
              required: 'Adresa de email este obligatorie',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Adresa de email nu este validă',
              },
            })}
          />
        </section>

        {/* Name */}
        <section>
          <h2 className="text-lg font-semibold text-stone-800 mb-4 border-b border-stone-200 pb-2">
            Nume
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Prenume"
              id="firstName"
              placeholder="First name"
              error={errors.firstName?.message}
              registration={register('firstName', {
                required: 'Prenumele este obligatoriu',
                minLength: { value: 2, message: 'Minim 2 caractere' },
              })}
            />
            <InputField
              label="Nume"
              id="lastName"
              placeholder="Last name"
              error={errors.lastName?.message}
              registration={register('lastName', {
                required: 'Numele este obligatoriu',
                minLength: { value: 2, message: 'Minim 2 caractere' },
              })}
            />
          </div>
        </section>

        {/* Shipping Address */}
        <section>
          <h2 className="text-lg font-semibold text-stone-800 mb-4 border-b border-stone-200 pb-2">
            Adresă de livrare
          </h2>
          <div className="space-y-4">
            <InputField
              label="Stradă"
              id="shippingStreet"
              placeholder="Street address"
              error={errors.shippingAddress?.street?.message}
              registration={register('shippingAddress.street', {
                required: 'Strada este obligatorie',
              })}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Oraș"
                id="shippingCity"
                placeholder="City"
                error={errors.shippingAddress?.city?.message}
                registration={register('shippingAddress.city', {
                  required: 'Orașul este obligatoriu',
                })}
              />
              <InputField
                label="Județ / Sector"
                id="shippingCounty"
                placeholder="County / State"
                error={errors.shippingAddress?.county?.message}
                registration={register('shippingAddress.county', {
                  required: 'Județul este obligatoriu',
                })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Cod poștal"
                id="shippingPostalCode"
                placeholder="Postal code"
                error={errors.shippingAddress?.postalCode?.message}
                registration={register('shippingAddress.postalCode', {
                  required: 'Codul poștal este obligatoriu',
                })}
              />
              <SelectField
                label="Țară"
                id="shippingCountry"
                options={COUNTRIES}
                error={errors.shippingAddress?.country?.message}
                registration={register('shippingAddress.country', {
                  required: 'Țara este obligatorie',
                })}
              />
            </div>
          </div>
        </section>

        {/* Billing Address */}
        <section>
          <h2 className="text-lg font-semibold text-stone-800 mb-4 border-b border-stone-200 pb-2">
            Adresă de facturare
          </h2>
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              {...register('sameAsShipping')}
            />
            <span className="text-sm text-stone-700">
              Aceeași cu adresa de livrare
            </span>
          </label>

          {!sameAsShipping && (
            <div className="space-y-4">
              <InputField
                label="Stradă"
                id="billingStreet"
                placeholder="Street address"
                error={errors.billingAddress?.street?.message}
                registration={register('billingAddress.street', {
                  required: !sameAsShipping ? 'Strada este obligatorie' : false,
                })}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Oraș"
                  id="billingCity"
                  placeholder="City"
                  error={errors.billingAddress?.city?.message}
                  registration={register('billingAddress.city', {
                    required: !sameAsShipping ? 'Orașul este obligatoriu' : false,
                  })}
                />
                <InputField
                  label="Județ / Sector"
                  id="billingCounty"
                  placeholder="County / State"
                  error={errors.billingAddress?.county?.message}
                  registration={register('billingAddress.county', {
                    required: !sameAsShipping ? 'Județul este obligatoriu' : false,
                  })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Cod poștal"
                  id="billingPostalCode"
                  placeholder="Postal code"
                  error={errors.billingAddress?.postalCode?.message}
                  registration={register('billingAddress.postalCode', {
                    required: !sameAsShipping ? 'Codul poștal este obligatoriu' : false,
                  })}
                />
                <SelectField
                  label="Țară"
                  id="billingCountry"
                  options={COUNTRIES}
                  error={errors.billingAddress?.country?.message}
                  registration={register('billingAddress.country', {
                    required: !sameAsShipping ? 'Țara este obligatorie' : false,
                  })}
                />
              </div>
            </div>
          )}
        </section>

        {/* Options */}
        <section>
          <h2 className="text-lg font-semibold text-stone-800 mb-4 border-b border-stone-200 pb-2">
            Opțiuni
          </h2>
          <div className="space-y-3">
            {/* Newsletter */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                {...register('newsletter')}
              />
              <span className="text-sm text-stone-700">
                Doresc să primesc newsletter-ul cu noutăți și oferte speciale
              </span>
            </label>

            {/* Accept Policy */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                {...register('acceptPolicy', {
                  required: 'Trebuie să accepți politica de confidențialitate',
                })}
              />
              <span className="text-sm text-stone-700">
                Am citit și accept{' '}
                <Link
                  to="/privacy-policy"
                  target="_blank"
                  className="text-amber-600 hover:text-amber-700 underline"
                >
                  Politica de Confidențialitate
                </Link>
                . Sunt de acord cu prelucrarea datelor personale pentru procesarea comenzii
                în conformitate cu GDPR.
                <span className="text-red-500 ml-0.5">*</span>
              </span>
            </label>
            {errors.acceptPolicy && (
              <p className="text-xs text-red-600 ml-7">{errors.acceptPolicy.message}</p>
            )}

            {/* Create Account */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                {...register('createAccount')}
              />
              <span className="text-sm text-stone-700">
                Doresc să îmi creez un cont pentru comenzi viitoare
              </span>
            </label>
          </div>
        </section>

        {/* Submit */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-200">
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            ← Înapoi la coș
          </button>
          <button
            type="submit"
            className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white font-medium px-8 py-3 rounded-lg transition-colors"
          >
            Continuă spre plată
          </button>
        </div>
      </form>
    </div>
  );
};

export default Shipping;
