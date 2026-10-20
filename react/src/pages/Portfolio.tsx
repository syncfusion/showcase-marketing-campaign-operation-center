import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TreeGridComponent,
  ColumnsDirective,
  ColumnDirective,
  Inject,
  Filter,
  Sort,
  Page,
  Toolbar,
  ExcelExport,
  PdfExport
} from '@syncfusion/ej2-react-treegrid';
import type { TreeGrid } from '@syncfusion/ej2-treegrid';
import { Wallet, TrendingUp, BadgeDollarSign, BarChart3 } from 'lucide-react';
import { KpiCard } from '../components/KpiCard';
import { useDataset, store, useStoreFlags } from '../store/store';
import { compactMoney, count, percent } from '../format/format';
import {
  STAGES,
  type Campaign,
  type CampaignStatus,
  type Deliverable,
  type Priority,
  type Stage
} from '../types/domain';
import './pages.css';

function statusTone(s: CampaignStatus): 'success' | 'info' | 'warning' | 'neutral' | 'danger' {
  switch (s) {
    case 'Active': return 'success';
    case 'Scheduled': return 'info';
    case 'Paused': return 'warning';
    case 'Completed': return 'neutral';
    case 'Draft': return 'neutral';
  }
}

function stageTone(s: Stage): 'success' | 'info' | 'warning' | 'neutral' | 'danger' {
  switch (s) {
    case 'Completed': return 'success';
    case 'Ready for Launch': return 'info';
    case 'In Review': return 'info';
    case 'In Production': return 'warning';
    case 'Backlog': return 'neutral';
  }
}

function priorityTone(p: Priority): 'success' | 'info' | 'warning' | 'neutral' | 'danger' {
  switch (p) {
    case 'Urgent': return 'danger';
    case 'High': return 'warning';
    case 'Medium': return 'info';
    case 'Low': return 'neutral';
  }
}

function StatusPill({ value }: { value: CampaignStatus }) {
  return <span className={`app-pill app-pill--${statusTone(value)}`}>{value}</span>;
}

// Module-level template functions. Each column has its own dedicated function
// (rather than a `make<Field>Template` factory) so the React component
// reference identity is stable across renders — Syncfusion's template cache
// keys off the function reference, and a factory that returns a new function
// each render looks like a fresh template to the grid, so the first paint
// captures rows before the template is wired in.
function TitleTemplate(props: any) {
  if (props.rowKind === 'deliverable') {
    return <span className="app-cell-child">{props.taskName}</span>;
  }
  return <strong>{props.taskName}</strong>;
}

function ProgressTemplate(props: any) {
  const pct = typeof props.progress === 'number' ? Math.max(0, Math.min(100, props.progress)) : 0;
  const tone =
    props.rowKind === 'deliverable'
      ? priorityTone(props.priority as Priority)
      : statusTone(props.status as CampaignStatus);
  return (
    <div className="app-progress">
      <div className="app-progress-track">
        <div
          className={`app-progress-fill app-progress-fill--${tone}`}
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
      <span className="app-progress-value">{pct}%</span>
    </div>
  );
}

function PhaseTemplate(props: any) {
  if (props.rowKind === 'deliverable') {
    return <span className={`app-pill app-pill--${stageTone(props.stage as Stage)}`}>{props.stage}</span>;
  }
  return <StatusPill value={props.status as CampaignStatus} />;
}

function PriorityTemplate(props: any) {
  const p = props.priority as Priority | '';
  if (!p) return <span className="app-cell-muted">—</span>;
  return <span className={`app-pill app-pill--${priorityTone(p)}`}>{p}</span>;
}

// Money cells inherit the parent campaign's Budget / Spend / Revenue on each
// child row (see buildTree), so a single template renders the value for
// both row kinds. ROAS likewise.
function BudgetTemplate(props: any) {
  return <span>{compactMoney(Number(props.budget ?? 0))}</span>;
}
function SpendTemplate(props: any) {
  return <span>{compactMoney(Number(props.spend ?? 0))}</span>;
}
function RevenueTemplate(props: any) {
  return <span>{compactMoney(Number(props.revenue ?? 0))}</span>;
}
function RoasTemplate(props: any) {
  return <strong>{Number(props.roas ?? 0).toFixed(2)}x</strong>;
}

