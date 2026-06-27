'use strict';

// 22 NSE tickers spread across multiple sectors so the dashboard is diversified.
// Sectors covered: Energy, IT, Banking/Finance, FMCG, Auto, Pharma, Metals,
//   Luxury/Consumer, Telecom, Infrastructure, Paints.
// These are the symbols yfinance recognises for NSE (suffix .NS).
const TICKERS = [
  'RELIANCE.NS',   // Energy - oil and petrochemicals
  'TCS.NS',        // IT - largest Indian IT services firm
  'INFY.NS',       // IT - Infosys
  'HDFCBANK.NS',   // Banking - private sector
  'ICICIBANK.NS',  // Banking - private sector
  'KOTAKBANK.NS',  // Banking - private sector
  'AXISBANK.NS',   // Banking - private sector
  'BAJFINANCE.NS', // NBFC - consumer lending
  'ITC.NS',        // FMCG - cigarettes and hotels conglomerate
  'HINDUNILVR.NS', // FMCG - Hindustan Unilever
  'NESTLEIND.NS',  // FMCG - Nestle India
  'MARUTI.NS',     // Auto - passenger cars
  'LT.NS',         // Infrastructure - engineering and construction
  'BHARTIARTL.NS', // Telecom - Airtel
  'ASIANPAINT.NS', // Paints - market leader in decorative paints
  'SUNPHARMA.NS',  // Pharma - largest Indian pharma company
  'TATASTEEL.NS',  // Metals - steel manufacturing
  'TITAN.NS',      // Consumer - watches and jewellery
  'NTPC.NS',       // Utilities - state power generation
  'POWERGRID.NS',  // Utilities - transmission grid
  'ADANIPORTS.NS', // Infrastructure - ports and logistics
  'WIPRO.NS',      // IT - Wipro Technologies
];

module.exports = TICKERS;
