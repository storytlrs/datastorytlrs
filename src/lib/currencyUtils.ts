export const DEFAULT_CURRENCY = "CZK";

export const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CZK: "Kč",
    PLN: "zł",
  };
  return symbols[currency] || "Kč";
};

/**
 * Format currency based on type
 * CZK: "1 234,56 Kč" (Czech locale, symbol after)
 * Others: "$1,234.56" (symbol before)
 */
export const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY): string => {
  if (amount === 0) {
    return currency === "CZK" ? "0,00 Kč" : `${getCurrencySymbol(currency)}0.00`;
  }

  if (currency === "CZK") {
    // Czech format: space as thousand separator, comma for decimals, Kč after
    if (Math.abs(amount) >= 1000000) {
      return `${(amount / 1000000).toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M Kč`;
    }
    if (Math.abs(amount) >= 1000) {
      return `${(amount / 1000).toLocaleString("cs-CZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K Kč`;
    }
    return `${amount.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
  }

  // Other currencies: symbol before, English locale
  const symbol = getCurrencySymbol(currency);
  if (Math.abs(amount) >= 1000000) {
    return `${symbol}${(amount / 1000000).toFixed(2)}M`;
  }
  if (Math.abs(amount) >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(1)}K`;
  }
  return `${symbol}${amount.toFixed(2)}`;
};

/**
 * Format currency for display in tables (simpler format without abbreviations)
 */
export const formatCurrencySimple = (amount: number | null, currency: string = DEFAULT_CURRENCY): string => {
  if (amount === null || amount === undefined) return "-";
  
  if (currency === "CZK") {
    return `${amount.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
  }
  
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toFixed(2)}`;
};
