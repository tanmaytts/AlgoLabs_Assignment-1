import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchStock } from '../api/client';
import PriceChart from '../components/PriceChart';
import CandlestickChart from '../components/CandlestickChart';
import { Loading, ErrorView } from '../components/StateViews';
import {
  formatPrice,
  formatPct,
  formatMarketCap,
  formatNum,
  formatVolume,
  changePctColor,
} from '../utils/format';

function FundamentalsRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-slate-700 last:border-0">
      <span className="text-xs text-gray-500 dark:text-slate-400 font-medium">{label}</span>
      <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 font-mono">{value}</span>
    </div>
  );
}

export default function StockDetail() {
  const { ticker } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartMode, setChartMode] = useState('line');

  const decodedTicker = decodeURIComponent(ticker);

  useEffect(() => {
    if (!decodedTicker) return;
    setLoading(true);
    setError(null);
    fetchStock(decodedTicker)
      .then((data) => {
        setStock(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [decodedTicker]);

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Loading message={`Loading ${decodedTicker}...`} />
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        >
          Back
        </button>
        <ErrorView error={error} endpoint={`/api/stocks/${decodedTicker}`} />
      </main>
    );
  }

  if (!stock) return null;

  const changeColor = changePctColor(stock.day_change_pct);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-5 inline-block rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
      >
        Back to Dashboard
      </button>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{stock.name}</h1>
              <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded">
                {stock.ticker}
              </span>
              {stock.exchange && (
                <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded">
                  {stock.exchange}
                </span>
              )}
            </div>
            {stock.sector && (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {stock.sector}
                {stock.industry ? ` - ${stock.industry}` : ''}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 font-mono">
              {formatPrice(stock.price)}
            </p>
            <p className={`text-sm font-semibold font-mono ${changeColor}`}>
              {formatPct(stock.day_change_pct)} today
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Chart mode toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setChartMode('line')}
              aria-pressed={chartMode === 'line'}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                chartMode === 'line'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              Line Chart
            </button>
            <button
              onClick={() => setChartMode('candle')}
              aria-pressed={chartMode === 'candle'}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                chartMode === 'candle'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              Candlestick + Volume
            </button>
          </div>
          {chartMode === 'line' ? (
            <PriceChart ticker={decodedTicker} />
          ) : (
            <CandlestickChart ticker={decodedTicker} />
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-3">
            Fundamentals
          </h2>
          <FundamentalsRow label="Market Cap" value={formatMarketCap(stock.market_cap)} />
          <FundamentalsRow label="P/E Ratio" value={formatNum(stock.pe_ratio)} />
          <FundamentalsRow label="EPS" value={formatNum(stock.eps)} />
          <FundamentalsRow label="Volume" value={formatVolume(stock.volume)} />
          <FundamentalsRow label="52W High" value={formatPrice(stock.week52_high)} />
          <FundamentalsRow label="52W Low" value={formatPrice(stock.week52_low)} />
        </div>
      </div>
    </main>
  );
}
