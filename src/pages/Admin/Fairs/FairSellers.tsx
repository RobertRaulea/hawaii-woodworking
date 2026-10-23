import { useMutation } from 'convex/react';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { useStaffDirectory } from '../../../hooks/useStaffDirectory';
import { SearchableSelect } from '../../../components/SearchableSelect/SearchableSelect';
import { inventoryError } from '../../../utils/inventory.utils';

interface FairSellersProps {
  fairId: Id<'fairs'>;
}

const SellerEmailForm = ({ userId }: { userId: string }) => {
  const save = useMutation(api.staff.setDirectoryEntry);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string }>({ defaultValues: { email: '' } });

  const submit = handleSubmit(async ({ email }) => {
    try {
      await save({ userId, email: email.trim(), role: 'seller' });
      reset();
    } catch (cause) {
      setError('email', { message: inventoryError(cause) });
    }
  });

  return (
    <form onSubmit={submit} className="mt-2">
      <div className="flex gap-2">
        <input
          type="email"
          disabled={isSubmitting}
          placeholder="email@exemplu.ro"
          aria-label={`Email pentru ${userId}`}
          className="min-h-11 flex-1 rounded-lg border border-stone-300 px-3 text-sm"
          {...register('email', {
            validate: (value) =>
              /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ||
              'Introdu o adresă de email validă.',
          })}
        />
        <button
          disabled={isSubmitting}
          className="min-h-11 shrink-0 rounded-lg border border-stone-300 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-40"
        >
          Setează email
        </button>
      </div>
      {errors.email ? (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {errors.email.message}
        </p>
      ) : null}
    </form>
  );
};

export const FairSellers = ({ fairId }: FairSellersProps) => {
  const userLabel = useStaffDirectory();
  const { data: sellers } = useAdminQuery(api.staff.listFairSellers, {
    fairId,
  });
  const { data: allSellers } = useAdminQuery(api.staff.sellers, {});
  const assignable = useMemo(
    () =>
      (allSellers ?? [])
        .filter(
          (seller) =>
            !(sellers ?? []).some(
              (assigned) => assigned.userId === seller.userId,
            ),
        )
        .map((seller) => seller.email),
    [allSellers, sellers],
  );
  const assign = useMutation(api.staff.assignFairSeller);
  const unassign = useMutation(api.staff.unassignFairSeller);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    clearErrors,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ userId: string }>({ defaultValues: { userId: '' } });
  const selectedSeller = watch('userId');

  const submit = handleSubmit(async ({ userId }) => {
    try {
      await assign({ fairId, userId: userId.trim() });
      reset();
    } catch (cause) {
      setError('userId', { message: inventoryError(cause) });
    }
  });

  return (
    <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <h3 className="text-sm font-semibold text-stone-800">
        Vânzători alocați
      </h3>
      {sellers === undefined ? (
        <p role="status" className="mt-2 text-sm text-stone-500">
          Se încarcă alocările...
        </p>
      ) : sellers.length === 0 ? (
        <p className="mt-2 text-sm text-stone-500">
          Niciun vânzător alocat acestui târg.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {sellers.map((seller) => (
            <li
              key={seller.userId}
              className="rounded-lg bg-white px-3 py-2"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-xs text-stone-700">
                  {userLabel(seller.userId)}
                </span>
                <button
                  type="button"
                  aria-label={`Elimină ${userLabel(seller.userId)}`}
                  onClick={() => {
                    void unassign({ fairId, userId: seller.userId });
                  }}
                  className="min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  Elimină
                </button>
              </div>
              {seller.userId && userLabel(seller.userId) === seller.userId ? (
                <SellerEmailForm userId={seller.userId} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="mt-3">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <SearchableSelect
              label="Vânzător"
              id={`seller-id-${fairId}`}
              options={assignable}
              value={selectedSeller}
              disabled={isSubmitting}
              placeholder="Alege vânzătorul"
              error={errors.userId?.message}
              onChange={(email) => {
                setValue('userId', email);
                clearErrors('userId');
              }}
            />
          </div>
          <button
            disabled={isSubmitting}
            className="mt-7 min-h-11 shrink-0 rounded-lg bg-stone-900 px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            Alocă
          </button>
        </div>
        <input
          type="hidden"
          {...register('userId', {
            validate: (userId) =>
              Boolean(userId.trim()) || 'Alege un vânzător.',
          })}
        />
        {allSellers !== undefined && assignable.length === 0 ? (
          <p className="mt-2 text-xs text-stone-500">
            Nu apare vânzătorul?{' '}
            <Link
              to="/admin/staff"
              className="font-semibold text-amber-800 underline"
            >
              Adaugă-l în Echipă
            </Link>{' '}
            sau așteaptă să se conecteze în zona de administrare.
          </p>
        ) : null}
      </form>
    </div>
  );
};
