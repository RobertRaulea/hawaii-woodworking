import { useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { useForm } from 'react-hook-form';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { inventoryError } from '../../../utils/inventory.utils';

interface FairFormProps {
  disabled: boolean;
  onCreated: (id: Id<'fairs'>) => void;
}

export const FairForm = ({ disabled, onCreated }: FairFormProps) => {
  const createFair = useMutation(api.pos.createFair);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ name: string }>({ defaultValues: { name: '' } });
  return (
    <form
      onSubmit={handleSubmit(async ({ name }) => {
        if (lock.current || disabled) return;
        lock.current = true;
        setError('');
        try {
          onCreated(await createFair({ name }));
        } catch (cause) {
          setError(inventoryError(cause));
        } finally {
          lock.current = false;
        }
      })}
    >
      <p className="mb-5 text-sm leading-6 text-stone-500">
        Fiecare târg are propriul stoc. Crearea unui târg nu mută automat
        produse din online.
      </p>
      <label htmlFor="new-fair-name" className="block text-sm font-medium">
        Numele târgului
      </label>
      <input
        id="new-fair-name"
        autoFocus
        disabled={disabled || isSubmitting}
        placeholder="De exemplu, Târg Crăciun 2026"
        className="mt-2 w-full rounded-lg border border-stone-300 p-3"
        {...register('name', {
          validate: (name) =>
            (name.trim().length > 0 && name.trim().length <= 100) ||
            'Introdu un nume de cel mult 100 de caractere.',
        })}
      />
      {errors.name ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {errors.name.message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        disabled={disabled || isSubmitting}
        className="mt-5 min-h-12 w-full rounded-xl bg-stone-900 px-4 py-3 font-semibold text-white disabled:opacity-40"
      >
        {isSubmitting ? 'Se creează...' : 'Creează târg'}
      </button>
    </form>
  );
};
