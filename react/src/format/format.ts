// Number, currency and date formatting — one form per place
// (design-system.md, "Number formatting").
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usdCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 });
const usdPercent = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const dateShort = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const DATE_FORMAT = 'MM/dd/yyyy';

export function money(n: number): string { return usd.format(Math.round(n)); }
export function compactMoney(n: number): string { return usdCompact.format(n); }
export function count(n: number): string { return number.format(Math.round(n)); }
export function percent(n: number): string { return usdPercent.format(n); }
export function shortDate(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')) : d;
  return dateShort.format(dt);
}

// Social-platform-style count formatting: 14.2M, 268K, 1,204, 0.
// Below 1K keeps the full number (with locale grouping). 1K–999.9K uses one decimal when
// the unrounded value is below 10K (e.g. 1.2K), otherwise 0 decimals (e.g. 268K). 1M+ uses
// one decimal (e.g. 14.2M). The en-US locale provides the thousands separator for the < 1K path.
export function compactCount(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  if (abs < 1000) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(n));
  }
  if (abs < 1_000_000) {
    const v = n / 1000;
    const rounded = Math.round(v * 10) / 10;
    const digits = rounded < 10 ? 1 : 0;
    return `${rounded.toFixed(digits)}K`;
  }
  const v = n / 1_000_000;
  const rounded = Math.round(v * 10) / 10;
  return `${rounded.toFixed(1)}M`;
}
