import { useState, useEffect } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchStockHistory } from '../api/client';
import { Loading, ErrorView, EmptyView } from './StateViews';
import { formatPrice } from '../utils/format';
import { computeSMA } from '../utils/indicators';

const RANGES = ['1M', '6M', '1Y'];

/* SMA color constants */
const SMA20_COLOR = '#f59e0b'; /* amber-400 */
const SMA50_COLOR = '#8b5cf6'; /* violet-500 */

function formatDate(dateStr, range) {
  const d = new Date(dateStr);
  if (range === '1M') {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  const dark = isDarkMode();
  const closeEntry = payload.find((p) => p.dataKey === 'close');
  const sma20Entry = payload.find((p) => p.dataKey === 'sma20');
  const sma50Entry = payload.find((p) => p.dataKey === 'sma50');

  return (
    <div
      className={`rounded-lg shadow-md px-3 py-2 text-sm border ${
        dark
          ? 'bg-slate-800 border-slate-600 text-slate-100'
          : 'bg-white border-gray-200 text-gray-900'
      }`}
    >
      <p className={`text-xs mb-1 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</p>
      {closeEntry && (
        <p className="font-semibold text-blue-500">
          Close: {formatPrice(closeEntry.value)}
        </p>
      )}
      {sma20Entry && sma20Entry.value != null && (
        <p style={{ color: SMA20_COLOR }} className="font-medium text-xs">
          SMA 20: {formatPrice(sma20Entry.value)}
        </p>
      )}
      {sma50Entry && sma50Entry.value != null && (
        <p style={{ color: SMA50_COLOR }} className="font-medium text-xs">
          SMA 50: {formatPrice(sma50Entry.value)}
        </p>
      )}
    </div>
  );
}

export default function PriceChart({ ticker }) {
  const [range, setRange] = useState('1M');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* SMA toggle state - both on by default */
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(true);

  /* Re-render when theme changes so chart colors update */
  const [, setTick] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setTick((t) => t + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchStockHistory(ticker, range)
      .then((data) => {
        if (!cancelled) {
          setHistory(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ticker, range]);

  /* Build chart data with SMA values merged in */
  const closes = history.map((r) => r.close);
  const sma20Values = computeSMA(closes, 20);
  const sma50Values = computeSMA(closes, 50);

  const chartData = history.map((row, i) => ({
    date: formatDate(row.date, range),
    close: row.close,
    rawDate: row.date,
    sma20: sma20Values[i],
    sma50: sma50Values[i],
  }));

  const allPrices = chartData
    .flatMap((d) => [d.close, d.sma20, d.sma50])
    .filter((v) => v != null && !isNaN(v));
  const minVal = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const maxVal = allPrices.length > 0 ? Math.max(...allPrices) : 0;
  const padding = (maxVal - minVal) * 0.1 || 10;

  const dark = isDarkMode();
  const gridColor = dark ? '#334155' : '#f1f5f9';
  const tickColor = dark ? '#64748b' : '#94a3b8';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
          Price History
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* SMA toggle pills */}
          <button
            onClick={() => setShowSMA20((v) => !v)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              showSMA20
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                : 'border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500 hover:border-amber-300'
            }`}
          >
            SMA 20
          </button>
          <button
            onClick={() => setShowSMA50((v) => !v)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              showSMA50
                ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                : 'border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500 hover:border-violet-300'
            }`}
          >
            SMA 50
          </button>

          {/* Range buttons */}
          <div className="flex gap-1 ml-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  range === r
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <Loading message={`Loading ${range} price history...`} />}
      {!loading && error && (
        <ErrorView
          error={error}
          endpoint={`/api/stocks/${ticker}/history?range=${range}`}
        />
      )}
      {!loading && !error && chartData.length === 0 && (
        <EmptyView message="No price history available for this range." />
      )}
      {!loading && !error && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart
            data={chartData}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: tickColor }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minVal - padding, maxVal + padding]}
              tick={{ fontSize: 11, fill: tickColor }}
              tickLine={false}
              axisLine={false}
              width={72}
              tickFormatter={(v) =>
                `Rs ${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
              }
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Close price line */}
            <Line
              type="monotone"
              dataKey="close"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#2563eb' }}
            />

            {/*
              SMA(20) overlay in amber. connectNulls draws through gaps so the
              line renders as soon as 20 data points are available.
              On 1M range, SMA(50) may have no points - that is expected.
            */}
            {showSMA20 && (
              <Line
                type="monotone"
                dataKey="sma20"
                stroke={SMA20_COLOR}
                strokeWidth={1.5}
                dot={false}
                connectNulls
                activeDot={false}
              />
            )}

            {/* SMA(50) overlay in violet */}
            {showSMA50 && (
              <Line
                type="monotone"
                dataKey="sma50"
                stroke={SMA50_COLOR}
                strokeWidth={1.5}
                dot={false}
                connectNulls
                activeDot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
