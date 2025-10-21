const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(key: string, options: Intl.NumberFormatOptions) {
  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 1,
        ...options,
      }),
    );
  }

  return formatterCache.get(key)!;
}

export function formatPercent(value: number, fallback = '—') {
  if (Number.isNaN(value) || !Number.isFinite(value)) return fallback;
  return getFormatter('percent', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

export function formatNumber(value: number, fallback = '—') {
  if (Number.isNaN(value) || !Number.isFinite(value)) return fallback;
  return getFormatter('number', {}).format(value);
}

export function formatCompactNumber(value: number, fallback = '—') {
  if (Number.isNaN(value) || !Number.isFinite(value)) return fallback;
  return getFormatter('compact', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function formatMinutes(totalSeconds: number) {
  if (Number.isNaN(totalSeconds) || !Number.isFinite(totalSeconds)) return '—';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatRelativeTimestamp(epochSeconds: number) {
  if (!epochSeconds) return '—';

  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const now = Date.now();
  const deltaMs = epochSeconds * 1000 - now;

  const units = [
    { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
    { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
    { unit: 'week', ms: 1000 * 60 * 60 * 24 * 7 },
    { unit: 'day', ms: 1000 * 60 * 60 * 24 },
    { unit: 'hour', ms: 1000 * 60 * 60 },
    { unit: 'minute', ms: 1000 * 60 },
  ] as const;

  for (const { unit, ms } of units) {
    if (Math.abs(deltaMs) >= ms || unit === 'minute') {
      return formatter.format(Math.round(deltaMs / ms), unit);
    }
  }

  return 'just now';
}

