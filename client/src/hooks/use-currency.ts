
import { useState, useEffect } from 'react';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CHF: 'CHF',
  CAD: 'C$',
  AUD: 'A$',
};

export function useCurrency() {
  const [currency, setCurrency] = useState(() => 
    localStorage.getItem('currency') || 'USD'
  );

  useEffect(() => {
    const handleCurrencyChange = (event: CustomEvent) => {
      setCurrency(event.detail.currency);
    };

    window.addEventListener('currencyChanged', handleCurrencyChange as EventListener);
    
    return () => {
      window.removeEventListener('currencyChanged', handleCurrencyChange as EventListener);
    };
  }, []);

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    
    return `${symbol}${numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return {
    currency,
    formatCurrency,
    currencySymbol: CURRENCY_SYMBOLS[currency] || currency,
  };
}
