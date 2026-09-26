export function fmtNum(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
    return '—';
  }
  return Number(value.toFixed(decimals)).toLocaleString();
}

export function fmtCurrency(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
    return '—';
  }
  return `₹${Number(value.toFixed(decimals)).toLocaleString()}`;
}

export function fmtPercent(value: number | undefined | null, decimals = 1): string {
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
    return '—';
  }
  return `${Number((value * 100).toFixed(decimals))}%`;
}

export function fmtDuration(hours: number | undefined | null): string {
  if (hours === undefined || hours === null || isNaN(hours) || !isFinite(hours)) {
    return '—';
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  const days = hours / 24;
  return `${days.toFixed(1)}d`;
}
