import { useState, useEffect } from 'react';
import { fetchStocks } from '../api/client';
import { Loading, ErrorView, EmptyView } from '../components/StateViews';
import { formatPct, formatNum } from '../utils/format';

/**
 * Heatmap color scale interpretation for each metric:
 *
 * day_change_pct: higher is better (big gain = green, big loss = red)
 * pe_ratio: LOWER is better for value investors (low P/E = green, high P/E = red).
 *   A high P/E means paying more for each unit of earnings. The scale is
 *   inverted so the cheapest stocks appear green.
 * eps: higher is better (more earnings per share = green)
 *
 * Color interpolation: each cell is placed on a 0..1 scale within its column's
 * min/max range, then mapped through a green-to-red gradient. For pe_ratio the
 * scale is inverted (1 - t) before coloring.
 */

const METRICS = [
  {
    key: 'day_change_pct',
    label: 'Day Change %',
    format: (v) => formatPct(v),
    higherIsBetter: true,
  },
  {
    key: 'pe_ratio',
    label: 'P/E Ratio',
    format: (v) => formatNum(v),
    higherIsBetter: false,
  },
  {
    key: 'eps',
    label: 'EPS',
    format: (v) => formatNum(v),
    higherIsBetter: true,
  },
];

/**
 * Interpolates between red (#dc2626) and green (#16a34a) via a neutral gray.
 * t = 0 => red, t = 0.5 => gray/neutral, t = 1 => green.
 * The text color is chosen for legibility against the background.
 */
function heatColor(t) {
  const c = Math.max(0, Math.min(1, t));

  if (c < 0.5) {
    /* red (#dc2626) to neutral (#9ca3af) */
    const u = c / 0.5;
    const r = Math.round(220 + (156 - 220) * u);
    const g = Math.round(38 + (163 - 38) * u);
    const b = Math.round(38 + (175 - 38) * u);
    return { bg: `rgb(${r},${g},${b})`, text: c < 0.25 ? '#fff' : '#1f2937' };
  } else {
    /* neutral (#9ca3af) to green (#16a34a) */
    const u = (c - 0.5) / 0.5;
    const r = Math.round(156 + (22 - 156) * u);
    const g = Math.round(163 + (163 - 163) * u);
    const b = Math.round(175 + (74 - 175) * u);
    return { bg: `rgb(${r},${g},${b})`, text: c > 0.75 ? '#fff' : '#1f2937' };
  }
}

function computeColumnStats(stocks, key) {
  const values = stocks.map((s) => s[key]).filter((v) => v != null && !isNaN(v));
  if (values.length === 0) return { min: 0, max: 0 };
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function colorForCell(value, min, max, higherIsBetter) {
  if (value == null || isNaN(value)) {
    return { bg: '#f3f4f6', text: '#9ca3af' };
  }
  const range = max - min;
  if (range === 0) return { bg: '#e5e7eb', text: '#374151' };
  let t = (value - min) / range;
  if (!higherIsBetter) t = 1 - t;
  return heatColor(t);
}

export default function Heatmap() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchStocks()
      .then((data) => {
        if (!cancelled) {
          setStocks(data);
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
  }, []);

  const columnStats = METRICS.reduce((acc, m) => {
    acc[m.key] = computeColumnStats(stocks, m.key);
    return acc;
  }, {});

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
        Financial Ratio Heatmap
      </h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        Color scale: green = relatively better, red = relatively worse (within each column's range).
        For P/E Ratio, lower values are considered better (cheaper valuation), so lower P/E is green.
      </p>

      {loading && <Loading message="Loading stock data..." />}
      {!loading && error && (
        <ErrorView error={error} endpoint="/api/stocks" />
      )}
      {!loading && !error && stocks.length === 0 && (
        <EmptyView message="No stock data available." />
      )}

      {!loading && !error && stocks.length > 0 && (
        <>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-4">
            <span className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
              Legend
            </span>
            <div className="flex items-center gap-2">
              <div
                className="w-24 h-5 rounded"
                style={{
                  background: 'linear-gradient(to right, #dc2626, #9ca3af, #16a34a)',
                }}
              />
              <span className="text-xs text-gray-500 dark:text-slate-400">Low / Worse</span>
              <span className="text-xs text-gray-400 dark:text-slate-500 mx-1">to</span>
              <span className="text-xs text-gray-500 dark:text-slate-400">High / Better</span>
            </div>
            <div className="ml-4 text-xs text-gray-400 dark:text-slate-500 border-l border-gray-200 dark:border-slate-700 pl-4">
              P/E Ratio is inverted: lower P/E = green (better value)
            </div>
          </div>

          {/* Heatmap table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide sticky left-0 bg-gray-50 dark:bg-slate-700/50 z-10">
                      Company
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                      Ticker
                    </th>
                    {METRICS.map((m) => (
                      <th
                        key={m.key}
                        className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide min-w-[110px]"
                      >
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/30">
                  {stocks.map((stock) => (
                    <tr key={stock.ticker} className="hover:brightness-95 dark:hover:brightness-110 transition-all">
                      <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-slate-200 max-w-[180px] truncate sticky left-0 bg-white dark:bg-slate-800 z-10 border-r border-gray-50 dark:border-slate-700">
                        {stock.name}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded">
                          {stock.ticker}
                        </span>
                      </td>
                      {METRICS.map((m) => {
                        const val = stock[m.key];
                        const stats = columnStats[m.key];
                        const colors = colorForCell(
                          val,
                          stats.min,
                          stats.max,
                          m.higherIsBetter
                        );
                        return (
                          <td
                            key={m.key}
                            className="px-4 py-2.5 text-right font-mono text-xs font-semibold rounded-sm"
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                            }}
                          >
                            {val != null && !isNaN(val) ? m.format(val) : 'N/A'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Column range info */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {METRICS.map((m) => {
              const stats = columnStats[m.key];
              return (
                <div
                  key={m.key}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-xs"
                >
                  <p className="font-semibold text-gray-600 dark:text-slate-300 mb-1">{m.label}</p>
                  <p className="text-gray-400 dark:text-slate-500">
                    Range: {m.format(stats.min)} to {m.format(stats.max)}
                  </p>
                  <p className="text-gray-400 dark:text-slate-500 mt-0.5">
                    {m.higherIsBetter ? 'Higher = green' : 'Lower = green (better value)'}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
