import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  formatPrice,
  formatPct,
  formatMarketCap,
  formatNum,
  changePctColor,
} from '../utils/format';

const COLUMNS = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'name', label: 'Name' },
  { key: 'sector', label: 'Sector' },
  { key: 'price', label: 'Price (Rs)', numeric: true },
  { key: 'day_change_pct', label: 'Day Change', numeric: true },
  { key: 'market_cap', label: 'Market Cap', numeric: true },
  { key: 'pe_ratio', label: 'P/E', numeric: true },
  { key: 'eps', label: 'EPS', numeric: true },
];

function SortIcon({ direction }) {
  if (!direction) {
    return (
      <span className="ml-1 text-gray-300 dark:text-slate-600 select-none">
        <svg className="inline w-3 h-3" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5 2l3 3H2L5 2zM5 8L2 5h6L5 8z" />
        </svg>
      </span>
    );
  }
  return (
    <span className="ml-1 text-blue-600 dark:text-blue-400 select-none">
      {direction === 'asc' ? (
        <svg className="inline w-3 h-3" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5 2l3 4H2L5 2z" />
        </svg>
      ) : (
        <svg className="inline w-3 h-3" viewBox="0 0 10 10" fill="currentColor">
          <path d="M5 8L2 4h6L5 8z" />
        </svg>
      )}
    </span>
  );
}

export default function StockTable({ stocks }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('market_cap');
  const [sortDir, setSortDir] = useState('desc');

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stocks;
    return stocks.filter(
      (s) =>
        s.ticker.toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.sector || '').toLowerCase().includes(q)
    );
  }, [stocks, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function renderCell(stock, col) {
    const val = stock[col.key];
    switch (col.key) {
      case 'price':
        return <span className="font-mono">{formatPrice(val)}</span>;
      case 'day_change_pct':
        return (
          <span className={`font-mono font-semibold ${changePctColor(val)}`}>
            {formatPct(val)}
          </span>
        );
      case 'market_cap':
        return <span className="font-mono text-xs">{formatMarketCap(val)}</span>;
      case 'pe_ratio':
        return <span className="font-mono">{formatNum(val)}</span>;
      case 'eps':
        return <span className="font-mono">{formatNum(val)}</span>;
      default:
        return val ?? 'N/A';
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by ticker, name or sector..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 transition-colors"
          >
            Clear
          </button>
        )}
        <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto whitespace-nowrap">
          {sorted.length} of {stocks.length} stocks
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer select-none hover:text-blue-700 dark:hover:text-blue-400 whitespace-nowrap ${
                    col.numeric ? 'text-right' : ''
                  }`}
                  style={{ textAlign: col.numeric ? 'right' : 'left' }}
                >
                  {col.label}
                  <SortIcon direction={sortKey === col.key ? sortDir : null} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="text-center py-10 text-gray-400 dark:text-slate-500 text-sm"
                >
                  No stocks match your search.
                </td>
              </tr>
            ) : (
              sorted.map((stock) => (
                <tr
                  key={stock.ticker}
                  onClick={() => navigate(`/stock/${encodeURIComponent(stock.ticker)}`)}
                  className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-blue-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors last:border-0"
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 ${
                        col.numeric ? 'text-right' : ''
                      } ${
                        col.key === 'ticker'
                          ? 'font-semibold text-blue-700 dark:text-blue-400'
                          : 'text-gray-700 dark:text-slate-300'
                      }`}
                    >
                      {renderCell(stock, col)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
