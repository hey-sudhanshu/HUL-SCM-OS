export function formatCurrency(value: number | undefined | null): string {
  if (value === null || value === undefined || Number.isNaN(value) || !isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

export function formatNumber(value: number | undefined | null, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value) || !isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: decimals }).format(value);
}

export function formatPercent(value: number | undefined | null): string {
  if (value === null || value === undefined || Number.isNaN(value) || !isFinite(value)) return 'N/A';
  return new Intl.NumberFormat('en-IN', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

export function safeValue<T>(value: T | undefined | null, fallback: string = 'N/A'): T | string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && (Number.isNaN(value) || !isFinite(value))) return fallback;
  return value;
}