function StartDateTemplate(props: any) {
  const raw = props.startDate;
  if (!raw) return <span className="app-cell-muted">—</span>;
  const d = new Date(String(raw).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return <span className="app-cell-muted">—</span>;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return <span>{`${mm}/${dd}/${d.getFullYear()}`}</span>;
}
function EndDateTemplate(props: any) {
  const raw = props.endDate;
  if (!raw) return <span className="app-cell-muted">—</span>;
  const d = new Date(String(raw).slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return <span className="app-cell-muted">—</span>;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return <span>{`${mm}/${dd}/${d.getFullYear()}`}</span>;
}

// Highest-priority rollup for a campaign's deliverables. Empty string when
// the campaign has no children, so the PriorityTemplate renders the em-dash.
const PRIORITY_RANK: Record<Priority, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
function highestPriority(children: Deliverable[]): Priority | '' {
  if (children.length === 0) return '';
  let best: Priority | '' = '';
  let bestRank = 0;
  for (const d of children) {
    const rank = PRIORITY_RANK[d.priority] ?? 0;
    if (rank > bestRank) { bestRank = rank; best = d.priority; }
  }
  return best;
}

// Build the hierarchical tree from the campaigns + deliverables datasets.
// Pure function so the same data is produced by the useState initializer
// (first render, synchronously) and by the useEffect (when the dataset changes).
function buildTree(campaigns: Campaign[], deliverables: Deliverable[]) {
  const byCampaign = new Map<string, Deliverable[]>();
  for (const d of deliverables) {
    const arr = byCampaign.get(d.campaignId) ?? [];
    arr.push(d);
    byCampaign.set(d.campaignId, arr);
  }
  return campaigns.map(c => {
    const progress = c.budget > 0 ? Math.round((c.spend / c.budget) * 100) : 0;
    const roas = c.spend > 0 ? c.revenue / c.spend : 0;
    const children = byCampaign.get(c.id) ?? [];
    // Split the parent campaign's Budget / Spend / Revenue / ROAS evenly across
    // its deliverables so each child row carries its share of the campaign's
    // financial context. A campaign with no children keeps the full values on
    // the parent row only.
    const split = children.length > 0 ? children.length : 1;
    const shareBudget = c.budget / split;
    const shareSpend = c.spend / split;
    const shareRevenue = c.revenue / split;
    const shareRoas = roas / split;
    const subs = children.map(d => {
      const stageIndex = STAGES.indexOf(d.stage);
      const stageProgress = STAGES.length > 0
        ? Math.round(((stageIndex + 1) / STAGES.length) * 100)
        : 0;
      return {
        taskId: d.id,
        parentId: c.id,
        rowKind: 'deliverable' as const,
        taskName: d.title,
        channel: d.channel,
        audience: '' as string,
        status: '' as CampaignStatus,
        stage: d.stage,
        priority: d.priority,
        owner: d.assignee,
        startDate: d.dueDate,
        endDate: d.dueDate,
        budget: shareBudget,
        spend: shareSpend,
        revenue: shareRevenue,
        roas: shareRoas,
        conversions: 0,
        impressions: 0,
        progress: stageProgress,
        notes: d.notes,
        assetType: d.assetType
      };
    });
    return {
      taskId: c.id,
      rowKind: 'campaign' as const,
      taskName: c.title,
      code: c.code,
      channel: c.channel,
      audience: c.targetAudience,
      status: c.status,
      stage: '' as Stage,
      // Parent priority is the highest-priority rollup across the campaign's
      // deliverables (Urgent > High > Medium > Low). Empty when there are no
      // deliverables yet, which the PriorityTemplate renders as "—".
      priority: highestPriority(children),
      owner: c.leadOwner,
      startDate: c.startDate,
      endDate: c.endDate,
      budget: c.budget,
      spend: c.spend,
      revenue: c.revenue,
      roas,
      conversions: c.conversions,
      impressions: c.impressions,
      progress,
      subTasks: subs
    };
  });
}

export function PortfolioPage() {
  const dataset = useDataset();
  const flags = useStoreFlags();
  const navigate = useNavigate();

  // Toolbar ref + click handler. Syncfusion's toolbar buttons are declarative
  // (just strings on the `toolbar` prop), but invoking the actual export
  // requires us to call `excelExport()` / `pdfExport()` on the grid instance
  // when the matching button is clicked. Without this wiring the toolbar shows
  // the buttons but pressing them does nothing.
  const treeGridRef = useRef<TreeGrid | null>(null);
  const toolbarClick = (args: { item?: { id?: string } }) => {
    const id = (args.item?.id ?? '').toLowerCase();
    const grid = treeGridRef.current;
    if (!grid) return;
    if (id.includes('excelexport')) {
      grid.excelExport();
    } else if (id.includes('pdfexport')) {
      grid.pdfExport();
    }
  };

  const totals = useMemo(() => {
    const spend = dataset.campaigns.reduce((s, c) => s + c.spend, 0);
    const budget = dataset.campaigns.reduce((s, c) => s + c.budget, 0);
    const revenue = dataset.campaigns.reduce((s, c) => s + c.revenue, 0);
    const conversions = dataset.campaigns.reduce((s, c) => s + c.conversions, 0);
    return { spend, budget, revenue, conversions, roas: spend > 0 ? revenue / spend : 0 };
  }, [dataset.campaigns]);

  // Hierarchical view: one root per campaign, with its deliverables nested under it.
  //
  // Stored in useState (not useMemo) because the Syncfusion React TreeGrid
  // captures the dataSource at component-construction time and runs its own
  // template resolution against that captured reference. A useMemo that
  // returns a fresh array on the first render caused the grid to snapshot
  // the data before the column templates finished mounting, so the first
  // paint rendered the rows with their field values but no templates — blank
  // pills, blank dates, blank money cells — until a sort or filter forced
  // the grid to re-resolve templates against the live data. Initializing
  // state with buildTree() guarantees the dataSource is a fully-populated
  // array on the very first render, and the useEffect re-syncs it when the
  // dataset changes (campaign added/edited, deliverable created, customer
  // persistence toggle, etc.).
  const [treeData, setTreeData] = useState(() =>
    buildTree(dataset.campaigns, dataset.deliverables)
  );
  useEffect(() => {
    setTreeData(buildTree(dataset.campaigns, dataset.deliverables));
  }, [dataset.campaigns, dataset.deliverables]);

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <h1 className="app-page-title">Campaign Portfolio</h1>
          <p className="app-page-sub">Multi-channel campaigns, pacing and budget health for the current quarter.</p>
        </div>
      </div>

      <div className="app-kpi-grid">
        <KpiCard title="Total Budget" value={compactMoney(totals.budget)} icon={Wallet}
          note={`across ${count(dataset.campaigns.length)} campaigns`} tone="info" />
        <KpiCard title="Spend to Date" value={compactMoney(totals.spend)}
          note={`${percent(totals.budget > 0 ? totals.spend / totals.budget : 0)} of budget`} icon={BadgeDollarSign}
          delta={{ value: 8.4, positive: true }} tone="success" />
        <KpiCard title="Revenue Generated" value={compactMoney(totals.revenue)}
          note={`${count(totals.conversions)} conversions`} icon={TrendingUp}
          delta={{ value: 12.1, positive: true }} tone="success" />
        <KpiCard title="Blended ROAS" value={`${totals.roas.toFixed(2)}x`}
          note={totals.roas >= 2 ? 'above target (2.0x)' : 'below target (2.0x)'}
          icon={BarChart3} tone={totals.roas >= 2 ? 'success' : 'warning'}
          action={{ label: 'Analyze ROI', ariaLabel: 'Open Performance Analytics', onClick: () => navigate('/analytics') }} />
      </div>

      <div className="e-card app-card">
        <div className="e-card-header app-card-header">
          <div className="e-card-header-caption">
            <div className="e-card-header-title app-card-title">Campaign Registry</div>
            <div className="e-card-sub-title app-card-sub">
              Expand any campaign to inspect its campaign activities (assets, deliverables, and workflow stage).
            </div>
          </div>
        </div>
        <div className="e-card-content app-card-content">
          <div className="app-portfolio-treegrid">
            <TreeGridComponent
              ref={(g: TreeGrid | null) => { treeGridRef.current = g; }}
              dataSource={treeData}
              childMapping="subTasks"
              treeColumnIndex={0}
              toolbar={['ExcelExport','Search']}
              toolbarClick={toolbarClick}
              allowSorting
              allowFiltering
              allowMultiSorting
              filterSettings={{ type: 'Excel', hierarchyMode: 'Child' }}
              allowPaging
              pageSettings={{ pageSize: 8, pageSizeMode: 'Root' }}
              width="100%"
              rowHeight={48}
              gridLines="None"
              allowExcelExport
              allowPdfExport
              
            >
              <ColumnsDirective>
                <ColumnDirective
                  field="taskName"
                  headerText="Campaign"
                  width="260"
                  template={TitleTemplate}
                />
                <ColumnDirective field="code" headerText="Code" width="186" />
                <ColumnDirective
                  field="status"
                  headerText="Phase"
                  width="160"
                  clipMode="EllipsisWithTooltip"
                  template={PhaseTemplate}
                />
                <ColumnDirective
                  field="progress"
                  headerText="Progress"
                  width="150"
                  template={ProgressTemplate}
                />
                 <ColumnDirective
                  field="priority"
                  headerText="Priority"
                  width="120"
                  clipMode="EllipsisWithTooltip"
                  template={PriorityTemplate}
                />
                <ColumnDirective
                  field="startDate"
                  headerText="Start Date"
                  width="120"
                  template={StartDateTemplate}
                />
                <ColumnDirective
                  field="endDate"
                  headerText="End Date"
                  width="120"
                  template={EndDateTemplate}
                />
                <ColumnDirective field="owner" headerText="Owner" width="120" />
               
                <ColumnDirective
                  field="budget"
                  headerText="Budget"
                  width="150"
                  textAlign="Right"
                  clipMode="EllipsisWithTooltip"
                  template={BudgetTemplate}
                />
                <ColumnDirective
                  field="spend"
                  headerText="Spend"
                  width="120"
                  textAlign="Right"
                  clipMode="EllipsisWithTooltip"
                  template={SpendTemplate}
                />
                <ColumnDirective
                  field="revenue"
                  headerText="Revenue"
                  width="92"
                  textAlign="Right"
                  clipMode="EllipsisWithTooltip"
                  template={RevenueTemplate}
                />
                <ColumnDirective
                  field="roas"
                  headerText="ROAS"
                  width="120"
                  textAlign="Right"
                  template={RoasTemplate}
                />
              </ColumnsDirective>
              <Inject services={[Filter, Sort, Page, Toolbar, ExcelExport, PdfExport]} />
            </TreeGridComponent>
          </div>
        </div>
      </div>
    </div>
  );
}
