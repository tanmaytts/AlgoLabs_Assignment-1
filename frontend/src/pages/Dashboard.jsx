import { useState, useEffect } from 'react';
import { fetchStocks, fetchMarketSummary } from '../api/client';
import SummaryCards from '../components/SummaryCards';
import StockTable from '../components/StockTable';
import { Loading, ErrorView, EmptyView } from '../components/StateViews';

export default function Dashboard() {
  const [stocks, setStocks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [stocksLoading, setStocksLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [stocksError, setStocksError] = useState(null);
  const [summaryError, setSummaryError] = useState(null);

  useEffect(() => {
    fetchStocks()
      .then((data) => {
        setStocks(data);
        setStocksLoading(false);
      })
      .catch((err) => {
        setStocksError(err);
        setStocksLoading(false);
      });

    fetchMarketSummary()
      .then((data) => {
        setSummary(data);
        setSummaryLoading(false);
      })
      .catch((err) => {
        setSummaryError(err);
        setSummaryLoading(false);
      });
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6">
        Market Dashboard
      </h1>

      {summaryLoading ? (
        <Loading message="Loading market summary..." />
      ) : summaryError ? (
        <ErrorView error={summaryError} endpoint="/api/market/summary" />
      ) : summary ? (
        <SummaryCards summary={summary} />
      ) : null}

      <div className="mt-2">
        {stocksLoading ? (
          <Loading message="Loading stocks..." />
        ) : stocksError ? (
          <ErrorView error={stocksError} endpoint="/api/stocks" />
        ) : stocks.length === 0 ? (
          <EmptyView message="No stocks found. The database may not be connected yet." />
        ) : (
          <StockTable stocks={stocks} />
        )}
      </div>
    </main>
  );
}
