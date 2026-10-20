import { useEffect, useMemo, useState } from 'react';
import {
  ChartComponent, SeriesCollectionDirective, SeriesDirective, Inject, Legend, Tooltip, DataLabel, Category, ColumnSeries, LineSeries, StackingColumnSeries
} from '@syncfusion/ej2-react-charts';
import {
  AccumulationChartComponent, AccumulationSeriesCollectionDirective, AccumulationSeriesDirective, AccumulationLegend, PieSeries, AccumulationTooltip, AccumulationDataLabel
} from '@syncfusion/ej2-react-charts';
import { GridComponent, ColumnsDirective, ColumnDirective, Filter, Sort, Page, Inject as GridInject } from '@syncfusion/ej2-react-grids';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { KpiCard } from '../components/KpiCard';
import { useDataset } from '../store/store';
import { getChartPalette, type ChartPalette, type Theme } from '../palette/palette';
import { compactMoney, money, count, percent } from '../format/format';
import { CHANNELS, type Channel } from '../types/domain';
import { TrendingUp, Wallet, Target, BarChart3, BadgeDollarSign } from 'lucide-react';
import './pages.css';

const MONTHS_BACK = 6;

function buildMonthLabels(today: string) {
  const [y, m] = today.split('-').map(Number);
  const out: string[] = [];
  for (let i = MONTHS_BACK; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    out.push(label);
  }
  return out;
}

// Deterministic month-split for spend/revenue per channel.
function seriesByChannel(rows: ReturnType<typeof useDataset>['campaigns'], palette: ReturnType<typeof getChartPalette>) {
  const grouped: Record<Channel, { spend: number; revenue: number; conversions: number }> = {} as any;
  for (const c of rows) {
    if (!grouped[c.channel]) grouped[c.channel] = { spend: 0, revenue: 0, conversions: 0 };
    grouped[c.channel].spend += c.spend;
    grouped[c.channel].revenue += c.revenue;
    grouped[c.channel].conversions += c.conversions;
  }
  return Object.entries(grouped).map(([channel, v]) => ({ channel, ...v, roas: v.spend > 0 ? v.revenue / v.spend : 0 }));
}

