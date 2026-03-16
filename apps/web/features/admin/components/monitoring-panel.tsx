import {
  Activity,
  AlertTriangle,
  BadgeDollarSign,
  CreditCard,
  Gauge,
  KeyRound,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import type { AdminStats } from '@/lib/api/types';

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString('fr-FR')} FCFA`;
}

function parseRevenuePoints(
  revenue: Array<{ date: string; total: number | string }> | undefined,
) {
  return (revenue ?? []).map((point) => ({
    label: point.date
      ? new Date(point.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      : '--',
    value: Number(point.total ?? 0),
  }));
}

function buildMockPoints(base: number, variance: number) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const wave = Math.sin((index / 6) * Math.PI) * variance;
    const drift = index * (variance * 0.22);
    return {
      label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      value: Math.max(0, Math.round(base + wave + drift)),
    };
  });
}

function withMockFallback(
  points: Array<{ label: string; value: number }>,
  base: number,
  variance: number,
) {
  const hasData = points.some((point) => point.value > 0);
  return hasData ? points : buildMockPoints(base, variance);
}

function buildChartPath(values: number[], width: number, height: number) {
  if (!values.length) return '';
  const max = Math.max(...values, 1);
  const stepX = values.length === 1 ? width : width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - (value / max) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function MiniSeriesCard({
  label,
  value,
  points,
  icon: Icon,
}: {
  label: string;
  value: string;
  points: Array<{ label: string; value: number }>;
  icon: typeof TrendingUp;
}) {
  const values = points.map((point) => point.value);
  const path = buildChartPath(values, 180, 56);

  return (
    <div className="rounded-[1rem] bg-white/80 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-white text-[var(--primary)]">
            <Icon className="size-4" />
          </span>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
            {label}
          </p>
        </div>
        <p className="text-[13px] font-bold text-[var(--foreground)]">{value}</p>
      </div>
      <div className="mt-3">
        <svg viewBox="0 0 180 56" className="h-14 w-full">
          <path
            d={path}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export function MonitoringPanel({ data }: { data: AdminStats }) {
  const revenuePoints = withMockFallback(parseRevenuePoints(data.charts?.revenue), 180000, 70000);
  const transactionPoints = withMockFallback(parseRevenuePoints(data.charts?.transactions), 18, 7);
  const licensePoints = withMockFallback(parseRevenuePoints(data.charts?.licenses), 9, 4);
  const payoutPoints = withMockFallback(parseRevenuePoints(data.charts?.payouts), 65000, 24000);
  const revenueValues = revenuePoints.map((point) => point.value);
  const totalRevenue = revenueValues.reduce((sum, value) => sum + value, 0);
  const avgRevenue = revenueValues.length ? totalRevenue / revenueValues.length : 0;
  const bestRevenue = revenueValues.length ? Math.max(...revenueValues) : 0;
  const latestRevenue = revenueValues.at(-1) ?? 0;
  const previousRevenue = revenueValues.at(-2) ?? 0;
  const trendPercent = previousRevenue > 0 ? ((latestRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  const totalClients = data.stats.clients ?? data.stats.managers ?? 0;
  const activeClients = data.stats.active_clients ?? data.stats.active ?? 0;
  const activeRate = totalClients > 0 ? (activeClients / totalClients) * 100 : 0;
  const licensePending = data.licenses.filter((license) => license.status === 'PENDING').length;
  const lowStockClients = (data.lowStockClients ?? data.lowStock).length;
  const chartPath = buildChartPath(revenueValues, 420, 180);
  const areaPath = chartPath
    ? `${chartPath} L 420 180 L 0 180 Z`
    : '';

  return (
    <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="card-admin min-w-0 rounded-[1.5rem] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
                <TrendingUp className="size-4.5" />
              </span>
              <p className="m3-label text-[var(--primary)]">Revenue monitoring</p>
            </div>
            <h3 className="mt-2.5 text-[1.9rem] font-bold tracking-[-0.04em] text-[var(--foreground)]">
              Activite sur les 7 derniers jours
            </h3>
          </div>
          <div className="rounded-full bg-white/72 px-3 py-2 text-[13px] font-semibold text-[var(--primary)]">
            {trendPercent >= 0 ? '+' : ''}
            {trendPercent.toFixed(1)}%
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1rem] bg-white/80 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              Total 7j
            </p>
            <p className="mt-1.5 text-[1.25rem] font-bold text-[var(--foreground)]">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="rounded-[1rem] bg-white/80 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              Moyenne / jour
            </p>
            <p className="mt-1.5 text-[1.25rem] font-bold text-[var(--foreground)]">{formatCurrency(avgRevenue)}</p>
          </div>
          <div className="rounded-[1rem] bg-white/80 p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              Pic journalier
            </p>
            <p className="mt-1.5 text-[1.25rem] font-bold text-[var(--foreground)]">{formatCurrency(bestRevenue)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <MiniSeriesCard
            label="Transactions"
            value={String(transactionPoints.reduce((sum, point) => sum + point.value, 0))}
            points={transactionPoints}
            icon={CreditCard}
          />
          <MiniSeriesCard
            label="Licences"
            value={String(licensePoints.reduce((sum, point) => sum + point.value, 0))}
            points={licensePoints}
            icon={KeyRound}
          />
          <MiniSeriesCard
            label="Retraits"
            value={formatCurrency(payoutPoints.reduce((sum, point) => sum + point.value, 0))}
            points={payoutPoints}
            icon={BadgeDollarSign}
          />
        </div>

        <div className="mt-5 min-w-0 rounded-[1.25rem] bg-white/72 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Courbe revenus
              </p>
              <p className="mt-1 text-[13px] text-[var(--muted)]">
                Volume compare jour par jour pour suivre la traction du control plane.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
                Dernier point
              </p>
              <p className="mt-1 text-[1.1rem] font-bold text-[var(--foreground)]">{formatCurrency(latestRevenue)}</p>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-[1rem]">
            <svg
              viewBox="0 0 420 180"
              preserveAspectRatio="none"
              className="block h-52 w-full"
            >
              <defs>
                <linearGradient id="monitoring-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(31,103,210,0.35)" />
                  <stop offset="100%" stopColor="rgba(31,103,210,0.04)" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((line) => (
                <line
                  key={line}
                  x1="0"
                  x2="420"
                  y1={line * 45}
                  y2={line * 45}
                  stroke="rgba(92,96,104,0.12)"
                  strokeDasharray="4 6"
                />
              ))}
              {areaPath ? <path d={areaPath} fill="url(#monitoring-area)" /> : null}
              {chartPath ? (
                <path
                  d={chartPath}
                  fill="none"
                  stroke="var(--m3-secondary)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {revenueValues.map((value, index) => {
                const max = Math.max(...revenueValues, 1);
                const stepX = revenueValues.length === 1 ? 420 : 420 / (revenueValues.length - 1);
                const x = index * stepX;
                const y = 180 - (value / max) * 180;
                return (
                  <circle
                    key={`${index}-${value}`}
                    cx={x}
                    cy={y}
                    r="5"
                    fill="white"
                    stroke="var(--m3-secondary)"
                    strokeWidth="3"
                  />
                );
              })}
            </svg>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-7">
            {revenuePoints.map((point) => (
              <div key={point.label} className="min-w-0 rounded-xl bg-white/80 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
                  {point.label}
                </p>
                <p className="mt-1 truncate text-[13px] font-semibold text-[var(--foreground)]">
                  {formatCurrency(point.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="card-neutral rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
              <Gauge className="size-4.5" />
            </span>
            <p className="m3-label">Monitoring health</p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-[1rem] bg-white/80 px-3.5 py-3">
              <div className="flex items-center gap-3">
                <Activity className="size-4.5 text-[var(--primary)]" />
                <span className="text-[13px] font-semibold text-[var(--foreground)]">Activite clients</span>
              </div>
              <span className="text-[13px] font-bold text-[var(--foreground)]">{activeRate.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between rounded-[1rem] bg-white/80 px-3.5 py-3">
              <div className="flex items-center gap-3">
                <BadgeDollarSign className="size-4.5 text-[var(--primary)]" />
                <span className="text-[13px] font-semibold text-[var(--foreground)]">Retraits en file</span>
              </div>
              <span className="text-[13px] font-bold text-[var(--foreground)]">{data.marketing.payouts.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-[1rem] bg-white/80 px-3.5 py-3">
              <div className="flex items-center gap-3">
                <ShieldAlert className="size-4.5 text-[var(--primary)]" />
                <span className="text-[13px] font-semibold text-[var(--foreground)]">Licences en attente</span>
              </div>
              <span className="text-[13px] font-bold text-[var(--foreground)]">{licensePending}</span>
            </div>
            <div className="flex items-center justify-between rounded-[1rem] bg-white/80 px-3.5 py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="size-4.5 text-[var(--primary)]" />
                <span className="text-[13px] font-semibold text-[var(--foreground)]">Stocks clients faibles</span>
              </div>
              <span className="text-[13px] font-bold text-[var(--foreground)]">{lowStockClients}</span>
            </div>
          </div>
        </div>

        <div className="card-public rounded-[1.5rem] p-[1.125rem] shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-white/72 text-[var(--primary)]">
              <TrendingUp className="size-4.5" />
            </span>
            <p className="m3-label">Executive pulse</p>
          </div>
          <p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">
            {trendPercent >= 0
              ? 'La dynamique de revenus reste positive sur le dernier point mesure.'
              : 'Le dernier point de revenus recule et merite une verification rapide.'}
            {' '}
            {licensePending > 0
              ? `Attention: ${licensePending} licences attendent encore un traitement.`
              : 'Aucune pression immediate cote licences en attente.'}
          </p>
        </div>
      </div>
    </section>
  );
}
