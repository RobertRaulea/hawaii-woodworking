import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, useSignUp } from '@clerk/clerk-react';
import { api } from '../../../convex/_generated/api';
import { useShipping } from '../../context/ShippingContext';
import type { ShippingFormData } from '../../types/shipping.types';
import { useCart } from '../../context/CartContext';
import { useCustomerProfile } from '../../hooks/useCustomerProfile';
import { SearchableSelect } from '../../components/SearchableSelect/SearchableSelect';
import { JUDETE, LOCALITATI_BY_JUDET } from '../../constants/romania.constants';

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
  required?: boolean;
  registration: ReturnType<ReturnType<typeof useForm>['register']>;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  id,
  type = 'text',
  placeholder,
  error,
  required = false,
  registration,
}) => (
  <div>
    <label htmlFor={id} className="block text-xs font-medium text-stone-500 mb-1.5 tracking-wide uppercase">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      className={`w-full rounded-md border px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all duration-200 ${
        error ? 'border-red-400 focus:ring-red-400/40' : 'border-stone-300'
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
  required?: boolean;
  registration: ReturnType<ReturnType<typeof useForm>['register']>;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  id,
  options,
  error,
  required = false,
  registration,
}) => (
  <div>
    <label htmlFor={id} className="block text-xs font-medium text-stone-500 mb-1.5 tracking-wide uppercase">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <select
      id={id}
      className={`w-full rounded-md border px-3.5 py-2.5 text-sm text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all duration-200 ${
        error ? 'border-red-400 focus:ring-red-400/40' : 'border-stone-300'
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
  phone: '',
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
  const { isSignedIn, userId } = useAuth();
  const { signUp, isLoaded: isSignUpLoaded, setActive } = useSignUp();
  const upsertCustomerFromShipping = useMutation(api.customers.upsertFromShipping);
  const hasPreFilled = useRef(false);

  const [submitting, setSubmitting] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [pendingFormData, setPendingFormData] = useState<ShippingFormData | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    setValue,
    clearErrors,
    setError,
    trigger,
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
        phone: '',
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
  const shippingCounty = watch('shippingAddress.county');
  const billingCounty = watch('billingAddress.county');
  const shippingCountry = watch('shippingAddress.country');
  const billingCountry = watch('billingAddress.country');

  const isRomaniaShipping = shippingCountry === 'România';
  const isRomaniaBilling = billingCountry === 'România';

  const shippingLocalities = isRomaniaShipping
    ? LOCALITATI_BY_JUDET[shippingCounty] ?? []
    : [];
  const billingLocalities = isRomaniaBilling
    ? LOCALITATI_BY_JUDET[billingCounty] ?? []
    : [];

  // Fix: clear billing errors & reset billing fields when sameAsShipping is toggled on
  useEffect(() => {
    if (sameAsShipping) {
      clearErrors('billingAddress');
    }
  }, [sameAsShipping, clearErrors]);

  if (cartState.items.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16 text-center">
        <h2 className="font-serif text-2xl font-medium text-stone-900 mb-2">Coșul tău este gol</h2>
        <p className="text-stone-500 text-sm mb-8">Adaugă produse înainte de a continua.</p>
        <button
          onClick={() => navigate('/products')}
          className="border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-white px-8 py-2.5 rounded-md text-sm font-medium transition-all duration-200"
        >
          Înapoi la produse
        </button>
      </div>
    );
  }

  const prepareFormData = (data: ShippingFormData): ShippingFormData => {
    const normalizedData: ShippingFormData = {
      ...data,
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
    };

    if (!normalizedData.sameAsShipping) {
      return normalizedData;
    }

    return {
      ...normalizedData,
      billingAddress: { ...normalizedData.shippingAddress },
    };
  };

  const persistCustomerFromShipping = async (
    data: ShippingFormData,
    clerkUserId?: string
  ) => {
    try {
      await upsertCustomerFromShipping({
        clerkUserId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress,
        newsletter: data.newsletter,
      });
    } catch (error) {
      console.error('Failed to persist customer profile from shipping form:', error);
    }
  };

  const proceedToCheckout = (data: ShippingFormData) => {
    const payload = prepareFormData(data);

    setShippingData(payload);
    navigate('/checkout');
  };

  const handleCreateAccount = async (data: ShippingFormData) => {
    if (!isSignUpLoaded || !signUp) {
      setError('email', {
        message: 'Serviciul de conturi nu este încă pregătit. Reîncearcă în câteva secunde.',
      });
      return;
    }

    try {
      const created = await signUp.create({
        emailAddress: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      console.log('[Clerk] signUp.create result:', { status: created.status, missingFields: created.missingFields, unverifiedFields: created.unverifiedFields });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      console.log('[Clerk] prepareEmailAddressVerification done');
      setPendingFormData(data);
      setVerificationCode('');
      setVerificationError('');
      setShowVerification(true);
    } catch (error: unknown) {
      const clerkError = error as {
        errors?: Array<{ code?: string; message?: string }>;
      };
      const firstError = clerkError.errors?.[0];

      if (firstError?.code === 'form_identifier_exists') {
        setError('email', {
          message: 'Există deja un cont cu acest email. Conectează-te sau debifează crearea contului.',
        });
      } else {
        setError('email', {
          message:
            firstError?.message ??
            'Nu am putut crea contul acum. Încearcă din nou sau continuă fără cont.',
        });
      }
    }
  };

  const handleVerifyCode = async () => {
    if (!isSignUpLoaded || !signUp || !pendingFormData) {
      return;
    }

    setSubmitting(true);
    setVerificationError('');

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });
      console.log('[Clerk] attemptEmailAddressVerification result:', {
        status: result.status,
        createdUserId: result.createdUserId,
        createdSessionId: result.createdSessionId,
        missingFields: result.missingFields,
        unverifiedFields: result.unverifiedFields,
      });

      if (result.status !== 'complete') {
        const detail = result.missingFields?.length
          ? `Lipsesc câmpuri: ${result.missingFields.join(', ')}`
          : 'Verificarea nu a fost finalizată. Încearcă din nou.';
        setVerificationError(detail);
        return;
      }

      const newUserId = result.createdUserId ?? undefined;
      const newSessionId = result.createdSessionId;

      await persistCustomerFromShipping(pendingFormData, newUserId);

      if (newSessionId) {
        await setActive({ session: newSessionId });
      }

      setShowVerification(false);
      proceedToCheckout(pendingFormData);
    } catch (error: unknown) {
      console.error('Verification error:', JSON.stringify(error, null, 2), error);
      const clerkError = error as {
        errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
      };
      const msg =
        clerkError.errors?.[0]?.longMessage ??
        clerkError.errors?.[0]?.message ??
        (error instanceof Error ? error.message : 'Cod invalid. Încearcă din nou.');
      setVerificationError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (data: ShippingFormData) => {
    setSubmitting(true);
    const preparedData = prepareFormData(data);

    try {
      if (preparedData.createAccount && !isSignedIn) {
        await handleCreateAccount(preparedData);
        return;
      }

      await persistCustomerFromShipping(preparedData, userId ?? undefined);
      proceedToCheckout(preparedData);
    } catch (error) {
      console.error('Shipping form submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (showVerification) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="bg-white rounded-lg border border-stone-200 p-8">
          <h2 className="font-serif text-xl font-medium text-stone-900 mb-2">Verifică adresa de email</h2>
          <p className="text-sm text-stone-500 mb-6">
            Am trimis un cod de verificare la <strong>{pendingFormData?.email}</strong>.
            Introdu codul pentru a crea contul Clerk și a continua.
          </p>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={verificationCode}
            onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full rounded-md border border-stone-300 px-4 py-3 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all duration-200"
          />

          {verificationError && <p className="mt-2 text-sm text-red-600">{verificationError}</p>}

          <button
            type="button"
            onClick={handleVerifyCode}
            disabled={verificationCode.length < 6 || submitting}
            className="mt-6 w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 rounded-md text-sm tracking-wide transition-all duration-200 disabled:opacity-50"
          >
            {submitting ? 'Se verifică...' : 'Verifică și continuă'}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowVerification(false);
              setVerificationCode('');
              setVerificationError('');
              setPendingFormData(null);
            }}
            className="mt-3 w-full text-sm text-stone-500 hover:text-stone-700 transition-colors"
          >
            Înapoi la formular
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
      <h1 className="font-serif text-3xl font-medium text-stone-900 mb-2">Informații de livrare</h1>
      <p className="text-stone-500 text-sm mb-10">
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
          <h2 className="font-serif text-lg font-medium text-stone-900 mb-5 pb-2 border-b border-stone-200">
            Contact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Email"
              id="email"
              type="email"
              placeholder="your@email.com"
              error={errors.email?.message}
              required
              registration={register('email', {
                required: 'Adresa de email este obligatorie',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Adresa de email nu este validă',
                },
                onBlur: () => {
                  void trigger('email');
                },
              })}
            />
            <InputField
              label="Telefon"
              id="phone"
              type="tel"
              placeholder="+40 7xx xxx xxx"
              error={errors.phone?.message}
              required
              registration={register('phone', {
                required: 'Numărul de telefon este obligatoriu',
                pattern: {
                  value: /^\+?[0-9\s\-()]{7,20}$/,
                  message: 'Numărul de telefon nu este valid',
                },
              })}
            />
          </div>
        </section>

        {/* Name */}
        <section>
          <h2 className="font-serif text-lg font-medium text-stone-900 mb-5 pb-2 border-b border-stone-200">
            Nume
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Prenume"
              id="firstName"
              placeholder="First name"
              error={errors.firstName?.message}
              required
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
              required
              registration={register('lastName', {
                required: 'Numele este obligatoriu',
                minLength: { value: 2, message: 'Minim 2 caractere' },
              })}
            />
          </div>
        </section>

        {/* Shipping Address */}
        <section>
          <h2 className="font-serif text-lg font-medium text-stone-900 mb-5 pb-2 border-b border-stone-200">
            Adresă de livrare
          </h2>
          <div className="space-y-4">
            <SelectField
              label="Țară"
              id="shippingCountry"
              options={COUNTRIES}
              error={errors.shippingAddress?.country?.message}
              required
              registration={register('shippingAddress.country', {
                required: 'Țara este obligatorie',
                onChange: () => {
                  setValue('shippingAddress.county', '');
                  setValue('shippingAddress.city', '');
                },
              })}
            />
            <InputField
              label="Stradă"
              id="shippingStreet"
              placeholder="Street address"
              error={errors.shippingAddress?.street?.message}
              required
              registration={register('shippingAddress.street', {
                required: 'Strada este obligatorie',
              })}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isRomaniaShipping ? (
                <Controller
                  name="shippingAddress.county"
                  control={control}
                  rules={{ required: 'Județul este obligatoriu' }}
                  render={({ field }) => (
                    <SearchableSelect
                      label="Județ / Sector"
                      id="shippingCounty"
                      options={JUDETE}
                      value={field.value}
                      required
                      onChange={(val) => {
                        setValue('shippingAddress.county', val, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                        setValue('shippingAddress.city', '', {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                        clearErrors('shippingAddress.county');
                        clearErrors('shippingAddress.city');
                      }}
                      onBlur={field.onBlur}
                      error={errors.shippingAddress?.county?.message}
                      placeholder="Caută județ..."
                    />
                  )}
                />
              ) : (
                <InputField
                  label="Județ / Sector"
                  id="shippingCounty"
                  placeholder="County / State"
                  error={errors.shippingAddress?.county?.message}
                  required
                  registration={register('shippingAddress.county', {
                    required: 'Județul este obligatoriu',
                  })}
                />
              )}
              {isRomaniaShipping && shippingCounty ? (
                <Controller
                  name="shippingAddress.city"
                  control={control}
                  rules={{ required: 'Orașul este obligatoriu' }}
                  render={({ field }) => (
                    <SearchableSelect
                      label="Oraș / Localitate"
                      id="shippingCity"
                      options={shippingLocalities}
                      value={field.value}
                      required
                      onChange={(val) => {
                        setValue('shippingAddress.city', val, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                        clearErrors('shippingAddress.city');
                      }}
                      onBlur={field.onBlur}
                      error={errors.shippingAddress?.city?.message}
                      placeholder="Caută localitate..."
                    />
                  )}
                />
              ) : (
                <InputField
                  label="Oraș"
                  id="shippingCity"
                  placeholder="City"
                  error={errors.shippingAddress?.city?.message}
                  required
                  registration={register('shippingAddress.city', {
                    required: 'Orașul este obligatoriu',
                  })}
                />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Cod poștal"
                id="shippingPostalCode"
                placeholder="Postal code"
                error={errors.shippingAddress?.postalCode?.message}
                registration={register('shippingAddress.postalCode', {
                  validate: (val) => {
                    if (!val) return true;
                    if (!isRomaniaShipping) return true;
                    return /^\d{6}$/.test(val) || 'Codul poștal trebuie să aibă 6 cifre';
                  },
                })}
              />
            </div>
          </div>
        </section>

        {/* Billing Address */}
        <section>
          <h2 className="font-serif text-lg font-medium text-stone-900 mb-5 pb-2 border-b border-stone-200">
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
              <SelectField
                label="Țară"
                id="billingCountry"
                options={COUNTRIES}
                error={errors.billingAddress?.country?.message}
                required
                registration={register('billingAddress.country', {
                  required: 'Țara este obligatorie',
                  onChange: () => {
                    setValue('billingAddress.county', '');
                    setValue('billingAddress.city', '');
                  },
                })}
              />
              <InputField
                label="Stradă"
                id="billingStreet"
                placeholder="Street address"
                error={errors.billingAddress?.street?.message}
                required
                registration={register('billingAddress.street', {
                  required: 'Strada este obligatorie',
                })}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isRomaniaBilling ? (
                  <Controller
                    name="billingAddress.county"
                    control={control}
                    rules={{ required: 'Județul este obligatoriu' }}
                    render={({ field }) => (
                      <SearchableSelect
                        label="Județ / Sector"
                        id="billingCounty"
                        options={JUDETE}
                        value={field.value}
                        required
                        onChange={(val) => {
                          setValue('billingAddress.county', val, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                          setValue('billingAddress.city', '', {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                          clearErrors('billingAddress.county');
                          clearErrors('billingAddress.city');
                        }}
                        onBlur={field.onBlur}
                        error={errors.billingAddress?.county?.message}
                        placeholder="Caută județ..."
                      />
                    )}
                  />
                ) : (
                  <InputField
                    label="Județ / Sector"
                    id="billingCounty"
                    placeholder="County / State"
                    error={errors.billingAddress?.county?.message}
                    required
                    registration={register('billingAddress.county', {
                      required: 'Județul este obligatoriu',
                    })}
                  />
                )}
                {isRomaniaBilling && billingCounty ? (
                  <Controller
                    name="billingAddress.city"
                    control={control}
                    rules={{ required: 'Orașul este obligatoriu' }}
                    render={({ field }) => (
                      <SearchableSelect
                        label="Oraș / Localitate"
                        id="billingCity"
                        options={billingLocalities}
                        value={field.value}
                        required
                        onChange={(val) => {
                          setValue('billingAddress.city', val, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                          clearErrors('billingAddress.city');
                        }}
                        onBlur={field.onBlur}
                        error={errors.billingAddress?.city?.message}
                        placeholder="Caută localitate..."
                      />
                    )}
                  />
                ) : (
                  <InputField
                    label="Oraș"
                    id="billingCity"
                    placeholder="City"
                    error={errors.billingAddress?.city?.message}
                    required
                    registration={register('billingAddress.city', {
                      required: 'Orașul este obligatoriu',
                    })}
                  />
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  label="Cod poștal"
                  id="billingPostalCode"
                  placeholder="Postal code"
                  error={errors.billingAddress?.postalCode?.message}
                  registration={register('billingAddress.postalCode', {
                    validate: (val) => {
                      if (!val) return true;
                      if (!isRomaniaBilling) return true;
                      return /^\d{6}$/.test(val) || 'Codul poștal trebuie să aibă 6 cifre';
                    },
                  })}
                />
              </div>
            </div>
          )}
        </section>

        {/* Options */}
        <section>
          <h2 className="font-serif text-lg font-medium text-stone-900 mb-5 pb-2 border-b border-stone-200">
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
            {!isSignedIn && (
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
            )}
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
            disabled={submitting}
            className="w-full md:w-auto bg-stone-900 hover:bg-stone-800 text-white font-medium px-10 py-3 rounded-md text-sm tracking-wide transition-all duration-200 disabled:opacity-50"
          >
            {submitting ? 'Se procesează...' : 'Continuă spre plată'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Shipping;