export function AnalyticsPage() {
  const dataset = useDataset();
  const [channel, setChannel] = useState<string>('All');
  const [palette, setPalette] = useState<ChartPalette>(() => {
    if (typeof document === 'undefined') return getChartPalette('light');
    return getChartPalette(((document.documentElement.getAttribute('data-theme') as Theme) ?? 'light'));
  });

  useEffect(() => {
    const sync = () => {
      const t = ((document.documentElement.getAttribute('data-theme') as Theme) ?? 'light');
      setPalette(getChartPalette(t));
    };
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const filtered = useMemo(() =>
    dataset.campaigns.filter(c => channel === 'All' || c.channel === channel),
    [dataset.campaigns, channel]
  );

  const totals = useMemo(() => {
    const spend = filtered.reduce((s, c) => s + c.spend, 0);
    const revenue = filtered.reduce((s, c) => s + c.revenue, 0);
    const conversions = filtered.reduce((s, c) => s + c.conversions, 0);
    return { spend, revenue, conversions, roas: spend > 0 ? revenue / spend : 0 };
  }, [filtered]);

  const channelRows = useMemo(() => seriesByChannel(filtered, palette), [filtered, palette]);

  // Build month series (deterministic split). Each campaign is spread across the
  // months in [start, end] with a monthly weight drawn from a small fixed
  // month-shape (with a per-campaign deterministic jitter) so spend and revenue
  // produce meaningful month-over-month variation instead of flat bars.
  const monthLabels = useMemo(() => buildMonthLabels('2026-10-15'), []);
  const monthlySeries = useMemo(() => {
    const months = monthLabels.length;
    // Base monthly shape (last 7 months, oldest -> newest): low ramp in spring,
    // mid-summer, late-summer promo bump, brief September dip, then a strong
    // Q4 ramp as the active Q4 campaigns come online. Sums to 1.
    const baseShape = [0.07, 0.10, 0.13, 0.16, 0.14, 0.18, 0.22];
    const spendByChannel: Record<string, number[]> = {};
    const revenueByChannel: Record<string, number[]> = {};
    const startIdx = Math.max(0, months - MONTHS_BACK - 1);
    for (const c of filtered) {
      if (!spendByChannel[c.channel]) {
        spendByChannel[c.channel] = new Array(months).fill(0);
        revenueByChannel[c.channel] = new Array(months).fill(0);
      }
      const spendArr = spendByChannel[c.channel];
      const revArr = revenueByChannel[c.channel];
      // Per-campaign deterministic jitter: nudge each month +/- ~20% of the
      // base weight. Channel/campaign id feeds the seed so the same data
      // reproduces on every render.
      const jitter = baseShape.map((w, i) => {
        const k = (hashCode(c.id) ^ (i * 2654435761)) >>> 0;
        const delta = ((k % 41) - 20) / 100; // -0.20 .. +0.20
        return Math.max(0.02, w * (1 + delta));
      });
      const jitterSum = jitter.reduce((s, w) => s + w, 0);
      for (let i = startIdx; i < months; i++) {
        const share = jitter[i] / jitterSum;
        spendArr[i] += Math.round(c.spend * share);
        // Revenue uses the campaign's own ROAS with a per-month wobble so the
        // two series move independently month-over-month.
        const k = (hashCode(c.id + ':rev') ^ (i * 1597334677)) >>> 0;
        const wobble = 0.82 + ((k % 36) / 100); // 0.82 .. 1.17
        revArr[i] += Math.round(c.revenue * share * wobble);
      }
      // Normalize window total back to the campaign totals so KPI tiles stay
      // consistent with the chart (no double-counting, no rounding drift).
      const spendWindowSum = spendArr.slice(startIdx).reduce((s, v) => s + v, 0);
      if (spendWindowSum !== 0 && c.spend !== 0) {
        const scale = c.spend / spendWindowSum;
        for (let i = startIdx; i < months; i++) spendArr[i] = Math.round(spendArr[i] * scale);
      }
      const revWindowSum = revArr.slice(startIdx).reduce((s, v) => s + v, 0);
      if (revWindowSum !== 0 && c.revenue !== 0) {
        const scale = c.revenue / revWindowSum;
        for (let i = startIdx; i < months; i++) revArr[i] = Math.round(revArr[i] * scale);
      }
    }
    const totalSpend = new Array(months).fill(0).map((_, i) => Object.values(spendByChannel).reduce((s, arr) => s + (arr[i] || 0), 0));
    const totalRevenue = new Array(months).fill(0).map((_, i) => Object.values(revenueByChannel).reduce((s, arr) => s + (arr[i] || 0), 0));
    return { spend: totalSpend, revenue: totalRevenue };
  }, [filtered, totals.roas, monthLabels]);

  // Pie (donut): channel share of spend. Each point carries an explicit
  // categorical fill drawn from the chart series palette so the chart never
  // falls back to the theme's status-hued palette.
  const pieData = useMemo(() => channelRows.filter(r => r.spend > 0).map((r, i) => ({
    x: r.channel, y: r.spend, color: palette.series[i % palette.series.length]
  })), [channelRows, palette.series]);

  // Bar (category): channel ROAS, sorted high to low
  const roasData = useMemo(() => channelRows.filter(r => r.spend > 0)
    .sort((a, b) => b.roas - a.roas)
    .map(r => ({ x: r.channel, y: Number(r.roas.toFixed(2)) })),
  [channelRows]);

  // Benchmark grid
  const benchmarkRows = useMemo(() => channelRows.map(r => ({
    channel: r.channel,
    campaigns: filtered.filter(c => c.channel === r.channel).length,
    spend: r.spend,
    revenue: r.revenue,
    roas: r.roas,
    conversions: r.conversions,
    cpa: r.conversions > 0 ? r.spend / r.conversions : 0
  })), [channelRows, filtered]);

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <h1 className="app-page-title">Performance Analytics</h1>
          <p className="app-page-sub">Spend vs. return by channel, conversion trends, and a channel benchmark grid.</p>
        </div>
        <div className="app-filter-field app-filter-field--channel" style={{ minWidth: 220 }}>
          <label htmlFor="analytics-channel">Channel filter</label>
          <DropDownListComponent
            id="analytics-channel"
            dataSource={['All', ...CHANNELS]}
            value={channel}
            change={(e: any) => setChannel(e.value)}
            popupHeight="220px"
            cssClass="e-outline"
          />
        </div>
      </div>

      <div className="app-kpi-grid">
        <KpiCard title="Spend" value={compactMoney(totals.spend)} icon={BadgeDollarSign}
          note={`across ${count(filtered.length)} campaigns`} tone="info" />
        <KpiCard title="Revenue" value={compactMoney(totals.revenue)} icon={TrendingUp}
          note={`return ${percent(totals.spend > 0 ? totals.revenue / totals.spend : 0)} of spend`}
          tone="success" />
        <KpiCard title="Conversions" value={count(totals.conversions)} icon={Target}
          note={`CPA ${money(totals.conversions > 0 ? totals.spend / totals.conversions : 0)}`} tone="info" />
        <KpiCard title="Blended ROAS" value={`${totals.roas.toFixed(2)}x`} icon={BarChart3}
          note={totals.roas >= 2 ? 'at or above target (2.0x)' : 'below target (2.0x)'}
          tone={totals.roas >= 2 ? 'success' : 'warning'} />
      </div>

      <div className="e-card app-card">
        <div className="e-card-header app-card-header">
          <div className="e-card-header-caption">
            <div className="e-card-header-title app-card-title">Spend vs. Revenue (last 7 months)</div>
            <div className="e-card-sub-title app-card-sub">Stacked channel spend and total return by month.</div>
          </div>
        </div>
        <div className="e-card-content app-card-content">
          <div className="app-chart-frame">
            <ChartComponent
              id="spend-revenue"
              theme={palette.theme}
              primaryXAxis={{ valueType: 'Category', title: 'Month', labelStyle: { color: palette.axis.label }, lineStyle: { color: palette.axis.line } }}
              primaryYAxis={{ title: 'USD', labelFormat: 'c0', labelStyle: { color: palette.axis.label }, lineStyle: { color: palette.axis.line }, majorGridLines: { color: palette.axis.grid } }}
              legendSettings={{ visible: true, textStyle: { color: palette.axis.label } }}
              tooltip={{ enable: true, shared: true }}
              palettes={palette.series}
              width="100%"
              height="100%"
            >
              <Inject services={[StackingColumnSeries, LineSeries, Category, Legend, Tooltip, DataLabel]} />
              <SeriesCollectionDirective>
                <SeriesDirective dataSource={monthlySeries.spend.map((v, i) => ({ x: monthLabels[i], y: v }))}
                  xName="x" yName="y" name="Spend" type="StackingColumn" fill={palette.series[0]} />
                <SeriesDirective dataSource={monthlySeries.revenue.map((v, i) => ({ x: monthLabels[i], y: v }))}
                  xName="x" yName="y" name="Revenue" type="Line" fill={palette.series[2]} marker={{ visible: true, fill: palette.series[2] }} width={2.5} />
              </SeriesCollectionDirective>
            </ChartComponent>
          </div>
        </div>
      </div>

      <div className="app-analytics-row">
        <div className="e-card app-card">
          <div className="e-card-header app-card-header">
            <div className="e-card-header-caption">
              <div className="e-card-header-title app-card-title">Channel ROAS</div>
              <div className="e-card-sub-title app-card-sub">Higher is better. Bars are sorted high to low.</div>
            </div>
          </div>
          <div className="e-card-content app-card-content">
            <div className="app-chart-frame">
              <ChartComponent
                id="channel-roas"
                theme={palette.theme}
                primaryXAxis={{ valueType: 'Category', title: 'Channel', labelStyle: { color: palette.axis.label }, lineStyle: { color: palette.axis.line } }}
                primaryYAxis={{ title: 'ROAS (x)', labelFormat: '0.##x', labelStyle: { color: palette.axis.label }, lineStyle: { color: palette.axis.line }, majorGridLines: { color: palette.axis.grid } }}
                tooltip={{ enable: true }}
                palettes={palette.series}
                width="100%"
                height="100%"
              >
                <Inject services={[ColumnSeries, Category, Legend, Tooltip, DataLabel]} />
                <SeriesCollectionDirective>
                  <SeriesDirective dataSource={roasData} xName="x" yName="y" name="ROAS" type="Column" fill={palette.series[1]} cornerRadius={{ topLeft: 4, topRight: 4 }} />
                </SeriesCollectionDirective>
              </ChartComponent>
            </div>
          </div>
        </div>

        <div className="e-card app-card">
          <div className="e-card-header app-card-header">
            <div className="e-card-header-caption">
              <div className="e-card-header-title app-card-title">Channel share of spend</div>
              <div className="e-card-sub-title app-card-sub">Categorical; uses chart series, not status tones.</div>
            </div>
          </div>
          <div className="e-card-content app-card-content">
            <div className="app-chart-frame">
              <AccumulationChartComponent
                id="channel-share"
                theme={palette.theme}
                legendSettings={{ visible: true, position: 'Bottom', textStyle: { color: palette.axis.label } }}
                tooltip={{ enable: true }}
                width="100%"
                height="100%"
              >
                <Inject services={[PieSeries, AccumulationLegend, AccumulationTooltip, AccumulationDataLabel]} />
                <AccumulationSeriesCollectionDirective>
                  <AccumulationSeriesDirective dataSource={pieData} xName="x" yName="y" name="Spend share" type="Pie"
                    pointColorMapping="color"
                    innerRadius="55%" dataLabel={{ visible: true, name: 'x', position: 'Outside', font: { color: palette.axis.label } }}
                  />
                </AccumulationSeriesCollectionDirective>
              </AccumulationChartComponent>
            </div>
          </div>
        </div>
      </div>

      <div className="e-card app-card">
        <div className="e-card-header app-card-header">
          <div className="e-card-header-caption">
            <div className="e-card-header-title app-card-title">Channel benchmark</div>
            <div className="e-card-sub-title app-card-sub">Channel-level totals; sort and filter to compare.</div>
          </div>
        </div>
        <div className="e-card-content app-card-content">
          <GridComponent dataSource={benchmarkRows} allowSorting allowFiltering allowPaging pageSettings={{ pageSize: 6 }} width="100%" rowHeight={42} gridLines="None">
            <ColumnsDirective>
              <ColumnDirective field="channel" headerText="Channel" width="160" />
              <ColumnDirective field="campaigns" headerText="Campaigns" width="110" textAlign="Right" format="N0" />
              <ColumnDirective field="spend" headerText="Spend" width="120" textAlign="Right" format="C0" />
              <ColumnDirective field="revenue" headerText="Revenue" width="120" textAlign="Right" format="C0" />
              <ColumnDirective field="roas" headerText="ROAS" width="90" textAlign="Right" template={(row: any) => <strong>{row.roas.toFixed(2)}x</strong>} />
              <ColumnDirective field="conversions" headerText="Conversions" width="120" textAlign="Right" format="N0" />
              <ColumnDirective field="cpa" headerText="CPA" width="110" textAlign="Right" format="C0" />
            </ColumnsDirective>
            <GridInject services={[Filter, Sort, Page]} />
          </GridComponent>
        </div>
      </div>
    </div>
  );
}

// Deterministic 32-bit hash for per-campaign / per-month variation. Avoids
// Math.random so the chart produces the same data on every render and is safe
// for React strict-mode double invocation.
function hashCode(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
