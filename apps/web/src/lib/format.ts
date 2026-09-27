export function isInvalid(value: number | null | undefined): boolean {
  return value === null || value === undefined || Number.isNaN(value) || !isFinite(value);
}

export function safeValue<T>(value: T | null | undefined, fallback: string = 'N/A'): string | T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && isInvalid(value)) return fallback;
  return value;
}

export function formatCurrency(value: number | null | undefined): string {
  if (isInvalid(value)) return 'N/A';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value as number);
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (isInvalid(value)) return 'N/A';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  }).format(value as number);
}

export function formatPercent(value: number | null | undefined): string {
  if (isInvalid(value)) return 'N/A';
  return new Intl.NumberFormat('en-IN', {
    style: 'percent',
    maximumFractionDigits: 1
  }).format(value as number);
}

export function formatPctRaw(value: number | null | undefined): string {
  if (isInvalid(value)) return 'N/A';
  return `${formatNumber(value, 1)}%`;
}

export function formatDuration(hours: number | null | undefined): string {
  if (isInvalid(hours)) return 'N/A';
  const h = Math.floor(hours as number);
  const m = Math.round(((hours as number) - h) * 60);
  return `${h}h ${m}m`;
}

export function formatDistance(km: number | null | undefined): string {
  if (isInvalid(km)) return 'N/A';
  return `${formatNumber(km, 0)} km`;
}
