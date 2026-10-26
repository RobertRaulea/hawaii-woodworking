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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
 <Label htmlFor={id} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400 ">
 {label}
 {required && <span className="text-red-500 ml-0.5">*</span>}
 </Label>
 <Input
 id={id}
 type={type}
 placeholder={placeholder}
 className={`h-auto w-full rounded-md border px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-50 transition-all duration-200 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
 error ? 'border-red-400 focus:ring-red-400/40' : 'border-stone-300 dark:border-stone-600 '
 }`}
 {...registration}
 />
 {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400 ">{error}</p>}
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
 <Label htmlFor={id} className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400 ">
 {label}
 {required && <span className="text-red-500 ml-0.5">*</span>}
 </Label>
 <select
 id={id}
 className={`w-full rounded-md border px-3.5 py-2.5 text-sm text-stone-900 dark:text-stone-50 bg-white dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all duration-200 ${
 error ? 'border-red-400 focus:ring-red-400/40' : 'border-stone-300 dark:border-stone-600 '
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
 {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400 ">{error}</p>}
 </div>
);

const EMPTY_DEFAULTS: ShippingFormData = {
 email: '',
 phone: '',
 firstName: '',
 lastName: '',
 password: '',
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
 const { isSignedIn } = useAuth();
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
 password: '',
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
 const createAccount = watch('createAccount');
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
 <h2 className="font-serif text-2xl font-medium text-stone-900 dark:text-stone-50 mb-2">Coșul tău este gol</h2>
 <p className="text-stone-500 dark:text-stone-400 text-sm mb-8">Adaugă produse înainte de a continua.</p>
 <Button
 variant="outline"
 onClick={() => navigate('/products')}
 className="h-auto rounded-md border-stone-900 dark:border-stone-400 px-8 py-2.5 text-sm font-medium text-stone-900 dark:text-stone-50 transition-all duration-200 hover:bg-stone-900 hover:text-white dark:hover:bg-stone-50 dark:hover:text-stone-900"
 >
 Înapoi la produse
 </Button>
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
 data: ShippingFormData
 ) => {
 try {
 await upsertCustomerFromShipping({
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

 if (!data.password) {
 setError('password', {
 message: 'Parola este obligatorie pentru crearea contului.',
 });
 return;
 }

 try {
 await signUp.create({
 emailAddress: data.email,
 password: data.password,
 firstName: data.firstName,
 lastName: data.lastName,
 });

 await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
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

 if (result.status !== 'complete') {
 const detail = result.missingFields?.length
 ? `Lipsesc câmpuri: ${result.missingFields.join(', ')}`
 : 'Verificarea nu a fost finalizată. Încearcă din nou.';
 setVerificationError(detail);
 return;
 }

 const newSessionId = result.createdSessionId;

 if (newSessionId) {
 await setActive({ session: newSessionId });
 }

 await persistCustomerFromShipping(pendingFormData);

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

 await persistCustomerFromShipping(preparedData);
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
 <Card className="rounded-lg border-stone-200 dark:border-stone-800 p-8 shadow-none">
 <h2 className="font-serif text-xl font-medium text-stone-900 dark:text-stone-50 mb-2">Verifică adresa de email</h2>
 <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
 Am trimis un cod de verificare la <strong>{pendingFormData?.email}</strong>.
 Introdu codul pentru a crea contul și a continua.
 </p>

 <Input
 type="text"
 inputMode="numeric"
 maxLength={6}
 value={verificationCode}
 onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ''))}
 placeholder="000000"
 className="h-auto w-full rounded-md border-stone-300 dark:border-stone-600 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] transition-all duration-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
 />

 {verificationError && <p className="mt-2 text-sm text-red-600 dark:text-red-400 ">{verificationError}</p>}

 <Button
 type="button"
 onClick={handleVerifyCode}
 disabled={verificationCode.length < 6 || submitting}
 className="mt-6 h-auto w-full rounded-md bg-stone-900 py-3 text-sm font-medium tracking-wide text-white transition-all duration-200 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white disabled:opacity-50"
 >
 {submitting ? 'Se verifică...' : 'Verifică și continuă'}
 </Button>

 <Button
 type="button"
 variant="ghost"
 onClick={() => {
 setShowVerification(false);
 setVerificationCode('');
 setVerificationError('');
 setPendingFormData(null);
 }}
 className="mt-3 h-auto w-full p-0 text-sm text-stone-500 dark:text-stone-400 transition-colors hover:bg-transparent hover:text-stone-700 dark:hover:text-stone-300"
 >
 Înapoi la formular
 </Button>
 </Card>
 </div>
 );
 }

 return (
 <div className="max-w-3xl mx-auto px-6 lg:px-8 py-12 lg:py-16">
 <h1 className="font-serif text-3xl font-medium text-stone-900 dark:text-stone-50 mb-2">Informații de livrare</h1>
 <p className="text-stone-500 dark:text-stone-400 text-sm mb-10">
 Completează datele de mai jos pentru a continua comanda.
 </p>

 <div className="text-sm text-stone-500 dark:text-stone-400 mb-6">
 <Link to="/login" className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-400 font-medium underline">
 Ai deja cont? Conectează-te
 </Link>
 </div>

 <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
 {/* Contact */}
 <section>
 <h2 className="font-serif text-lg font-medium text-stone-900 dark:text-stone-50 mb-5 pb-2 border-b border-stone-200 dark:border-stone-800 ">
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
 <h2 className="font-serif text-lg font-medium text-stone-900 dark:text-stone-50 mb-5 pb-2 border-b border-stone-200 dark:border-stone-800 ">
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
 <h2 className="font-serif text-lg font-medium text-stone-900 dark:text-stone-50 mb-5 pb-2 border-b border-stone-200 dark:border-stone-800 ">
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
 <h2 className="font-serif text-lg font-medium text-stone-900 dark:text-stone-50 mb-5 pb-2 border-b border-stone-200 dark:border-stone-800 ">
 Adresă de facturare
 </h2>
 <Controller
 name="sameAsShipping"
 control={control}
 render={({ field }) => (
 <label htmlFor="sameAsShipping" className="mb-4 flex cursor-pointer items-center gap-2">
 <Checkbox
 id="sameAsShipping"
 checked={field.value}
 onCheckedChange={field.onChange}
 onBlur={field.onBlur}
 ref={field.ref}
 className="h-4 w-4"
 />
 <span className="text-sm text-stone-700 dark:text-stone-300 ">
 Aceeași cu adresa de livrare
 </span>
 </label>
 )}
 />

 {!sameAsShipping && (
 <div className="space-y-4">
 <SelectField
 label="Țară"
 id="billingCountry"
 options={COUNTRIES}
 error={errors.billingAddress?.country?.message}
 required
 registration={register('billingAddress.country', {
 required: !sameAsShipping ? 'Țara este obligatorie' : false,
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
 required: !sameAsShipping ? 'Strada este obligatorie' : false,
 })}
 />
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {isRomaniaBilling ? (
 <Controller
 name="billingAddress.county"
 control={control}
 rules={{ required: !sameAsShipping ? 'Județul este obligatoriu' : false }}
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
 required: !sameAsShipping ? 'Județul este obligatoriu' : false,
 })}
 />
 )}
 {isRomaniaBilling && billingCounty ? (
 <Controller
 name="billingAddress.city"
 control={control}
 rules={{ required: !sameAsShipping ? 'Orașul este obligatoriu' : false }}
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
 required: !sameAsShipping ? 'Orașul este obligatoriu' : false,
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
 <h2 className="font-serif text-lg font-medium text-stone-900 dark:text-stone-50 mb-5 pb-2 border-b border-stone-200 dark:border-stone-800 ">
 Opțiuni
 </h2>
 <div className="space-y-3">
 {/* Newsletter */}
 <Controller
 name="newsletter"
 control={control}
 render={({ field }) => (
 <label htmlFor="newsletter" className="flex cursor-pointer items-start gap-3">
 <Checkbox
 id="newsletter"
 checked={field.value}
 onCheckedChange={field.onChange}
 onBlur={field.onBlur}
 ref={field.ref}
 className="mt-0.5 h-4 w-4"
 />
 <span className="text-sm text-stone-700 dark:text-stone-300 ">
 Doresc să primesc newsletter-ul cu noutăți și oferte speciale
 </span>
 </label>
 )}
 />

 {/* Accept Policy */}
 <Controller
 name="acceptPolicy"
 control={control}
 rules={{ required: 'Trebuie să accepți politica de confidențialitate' }}
 render={({ field }) => (
 <label htmlFor="acceptPolicy" className="flex cursor-pointer items-start gap-3">
 <Checkbox
 id="acceptPolicy"
 checked={field.value}
 onCheckedChange={field.onChange}
 onBlur={field.onBlur}
 ref={field.ref}
 aria-invalid={errors.acceptPolicy ? true : undefined}
 className="mt-0.5 h-4 w-4"
 />
 <span className="text-sm text-stone-700 dark:text-stone-300 ">
 Am citit și accept{' '}
 <Link
 to="/privacy-policy"
 target="_blank"
 className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-400 underline"
 >
 Politica de Confidențialitate
 </Link>
 . Sunt de acord cu prelucrarea datelor personale pentru procesarea comenzii
 în conformitate cu GDPR.
 <span className="text-red-500 ml-0.5">*</span>
 </span>
 </label>
 )}
 />
 {errors.acceptPolicy && (
 <p className="text-xs text-red-600 dark:text-red-400 ml-7">{errors.acceptPolicy.message}</p>
 )}

 {/* Create Account */}
 {!isSignedIn && (
 <>
 <Controller
 name="createAccount"
 control={control}
 render={({ field }) => (
 <label htmlFor="createAccount" className="flex cursor-pointer items-start gap-3">
 <Checkbox
 id="createAccount"
 checked={field.value}
 onCheckedChange={field.onChange}
 onBlur={field.onBlur}
 ref={field.ref}
 className="mt-0.5 h-4 w-4"
 />
 <span className="text-sm text-stone-700 dark:text-stone-300 ">
 Doresc să îmi creez un cont pentru comenzi viitoare
 </span>
 </label>
 )}
 />

 {/* Password field - shown only when createAccount is checked */}
 {createAccount && (
 <div className="ml-7 mt-2">
 <InputField
 label="Parolă"
 id="password"
 type="password"
 placeholder="Minim 8 caractere"
 error={errors.password?.message}
 required
 registration={register('password', {
 required: createAccount ? 'Parola este obligatorie pentru crearea contului' : false,
 minLength: createAccount ? { value: 8, message: 'Parola trebuie să aibă minim 8 caractere' } : undefined,
 })}
 />
 </div>
 )}
 </>
 )}
 </div>
 </section>

 {/* Submit */}
 <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-200 dark:border-stone-800 ">
 <Button
 type="button"
 variant="ghost"
 onClick={() => navigate('/cart')}
 className="h-auto p-0 text-sm text-stone-500 dark:text-stone-400 transition-colors hover:bg-transparent hover:text-stone-700 dark:hover:text-stone-300"
 >
 ← Înapoi la coș
 </Button>
 <Button
 type="submit"
 disabled={submitting}
 className="h-auto w-full rounded-md bg-stone-900 px-10 py-3 text-sm font-medium tracking-wide text-white transition-all duration-200 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white disabled:opacity-50 md:w-auto"
 >
 {submitting ? 'Se procesează...' : 'Continuă spre plată'}
 </Button>
 </div>
 </form>
 </div>
 );
};

export default Shipping;
