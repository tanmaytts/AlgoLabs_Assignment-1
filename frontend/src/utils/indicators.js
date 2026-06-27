/**
 * Technical indicator helpers for chart overlays.
 *
 * All functions operate on plain arrays of numbers and return arrays of the
 * same length. Leading values that cannot be computed yet are returned as null
 * so that Recharts can skip them gracefully (use connectNulls on the Line).
 */

/**
 * computeSMA(values, period)
 *
 * Computes a Simple Moving Average over the given period.
 *
 * For each index i:
 *   - If i < period - 1: not enough data yet, returns null.
 *   - Otherwise: returns the mean of values[i - period + 1 .. i] inclusive.
 *
 * Note: on a 1M range there are roughly 21 trading days, so SMA(50) will
 * return all nulls. That is expected. The Recharts Line simply will not render.
 *
 * @param {number[]} values  Array of numeric close prices (nulls are skipped
 *                           by treating them as gaps, but SMA still advances).
 * @param {number}   period  Window size (e.g. 20 or 50).
 * @returns {(number|null)[]} Array of the same length as values.
 */
export function computeSMA(values, period) {
  if (!values || values.length === 0 || period <= 0) return [];

  const result = new Array(values.length).fill(null);

  for (let i = period - 1; i < values.length; i++) {
    const window = values.slice(i - period + 1, i + 1);
    const valid = window.filter((v) => v != null && !isNaN(v));
    if (valid.length === period) {
      const sum = valid.reduce((acc, v) => acc + v, 0);
      result[i] = sum / period;
    }
    // If any value in the window is null/NaN we leave result[i] as null.
  }

  return result;
}
