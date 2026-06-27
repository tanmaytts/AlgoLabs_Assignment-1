import { useState, useEffect } from 'react';
import { fetchStocks, fetchStock } from '../api/client';
import { Loading, ErrorView, EmptyView } from '../components/StateViews';
import {
  formatPrice,
  formatPct,
  formatMarketCap,
  formatNum,
  formatVolume,
  changePctColor,
} from '../utils/format';

const METRICS = [
  { key: 'price', label: 'Price', format: formatPrice },
  {
    key: 'day_change_pct',
    label: 'Day Change',
    format: formatPct,
    colorFn: changePctColor,
  },
  { key: 'market_cap', label: 'Market Cap', format: formatMarketCap },
  { key: 'pe_ratio', label: 'P/E Ratio', format: formatNum },
  { key: 'eps', label: 'EPS', format: formatNum },
  { key: 'volume', label: 'Volume', format: formatVolume },
  { key: 'week52_high', label: '52W High', format: formatPrice },
  { key: 'week52_low', label: '52W Low', format: formatPrice },
];

const MIN_TICKERS = 2;
const MAX_TICKERS = 5;

export default function Compare() {
  const [allStocks, setAllStocks] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);

  const [selectedTickers, setSelectedTickers] = useState([]);
  const [compareData, setCompareData] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareErrors, setCompareErrors] = useState({});

  useEffect(() => {
    fetchStocks()
      .then((data) => {
        setAllStocks(data);
        setListLoading(false);
      })
      .catch((err) => {
        setListError(err);
        setListLoading(false);
      });
  }, []);

  function toggleTicker(ticker) {
    setSelectedTickers((prev) => {
      if (prev.includes(ticker)) {
        return prev.filter((t) => t !== ticker);
      }
      if (prev.length >= MAX_TICKERS) return prev;
      return [...prev, ticker];
    });
  }

  async function handleCompare() {
    if (selectedTickers.length < MIN_TICKERS) return;
    setCompareLoading(true);
    setCompareErrors({});
    const results = await Promise.allSettled(
      selectedTickers.map((t) => fetchStock(t))
    );
    const data = [];
    const errors = {};
    results.forEach((result, i) => {
      const ticker = selectedTickers[i];
      if (result.status === 'fulfilled') {
        data.push(result.value);
      } else {
        errors[ticker] = result.reason;
        data.push({ ticker, _error: true });
      }
    });
    setCompareData(data);
    setCompareErrors(errors);
    setCompareLoading(false);
  }

  function clearAll() {
    setSelectedTickers([]);
    setCompareData([]);
    setCompareErrors({});
  }

  const canCompare = selectedTickers.length >= MIN_TICKERS;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">Compare Stocks</h1>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        Select 2 to 5 stocks to compare their key metrics side by side.
      </p>

      {listLoading && <Loading message="Loading stock list..." />}
      {!listLoading && listError && (
        <ErrorView error={listError} endpoint="/api/stocks" />
      )}
      {!listLoading && !listError && allStocks.length === 0 && (
        <EmptyView message="No stocks available to compare." />
      )}

      {!listLoading && !listError && allStocks.length > 0 && (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                Select tickers ({selectedTickers.length}/{MAX_TICKERS})
              </span>
              {selectedTickers.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allStocks.map((s) => {
                const selected = selectedTickers.includes(s.ticker);
                const disabled = !selected && selectedTickers.length >= MAX_TICKERS;
                return (
                  <button
                    key={s.ticker}
                    onClick={() => !disabled && toggleTicker(s.ticker)}
                    disabled={disabled}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      selected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : disabled
                        ? 'bg-gray-50 dark:bg-slate-700/30 text-gray-300 dark:text-slate-600 border-gray-100 dark:border-slate-700 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-400'
                    }`}
                  >
                    {s.ticker}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleCompare}
                disabled={!canCompare || compareLoading}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  canCompare && !compareLoading
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                {compareLoading ? 'Loading...' : 'Compare'}
              </button>
              {!canCompare && (
                <span className="text-xs text-gray-400 dark:text-slate-500">
                  Select at least {MIN_TICKERS} tickers to compare.
                </span>
              )}
            </div>
          </div>

          {compareLoading && <Loading message="Fetching stock details..." />}

          {!compareLoading && compareData.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide w-36">
                      Metric
                    </th>
                    {compareData.map((s) => (
                      <th
                        key={s.ticker}
                        className="px-4 py-3 text-center text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide"
                      >
                        {s.ticker}
                        {s.name && (
                          <div className="text-gray-400 dark:text-slate-500 font-normal normal-case text-xs mt-0.5 truncate max-w-32">
                            {s.name}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {METRICS.map((metric) => (
                    <tr
                      key={metric.key}
                      className="border-b border-gray-50 dark:border-slate-700/50 last:border-0"
                    >
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400 font-medium">
                        {metric.label}
                      </td>
                      {compareData.map((s) => {
                        if (s._error) {
                          const err = compareErrors[s.ticker];
                          return (
                            <td
                              key={s.ticker}
                              className="px-4 py-3 text-center text-xs text-red-400"
                            >
                              {metric.key === 'price'
                                ? `Error: ${err?.message ?? 'failed'}`
                                : '-'}
                            </td>
                          );
                        }
                        const val = s[metric.key];
                        const formatted = metric.format(val);
                        const colorCls = metric.colorFn
                          ? metric.colorFn(val)
                          : 'text-gray-800 dark:text-slate-200';
                        return (
                          <td
                            key={s.ticker}
                            className={`px-4 py-3 text-center font-mono text-sm font-semibold ${colorCls}`}
                          >
                            {formatted}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
