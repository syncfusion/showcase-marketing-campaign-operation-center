// Chart palette — mirrors the CSS token file for both themes.
// Always read via this module; never inline raw hex in components.
export type Theme = 'light' | 'dark';

function readToken(name: string, theme: Theme): string {
  const root = document.documentElement;
  // Force the theme attribute before reading; matches what the user sees.
  if (root.getAttribute('data-theme') !== theme) {
    root.setAttribute('data-theme', theme);
  }
  return getComputedStyle(root).getPropertyValue(name).trim();
}

export interface ChartPalette {
  series: string[];
  status: {
    success: string;
    warning: string;
    danger: string;
    info: string;
    neutral: string;
  };
  reference: string;
  axis: {
    label: string;
    line: string;
    grid: string;
  };
  theme: 'Tailwind3' | 'Tailwind3Dark';
}

export function getChartPalette(theme: Theme): ChartPalette {
  const series = [1, 2, 3, 4, 5, 6, 7, 8].map(i => readToken(`--color-sf-chart-series-${i}`, theme));
  return {
    series,
    status: {
      success: readToken('--color-sf-success-primary', theme),
      warning: readToken('--color-sf-warning-primary', theme),
      danger:  readToken('--color-sf-danger-primary', theme),
      info:    readToken('--color-sf-info-primary', theme),
      neutral: readToken('--color-sf-neutral-primary', theme)
    },
    reference: readToken('--color-sf-chart-reference', theme),
    axis: {
      label: readToken('--color-sf-text-muted', theme),
      line:  readToken('--color-sf-border-subtle', theme),
      grid:  readToken('--color-sf-border-subtle', theme)
    },
    theme: theme === 'dark' ? 'Tailwind3Dark' : 'Tailwind3'
  };
}
