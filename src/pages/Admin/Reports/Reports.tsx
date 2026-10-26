import type React from 'react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { Download } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { bucharestToday, monthStart } from '../../../utils/date.utils';
import { downloadCsv, toCsv } from '../../../utils/csv.utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';


const lei = (cents: number | null): number | null =>
  cents === null ? null : cents / 100;
const leiText = (cents: number | null): string =>
  cents === null ? '—' : `${lei(cents)!.toFixed(2)} RON`;

type Channel = 'all' | 'online' | 'pos';
const isChannel = (value: string | null): value is Channel =>
  value === 'all' || value === 'online' || value === 'pos';

const isDate = (value: string | null): value is string =>
  value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);

const PAGE_SIZE = 25;

const SectionCard = ({
  title,
  note,
  csv,
  filename,
  children,
}: {
  title: string;
  note?: string;
  csv: () => (string | number | null)[][];
  filename: string;
  children: React.ReactNode;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
      <div>
        <CardTitle className="text-lg">{title}</CardTitle>
        {note ? (
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            {note}
          </p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => downloadCsv(filename, toCsv(csv()))}
      >
        <Download className="h-4 w-4" /> Export CSV
      </Button>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

export const Reports: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = bucharestToday();
  const from = isDate(searchParams.get('from'))
    ? searchParams.get('from')!
    : monthStart(today);
  const to = isDate(searchParams.get('to'))
    ? searchParams.get('to')!
    : today;
  const channelParam = searchParams.get('channel');
  const channel: Channel = isChannel(channelParam) ? channelParam : 'all';
  const fairId = searchParams.get('fairId');
  const [productPage, setProductPage] = useState(1);

  const fairs = useQuery(api.pos.listFairs, { includeArchived: true });

  const args = useMemo(
    () => ({
      from,
      to,
      channel: channel as 'all' | 'online' | 'pos',
      ...(fairId ? { fairId: fairId as never } : {}),
    }),
    [from, to, channel, fairId],
  );
  const { data, error } = useAdminQuery(api.reports.summary, args);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
    setProductPage(1);
  };

  const reportName = (table: string) =>
    `raport-${table}-${from}_${to}.csv`;

  const totalsRow = (label: string, t: {
    grossCents: number;
    discountCents: number;
    returnsCents: number;
    netCents: number;
    count: number;
    units: number;
  } | null): (string | number | null)[] =>
    t
      ? [
          label,
          lei(t.grossCents),
          lei(t.discountCents),
          lei(t.returnsCents),
          lei(t.netCents),
          t.count,
          t.units,
        ]
      : [label, null, null, null, null, null, null];

  if (error) {
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
        {error}
      </p>
    );
  }

  const products = data?.productsSold ?? [];
  const productPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const currentProductPage = Math.min(productPage, productPages);
  const pagedProducts = products.slice(
    (currentProductPage - 1) * PAGE_SIZE,
    currentProductPage * PAGE_SIZE,
  );
  const maxDayNet = Math.max(
    1,
    ...(data?.byDay.map((row) => row.onlineNetCents + row.posNetCents) ?? []),
  );

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-stone-900 dark:text-stone-50">
          Rapoarte
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Vânzări și încasări pe perioadă, fus orar Europe/Bucharest.
        </p>
      </header>

      <Card>
        <CardContent className="grid grid-cols-1 gap-3 p-4 md:grid-cols-4">
          <div>
            <Label htmlFor="report-from">De la</Label>
            <Input
              id="report-from"
              type="date"
              value={from}
              onChange={(event) => setParam('from', event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="report-to">Până la</Label>
            <Input
              id="report-to"
              type="date"
              value={to}
              onChange={(event) => setParam('to', event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="report-channel">Canal</Label>
            <select
              id="report-channel"
              value={channel}
              onChange={(event) => {
                const value = event.target.value;
                const next = new URLSearchParams(searchParams);
                if (value === 'all') next.delete('channel');
                else next.set('channel', value);
                if (value !== 'pos') next.delete('fairId');
                setSearchParams(next);
                setProductPage(1);
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Toate</option>
              <option value="online">Online</option>
              <option value="pos">POS</option>
            </select>
          </div>
          <div>
            <Label htmlFor="report-location">Locație</Label>
            <select
              id="report-location"
              value={fairId ?? 'all'}
              onChange={(event) => {
                const value = event.target.value;
                const next = new URLSearchParams(searchParams);
                if (value === 'all') next.delete('fairId');
                else {
                  next.set('fairId', value);
                  next.set('channel', 'pos');
                }
                setSearchParams(next);
                setProductPage(1);
              }}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Toate</option>
              {(fairs ?? []).map((fair) => (
                <option key={fair._id} value={fair._id}>
                  {fair.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {data === undefined ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Se încarcă raportul…
        </p>
      ) : (
        <>
          <SectionCard
            title="Sumar vânzări"
            note="POS: fără flux de retur."
            filename={reportName('vanzari')}
            csv={() => [
              ['Canal', 'Brut (lei)', 'Reduceri (lei)', 'Anulări/Retururi (lei)', 'Net (lei)', 'Nr.', 'Bucăți'],
              totalsRow('Online', data.sales.online),
              totalsRow('POS', data.sales.pos),
              totalsRow('Total', data.sales.total),
            ]}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Brut</TableHead>
                  <TableHead className="text-right">Reduceri</TableHead>
                  <TableHead className="text-right">
                    Anulări după plată
                  </TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead className="text-right">Nr.</TableHead>
                  <TableHead className="text-right">Bucăți</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(
                  [
                    ['Online', data.sales.online],
                    ['POS', data.sales.pos],
                    ['Total', data.sales.total],
                  ] as const
                ).map(([label, t]) => (
                  <TableRow key={label}>
                    <TableCell className="font-medium">{label}</TableCell>
                    {t ? (
                      <>
                        <TableCell className="text-right">
                          {leiText(t.grossCents)}
                        </TableCell>
                        <TableCell className="text-right">
                          {leiText(t.discountCents)}
                        </TableCell>
                        <TableCell className="text-right">
                          {leiText(t.returnsCents)}
                        </TableCell>
                        <TableCell className="text-right">
                          {leiText(t.netCents)}
                        </TableCell>
                        <TableCell className="text-right">{t.count}</TableCell>
                        <TableCell className="text-right">{t.units}</TableCell>
                      </>
                    ) : (
                      <TableCell colSpan={6} className="text-stone-400">
                        canal neinclus
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>

          <SectionCard
            title="Încasări"
            note="Încasările online vechi fără confirmare Stripe și rambursările manuale sunt informative, nu intră în totaluri."
            filename={reportName('incasari')}
            csv={() => [
              ['Tip', 'Valoare (lei)', 'Nr.'],
              ['POS numerar', lei(data.collections.posCashCents), null],
              ['POS card', lei(data.collections.posCardCents), null],
              [
                'Online card confirmat Stripe',
                lei(data.collections.onlineCardConfirmedCents),
                data.collections.onlineCardConfirmedCount,
              ],
              [
                'Online neverificat (comenzi vechi)',
                lei(data.collections.onlineUnverifiedCents),
                data.collections.onlineUnverifiedCount,
              ],
              [
                'Rambursări manuale necesare',
                lei(data.collections.refundsManualCents),
                data.collections.refundsManualCount,
              ],
            ]}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tip</TableHead>
                  <TableHead className="text-right">Valoare</TableHead>
                  <TableHead className="text-right">Nr.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>POS numerar</TableCell>
                  <TableCell className="text-right">
                    {leiText(data.collections.posCashCents)}
                  </TableCell>
                  <TableCell className="text-right">—</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>POS card</TableCell>
                  <TableCell className="text-right">
                    {leiText(data.collections.posCardCents)}
                  </TableCell>
                  <TableCell className="text-right">—</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Online card confirmat Stripe</TableCell>
                  <TableCell className="text-right">
                    {leiText(data.collections.onlineCardConfirmedCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {data.collections.onlineCardConfirmedCount ?? '—'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Online neverificat (comenzi vechi)</TableCell>
                  <TableCell className="text-right">
                    {leiText(data.collections.onlineUnverifiedCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {data.collections.onlineUnverifiedCount ?? '—'}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Rambursări manuale necesare</TableCell>
                  <TableCell className="text-right">
                    {leiText(data.collections.refundsManualCents)}
                  </TableCell>
                  <TableCell className="text-right">
                    {data.collections.refundsManualCount ?? '—'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </SectionCard>

          {data.ordersByState ? (
            <SectionCard
              title="Comenzi pe stări"
              filename={reportName('comenzi')}
              csv={() => [
                ['Stare', 'Nr.', 'Valoare (lei)'],
                ['Neplătite', data.ordersByState!.byPayment.pending.count, lei(data.ordersByState!.byPayment.pending.valueCents)],
                ['Plătite', data.ordersByState!.byPayment.paid.count, lei(data.ordersByState!.byPayment.paid.valueCents)],
                ['Anulate', data.ordersByState!.byPayment.cancelled.count, lei(data.ordersByState!.byPayment.cancelled.valueCents)],
                ...Object.entries(data.ordersByState!.byFulfillment).map(
                  ([state, count]) => [`Fulfillment: ${state}`, count, null],
                ),
              ]}
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plată</TableHead>
                      <TableHead className="text-right">Nr.</TableHead>
                      <TableHead className="text-right">Valoare</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(
                      [
                        ['Neplătite', data.ordersByState.byPayment.pending],
                        ['Plătite', data.ordersByState.byPayment.paid],
                        ['Anulate', data.ordersByState.byPayment.cancelled],
                      ] as const
                    ).map(([label, row]) => (
                      <TableRow key={label}>
                        <TableCell>{label}</TableCell>
                        <TableCell className="text-right">
                          {row.count}
                        </TableCell>
                        <TableCell className="text-right">
                          {leiText(row.valueCents)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead className="text-right">Nr.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(
                      [
                        ['ready', 'De pregătit'],
                        ['preparing', 'În pregătire'],
                        ['packed', 'Ambalată'],
                        ['shipped', 'Expediată'],
                        ['delivered', 'Livrată'],
                        ['blocked', 'Blocată'],
                        ['cancelled', 'Anulată'],
                      ] as const
                    ).map(([state, label]) => (
                      <TableRow key={state}>
                        <TableCell>{label}</TableCell>
                        <TableCell className="text-right">
                          {data.ordersByState!.byFulfillment[state]}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SectionCard>
          ) : null}

          {data.posByFair ? (
            <SectionCard
              title="POS pe târg"
              filename={reportName('pos-targ')}
              csv={() => [
                ['Târg', 'Brut (lei)', 'Reduceri (lei)', 'Net (lei)', 'Numerar (lei)', 'Card (lei)', 'Bonuri', 'Bucăți'],
                ...data.posByFair!.map((row) => [
                  row.fairName,
                  lei(row.grossCents),
                  lei(row.discountCents),
                  lei(row.netCents),
                  lei(row.cashCents),
                  lei(row.cardCents),
                  row.count,
                  row.units,
                ]),
              ]}
            >
              {data.posByFair.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Nicio vânzare POS în perioada selectată.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Târg</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-right">Numerar</TableHead>
                      <TableHead className="text-right">Card</TableHead>
                      <TableHead className="text-right">Bonuri</TableHead>
                      <TableHead className="text-right">Bucăți</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.posByFair.map((row) => (
                      <TableRow key={row.fairId}>
                        <TableCell className="font-medium">
                          {row.fairName}
                        </TableCell>
                        <TableCell className="text-right">
                          {leiText(row.netCents)}
                        </TableCell>
                        <TableCell className="text-right">
                          {leiText(row.cashCents)}
                        </TableCell>
                        <TableCell className="text-right">
                          {leiText(row.cardCents)}
                        </TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                        <TableCell className="text-right">{row.units}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </SectionCard>
          ) : null}

          <SectionCard
            title="Produse vândute"
            note="Brut = preț snapshot × cantitate, fără reduceri pe comandă."
            filename={reportName('produse')}
            csv={() => [
              ['Produs', 'Bucăți online', 'Bucăți returnate', 'Bucăți POS', 'Bucăți total', 'Brut (lei)'],
              ...products.map((row) => [
                row.name,
                row.onlineUnits,
                row.onlineReturnedUnits,
                row.posUnits,
                row.units,
                lei(row.grossCents),
              ]),
            ]}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produs</TableHead>
                  <TableHead className="text-right">Online</TableHead>
                  <TableHead className="text-right">Returnate</TableHead>
                  <TableHead className="text-right">POS</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Brut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedProducts.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right">
                      {row.onlineUnits}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.onlineReturnedUnits}
                    </TableCell>
                    <TableCell className="text-right">{row.posUnits}</TableCell>
                    <TableCell className="text-right">{row.units}</TableCell>
                    <TableCell className="text-right">
                      {leiText(row.grossCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {productPages > 1 ? (
              <nav
                aria-label="Paginare produse"
                className="mt-3 flex items-center justify-between"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProductPage(currentProductPage - 1)}
                  disabled={currentProductPage <= 1}
                >
                  Înapoi
                </Button>
                <p className="text-sm text-stone-600 dark:text-stone-400">
                  Pagina {currentProductPage} din {productPages}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProductPage(currentProductPage + 1)}
                  disabled={currentProductPage >= productPages}
                >
                  Înainte
                </Button>
              </nav>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Vânzări pe zile"
            filename={reportName('zile')}
            csv={() => [
              ['Zi', 'Net online (lei)', 'Net POS (lei)'],
              ...data.byDay.map((row) => [
                row.date,
                lei(row.onlineNetCents),
                lei(row.posNetCents),
              ]),
            ]}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zi</TableHead>
                  <TableHead className="w-2/5">Total net</TableHead>
                  <TableHead className="text-right">Online</TableHead>
                  <TableHead className="text-right">POS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byDay.map((row) => {
                  const net = row.onlineNetCents + row.posNetCents;
                  return (
                    <TableRow key={row.date}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 rounded bg-amber-500"
                            style={{
                              width: `${Math.max(0, Math.round((net / maxDayNet) * 100))}%`,
                            }}
                          />
                          <span className="text-xs text-stone-500">
                            {leiText(net)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {leiText(row.onlineNetCents)}
                      </TableCell>
                      <TableCell className="text-right">
                        {leiText(row.posNetCents)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </SectionCard>
        </>
      )}
    </section>
  );
};

export default Reports;
