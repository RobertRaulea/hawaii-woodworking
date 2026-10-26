import type React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Package,
  Truck,
} from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { useStaffAccess } from '../../../hooks/useStaffAccess';
import { bucharestToday, monthStart } from '../../../utils/date.utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const lei = (cents: number): string => `${(cents / 100).toFixed(2)} RON`;

const StatCard = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
        {label}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
          {hint}
        </p>
      ) : null}
    </CardContent>
  </Card>
);

const Section = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg text-stone-900 dark:text-stone-50">
        <Icon className="h-5 w-5 text-amber-600" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export const Dashboard: React.FC = () => {
  const { can } = useStaffAccess();
  const today = bucharestToday();
  const { data, error } = useAdminQuery(api.reports.dashboard, { today });

  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
        {error}
      </p>
    );
  }
  if (data === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500 dark:text-stone-400">
          Se încarcă panoul…
        </p>
      </div>
    );
  }

  const monthFrom = monthStart(today);

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900 dark:text-stone-50">
            Panou
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Activitatea de azi și semnalele care cer atenție.
          </p>
        </div>
        {can('reports.view') ? (
          <Button asChild variant="outline">
            <Link to={`/admin/reports?from=${monthFrom}&to=${today}`}>
              <BarChart3 className="h-4 w-4" /> Rapoarte
            </Link>
          </Button>
        ) : null}
      </header>

      {data.sales ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {(['today', 'month'] as const).map((key) => {
            const block = data.sales![key];
            const title = key === 'today' ? 'Azi' : 'Luna curentă';
            return (
              <Section key={key} title={`Vânzări — ${title}`} icon={BarChart3}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <StatCard
                    label="Vânzări nete"
                    value={lei(block.sales.total.netCents)}
                    hint={`${block.sales.total.count} comenzi/bonuri · ${block.sales.total.units} bucăți`}
                  />
                  <StatCard
                    label="Reduceri"
                    value={lei(
                      block.sales.total.discountCents,
                    )}
                  />
                  <StatCard
                    label="Anulări după plată"
                    value={lei(block.sales.online!.returnsCents)}
                    hint={`${block.sales.online!.returnCount} comenzi`}
                  />
                  <StatCard
                    label="Încasări POS numerar"
                    value={lei(block.collections.posCashCents!)}
                  />
                  <StatCard
                    label="Încasări POS card"
                    value={lei(block.collections.posCardCents!)}
                  />
                  <StatCard
                    label="Încasări online confirmate Stripe"
                    value={lei(block.collections.onlineCardConfirmedCents!)}
                    hint={`${block.collections.onlineCardConfirmedCount!} plăți`}
                  />
                </div>
              </Section>
            );
          })}
        </div>
      ) : null}

      {data.pos ? (
        <Section title="Vânzările mele de azi pe târg" icon={BarChart3}>
          {data.pos.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Nu ai târguri active alocate.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.pos.map((row) => (
                <li
                  key={row.fairId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 p-4 dark:border-stone-800"
                >
                  <div>
                    <p className="font-medium text-stone-900 dark:text-stone-50">
                      {row.fairName}
                    </p>
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      {lei(row.netCents)} · {row.count} bonuri · numerar{' '}
                      {lei(row.cashCents)} · card {lei(row.cardCents)}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/admin/pos?fairId=${row.fairId}`}>
                      Deschide POS
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {data.fulfillment ? (
          <Section title="Comenzi de pregătit" icon={Truck}>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/admin/fulfillment?tab=ready">
                  De pregătit <Badge>{data.fulfillment.ready}</Badge>
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/admin/fulfillment?tab=preparing">
                  În pregătire <Badge>{data.fulfillment.preparing}</Badge>
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/admin/fulfillment?tab=packed">
                  Ambalate <Badge>{data.fulfillment.packed}</Badge>
                </Link>
              </Button>
            </div>
          </Section>
        ) : null}

        {data.lowStock ? (
          <Section title="Stoc redus" icon={Package}>
            {data.lowStock.count === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Niciun produs sub prag.
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {data.lowStock.rows.map((row) => (
                    <li
                      key={row.productId}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate text-stone-800 dark:text-stone-200">
                        {row.name}
                        {row.sku ? (
                          <span className="ml-1 text-stone-400">
                            ({row.sku})
                          </span>
                        ) : null}
                      </span>
                      <Badge variant="secondary">
                        {row.invalid
                          ? 'Stoc invalid — verifică în Stocuri'
                          : `${row.available} / ${row.threshold}`}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="link" className="mt-2 px-0">
                  <Link to="/admin/inventory?availability=low">
                    Vezi toate în Stocuri ({data.lowStock.count})
                  </Link>
                </Button>
              </>
            )}
          </Section>
        ) : null}

        {data.transfers ? (
          <Section title="Transferuri în tranzit" icon={ArrowLeftRight}>
            {data.transfers.count === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Niciun transfer deschis.
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {data.transfers.rows.map((row) => (
                    <li key={row._id} className="text-sm">
                      <Link
                        to={`/admin/transfers/${row._id}`}
                        className="font-medium text-amber-700 hover:underline dark:text-amber-400"
                      >
                        {row.fromName ?? '—'} → {row.toName ?? '—'}
                      </Link>
                      <span className="ml-2 text-stone-500 dark:text-stone-400">
                        {row.inTransitUnits} buc.
                      </span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="link" className="mt-2 px-0">
                  <Link to="/admin/transfers?status=in_transit">
                    Vezi toate ({data.transfers.count})
                  </Link>
                </Button>
              </>
            )}
          </Section>
        ) : null}

        {data.exceptions ? (
          <Section title="Excepții" icon={AlertTriangle}>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between gap-2">
                <span className="text-stone-700 dark:text-stone-300">
                  Comenzi cu stoc de verificat
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/orders">
                    {data.exceptions.needsReview}
                  </Link>
                </Button>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="text-stone-700 dark:text-stone-300">
                  Balanțe de reconciliat
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/inventory">
                    {data.exceptions.invalidBalances}
                  </Link>
                </Button>
              </li>
              {data.exceptions.posPrepared !== null ? (
                <li className="flex items-center justify-between gap-2">
                  <span className="text-stone-700 dark:text-stone-300">
                    Plăți POS pregătite
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/admin/fairs">
                      {data.exceptions.posPrepared}
                    </Link>
                  </Button>
                </li>
              ) : null}
            </ul>
          </Section>
        ) : null}
      </div>
    </section>
  );
};

export default Dashboard;
