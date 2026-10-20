import type { KeyboardEvent } from 'react';
import { ArrowUpRight, type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  note?: string;
  icon: LucideIcon;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  delta?: { value: number; positive: boolean };
  // When present, the card is rendered as an interactive button (cursor
  // pointer, hover lift, keyboard activatable, ARIA-labelled). When absent,
  // the card is purely informational: no click/keyboard handler, not in the
  // tab order, and `aria-label` is not set.
  action?: { label: string; onClick: () => void; ariaLabel: string };
}

export function KpiCard({ title, value, note, icon: Icon, tone = 'info', delta, }: KpiCardProps) {
  const toneColor = `var(--color-sf-${tone}-primary)`;

  return (
    <div className="e-card app-kpi-card">
      <div className="e-card-content app-kpi-card-inner">
        <div className="app-kpi-card-head">
          <span className="app-kpi-card-title">{title}</span>
          <span className="app-kpi-card-icon" style={{ background: toneColor }}>
            <Icon size={16} aria-hidden="true" />
          </span>
        </div>
        <div className="app-kpi-card-value">{value}</div>
        <div className="app-kpi-card-note">
          {delta ? (
            <span className={`app-trend app-trend--${delta.positive ? 'up' : 'down'}`}>
              {delta.positive ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
              {delta.value > 0 ? '+' : ''}{delta.value.toFixed(1)}%
            </span>
          ) : null}
          {note ? <span style={{ marginLeft: delta ? 8 : 0 }}>{note}</span> : null}
        </div>
      </div>
    </div>
  );
}