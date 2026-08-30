const DEFAULT_CURRENCY = "USD";

const EXCHANGE_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.78,
  INR: 83,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 157,
  CNY: 7.25,
  SGD: 1.35,
  AED: 3.67,
  SAR: 3.75,
  CHF: 0.9,
  SEK: 10.45,
  NOK: 10.65,
  DKK: 6.86,
  NZD: 1.66,
  HKD: 7.81,
  KRW: 1380,
  BRL: 5.45,
  MXN: 18.1,
  ZAR: 18.2,
  TRY: 33,
  MYR: 4.7,
  THB: 36.7,
  PHP: 58.5,
  IDR: 16250,
  VND: 25400,
  PLN: 3.95,
  CZK: 23.2,
  HUF: 364,
  ILS: 3.7
};

function normalizeCurrency(currency) {
  const code = String(currency || DEFAULT_CURRENCY).trim().toUpperCase();
  return code.length === 3 ? code : DEFAULT_CURRENCY;
}

function currencyRate(currency) {
  return EXCHANGE_RATES[normalizeCurrency(currency)] || EXCHANGE_RATES[DEFAULT_CURRENCY];
}

function convertCurrency(amount, currency) {
  return Number((Number(amount || 0) * currencyRate(currency)).toFixed(2));
}

function currencyPayload(settings = {}) {
  const currency = normalizeCurrency(settings.currency);
  return {
    ...settings,
    currency,
    currencyRate: currencyRate(currency),
    baseCurrency: DEFAULT_CURRENCY
  };
}

module.exports = {
  DEFAULT_CURRENCY,
  EXCHANGE_RATES,
  convertCurrency,
  currencyPayload,
  currencyRate,
  normalizeCurrency
};
