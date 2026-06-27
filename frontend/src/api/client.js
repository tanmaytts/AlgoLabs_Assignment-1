import {
  sampleStocks,
  sampleMarketSummary,
  sampleSectors,
  generateHistory,
} from '../fixtures/sampleStocks';

const USE_FIXTURES = import.meta.env.VITE_USE_FIXTURES === 'true';

/** Resolves after a short delay to let loading states render in fixture mode. */
function fixtureDelay(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), 300));
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function apiFetch(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Request to ${path} failed with status ${res.status}${text ? ': ' + text : ''}`);
  }
  return res.json();
}

export async function fetchStocks() {
  if (USE_FIXTURES) return fixtureDelay(sampleStocks);
  return apiFetch('/api/stocks');
}

export async function fetchStock(ticker) {
  if (USE_FIXTURES) {
    const stock = sampleStocks.find((s) => s.ticker === ticker) ?? sampleStocks[0];
    return fixtureDelay(stock);
  }
  return apiFetch(`/api/stocks/${encodeURIComponent(ticker)}`);
}

export async function fetchStockHistory(ticker, range = '1M') {
  if (USE_FIXTURES) return fixtureDelay(generateHistory(ticker, range));
  return apiFetch(`/api/stocks/${encodeURIComponent(ticker)}/history?range=${range}`);
}

export async function fetchMarketSummary() {
  if (USE_FIXTURES) return fixtureDelay(sampleMarketSummary);
  return apiFetch('/api/market/summary');
}

export async function fetchSectors() {
  if (USE_FIXTURES) return fixtureDelay(sampleSectors);
  return apiFetch('/api/market/sectors');
}
