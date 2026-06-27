import { useState, useEffect } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { fetchStockHistory } from '../api/client';
import { Loading, ErrorView, EmptyView } from './StateViews';
import { formatPrice, formatVolume } from '../utils/format';
import { computeSMA } from '../utils/indicators';

const RANGES = ['1M', '6M', '1Y'];

/* Trading-day counts for each display range */
const RANGE_DAYS = { '1M': 22, '6M': 126, '1Y': Infinity };

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

/**
 * Custom candlestick shape rendered as an SVG rect (body) plus a line (wick).
 * Green when close >= open, red when close < open.
 */
function CandlestickShape(props) {
  const { x, y, width, height, index, chartData } = props;

  if (
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined
  ) {
    return null;
  }

  const row = chartData && chartData[index];
  if (!row) return null;

  const isGreen = row.close >= row.open;
  const color = isGreen ? '#16a34a' : '#dc2626';

  /* The Bar renders using the candleRange value (high - low) so y/height cover
     the full wick range. We recompute body bounds from the coordinate values
     already provided by Recharts.
     y = top of wick (high), y + height = bottom of wick (low) */

  const wickX = x + width / 2;
  const wickTop = y;
  const wickBottom = y + height;

  /* Body: spans from open to close within the wick range */
  const wickRange = row.high - row.low;
  if (wickRange <= 0) {
    return (
      <line
        x1={wickX}
        y1={wickTop}
        x2={wickX}
        y2={wickBottom}
        stroke={color}
        strokeWidth={1}
      />
    );
  }

  const bodyTop =
    wickTop + ((row.high - Math.max(row.open, row.close)) / wickRange) * height;
  const bodyBottom =
    wickTop + ((row.high - Math.min(row.open, row.close)) / wickRange) * height;
  const bodyHeight = Math.max(bodyBottom - bodyTop, 1);

  const bodyWidth = Math.max(width * 0.6, 2);
  const bodyX = x + (width - bodyWidth) / 2;

  return (
    <g>
      {/* Wick */}
      <line
        x1={wickX}
        y1={wickTop}
        x2={wickX}
        y2={wickBottom}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Body */}
      <rect
        x={bodyX}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        fill={color}
        stroke={color}
        strokeWidth={0.5}
      />
    </g>
  );
}

function CandleTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const isGreen = row.close >= row.open;

  const dark = isDarkMode();
  const sma20Entry = payload.find((p) => p.dataKey === 'sma20');
  const sma50Entry = payload.find((p) => p.dataKey === 'sma50');

  return (
    <div
      className={`rounded-lg shadow-md px-3 py-2 text-xs border ${
        dark
          ? 'bg-slate-800 border-slate-600 text-slate-100'
          : 'bg-white border-gray-200 text-gray-900'
      }`}
    >
      <p className={`mb-1 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>{label}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        <span className={dark ? 'text-slate-400' : 'text-gray-500'}>Open</span>
        <span className="font-semibold font-mono">{formatPrice(row.open)}</span>
        <span className={dark ? 'text-slate-400' : 'text-gray-500'}>High</span>
        <span className="font-semibold font-mono text-green-500">{formatPrice(row.high)}</span>
        <span className={dark ? 'text-slate-400' : 'text-gray-500'}>Low</span>
        <span className="font-semibold font-mono text-red-500">{formatPrice(row.low)}</span>
        <span className={dark ? 'text-slate-400' : 'text-gray-500'}>Close</span>
        <span
          className={`font-semibold font-mono ${
            isGreen ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {formatPrice(row.close)}
        </span>
        <span className={dark ? 'text-slate-400' : 'text-gray-500'}>Volume</span>
        <span className="font-semibold font-mono">{formatVolume(row.volume)}</span>
      </div>
      {sma20Entry && sma20Entry.value != null && (
        <p style={{ color: SMA20_COLOR }} className="font-medium mt-1">
          SMA 20: {formatPrice(sma20Entry.value)}
        </p>
      )}
      {sma50Entry && sma50Entry.value != null && (
        <p style={{ color: SMA50_COLOR }} className="font-medium mt-0.5">
          SMA 50: {formatPrice(sma50Entry.value)}
        </p>
      )}
    </div>
  );
}

export default function CandlestickChart({ ticker }) {
  const [range, setRange] = useState('1M');
  /* fullHistory always holds 1Y of data; fetched once per ticker */
  const [fullHistory, setFullHistory] = useState([]);
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

  /* Fetch the full 1Y series once per ticker. Range changes only re-slice. */
  useEffect(() => {
    if (!ticker) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchStockHistory(ticker, '1Y')
      .then((data) => {
        if (!cancelled) {
          setFullHistory(Array.isArray(data) ? data : []);
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
  }, [ticker]);

  /* Compute SMA over the full 1Y series so values are warm for any sub-range */
  const fullCloses = fullHistory.map((r) => r.close);
  const fullSMA20 = computeSMA(fullCloses, 20);
  const fullSMA50 = computeSMA(fullCloses, 50);

  /* Slice to the selected display range (client-side, no re-fetch) */
  const days = RANGE_DAYS[range] ?? 22;
  const sliceStart = days === Infinity ? 0 : Math.max(0, fullHistory.length - days);
  const history = fullHistory.slice(sliceStart);
  const sma20Values = fullSMA20.slice(sliceStart);
  const sma50Values = fullSMA50.slice(sliceStart);

  const chartData = history.map((row, i) => ({
    date: formatDate(row.date, range),
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
    /* candleRange drives the Bar height so it covers the full high-low span */
    candleRange: row.high - row.low,
    /* candleBase is the low, so the Bar starts at the right position */
    candleBase: row.low,
    sma20: sma20Values[i],
    sma50: sma50Values[i],
  }));

  const highs = chartData.map((d) => d.high).filter((v) => v != null);
  const lows = chartData.map((d) => d.low).filter((v) => v != null);
  const priceMin = lows.length > 0 ? Math.min(...lows) : 0;
  const priceMax = highs.length > 0 ? Math.max(...highs) : 0;
  const pricePad = (priceMax - priceMin) * 0.08 || 10;

  const volumes = chartData.map((d) => d.volume).filter((v) => v != null);
  const volMax = volumes.length > 0 ? Math.max(...volumes) : 0;

  const dark = isDarkMode();
  const gridColor = dark ? '#334155' : '#f1f5f9';
  const tickColor = dark ? '#64748b' : '#94a3b8';

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide">
          Candlestick + Volume
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

      {loading && <Loading message="Loading price history..." />}
      {!loading && error && (
        <ErrorView
          error={error}
          endpoint={`/api/stocks/${ticker}/history?range=1Y`}
        />
      )}
      {!loading && !error && chartData.length === 0 && (
        <EmptyView message="No price history available for this range." />
      )}
      {!loading && !error && chartData.length > 0 && (
        <>
          {/* Candlestick chart */}
          <ResponsiveContainer width="100%" height={240}>
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
                domain={[priceMin - pricePad, priceMax + pricePad]}
                allowDataOverflow={true}
                tick={{ fontSize: 11, fill: tickColor }}
                tickLine={false}
                axisLine={false}
                width={76}
                tickFormatter={(v) =>
                  `Rs ${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                }
              />
              <Tooltip content={<CandleTooltip />} />

              {/*
                Stacked-bar technique: the transparent spacer Bar (candleBase)
                pushes the stack up to the low price, then the candleRange Bar
                on top renders the actual high-low span. The YAxis clips the
                zero baseline via allowDataOverflow so only the price band is
                visible. The custom CandlestickShape draws wicks and bodies
                within the y..(y+height) pixel span that now correctly maps to
                low..high.
              */}
              {/* Transparent spacer: lifts the stack from 0 up to the candle low */}
              <Bar
                dataKey="candleBase"
                stackId="candle"
                fill="none"
                fillOpacity={0}
                stroke="none"
                legendType="none"
                isAnimationActive={false}
                tooltipType="none"
              />

              <Bar
                dataKey="candleRange"
                stackId="candle"
                shape={(shapeProps) => (
                  <CandlestickShape {...shapeProps} chartData={chartData} />
                )}
                isAnimationActive={false}
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={entry.close >= entry.open ? '#16a34a' : '#dc2626'}
                  />
                ))}
              </Bar>

              {/* SMA(20) overlay in amber */}
              {showSMA20 && (
                <Line
                  type="monotone"
                  dataKey="sma20"
                  stroke={SMA20_COLOR}
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls
                  activeDot={false}
                  isAnimationActive={false}
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
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* Volume bar chart */}
          <div className="mt-3 border-t border-gray-100 dark:border-slate-700 pt-3">
            <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-1">
              Volume
            </p>
            <ResponsiveContainer width="100%" height={80}>
              <ComposedChart
                data={chartData}
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: tickColor }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, volMax * 1.1]}
                  tick={{ fontSize: 10, fill: tickColor }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v) => formatVolume(v)}
                />
                <Tooltip
                  formatter={(value) => [formatVolume(value), 'Volume']}
                  labelStyle={{ color: dark ? '#94a3b8' : '#6b7280', fontSize: 11 }}
                  contentStyle={{
                    border: `1px solid ${dark ? '#475569' : '#e5e7eb'}`,
                    borderRadius: 8,
                    fontSize: 12,
                    backgroundColor: dark ? '#1e293b' : '#fff',
                    color: dark ? '#f1f5f9' : '#111827',
                  }}
                />
                <Bar dataKey="volume" isAnimationActive={false} radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={`vol-cell-${i}`}
                      fill={
                        entry.close >= entry.open
                          ? dark ? '#166534' : '#bbf7d0'
                          : dark ? '#991b1b' : '#fecaca'
                      }
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
