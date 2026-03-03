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
    return currency === "CZK" ? "0 Kč" : `${getCurrencySymbol(currency)}0`;
  }

  if (currency === "CZK") {
    return `${Math.round(amount).toLocaleString("cs-CZ")} Kč`;
  }

  const symbol = getCurrencySymbol(currency);
  return `${symbol}${Math.round(amount).toLocaleString("en-US")}`;
};

/**
 * Format currency for display in tables (simpler format without abbreviations)
 */
export const formatCurrencySimple = (amount: number | null, currency: string = DEFAULT_CURRENCY): string => {
  if (amount === null || amount === undefined) return "-";
  
  if (currency === "CZK") {
    return `${Math.round(amount).toLocaleString("cs-CZ")} Kč`;
  }
  
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${Math.round(amount).toLocaleString("en-US")}`;
};
