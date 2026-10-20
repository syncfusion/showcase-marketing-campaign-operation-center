import { useMemo, useRef, useState } from 'react';
import { KanbanComponent, ColumnsDirective, ColumnDirective, CardSettingsModel } from '@syncfusion/ej2-react-kanban';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { TextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DateTimePickerComponent } from '@syncfusion/ej2-react-calendars';
import { AlertTriangle } from 'lucide-react';
import { useDataset, store, useStoreFlags } from '../store/store';
import { shortDate, DATE_FORMAT } from '../format/format';
import { CHANNELS, ASSET_TYPES, PRIORITIES, STAGES, type AssetType, type Channel, type Deliverable, type Priority, type Stage } from '../types/domain';
import './pages.css';

// Allowed transitions per the workflow:
// forward through the workflow; one step back from In Review/Ready for Launch.
// Closed (Completed) lists only itself.
const TRANSITIONS: Record<Stage, Stage[]> = {
  'Backlog':           ['In Production'],
  'In Production':     ['Backlog', 'In Review'],
  'In Review':         ['In Production', 'Ready for Launch'],
  'Ready for Launch':  ['In Review', 'Completed'],
  'Completed':         ['Completed']
};

function priorityTone(p: Priority): 'success' | 'info' | 'warning' | 'neutral' | 'danger' {
  switch (p) {
    case 'Urgent': return 'danger';
    case 'High': return 'warning';
    case 'Medium': return 'info';
    case 'Low': return 'neutral';
  }
}

// Module-level template (does not close over component scope).
function cardTemplate(props: any) {
  const d = props as Deliverable;
  const due = new Date(d.dueDate + 'T00:00:00');
  const today = new Date('2026-10-15');
  const isLate = due < today && d.stage !== 'Completed';
  // The Syncfusion Kanban wraps this template's root in its own
  // .e-card.e-template.e-droppable.e-lib.e-draggable element (with
  // ej2_instances set for the drag wiring), and the destroy path
  // unwires drag events on every .e-card inside .e-content-cells.e-drag.
  // If the template's root also carries the e-card class, the destroy
  // loop hits an inner div with no ej2_instances and throws
  // "Cannot read properties of undefined (reading '0')" at drag.js:790
  // when the user navigates away. Use app-kanban-card as the marker
  // class and let the Syncfusion wrapper carry e-card.
  return (
    <div className="app-kanban-card" data-priority={d.priority} data-id={d.id}>
      <div className="e-card-content app-kanban-card-inner">
        <div className="app-kanban-card-row">
          <span className="app-kanban-card-title">{d.title}</span>
        </div>
        <div className="app-kanban-card-row">
          <span className={`app-pill app-pill--${priorityTone(d.priority)}`}>{d.priority}</span>
          <span className="app-pill app-pill--info">{d.channel}</span>
        </div>
        <div className="app-kanban-card-meta">
          {d.assignee} · {d.assetType}
        </div>
        <div className="app-kanban-card-meta app-kanban-card-due">
          {isLate ? <AlertTriangle size={12} aria-hidden="true" style={{ color: 'var(--color-sf-danger-primary)' }} /> : null}
          <span>Due {shortDate(d.dueDate)}</span>
        </div>
      </div>
    </div>
  );
}

export function PlanningPage() {
  const dataset = useDataset();
  const flags = useStoreFlags();
  const kanbanRef = useRef<KanbanComponent>(null);
  const dialogRef = useRef<DialogComponent>(null);
  const [editing, setEditing] = useState<Deliverable | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [draft, setDraft] = useState<Deliverable>({
    id: '', campaignId: '', title: '', channel: 'Paid Search',
    stage: 'Backlog', priority: 'Medium', dueDate: '2026-10-25',
    assignee: 'Aria Chen', assetType: 'Ad Copy', notes: ''
  });

  const cards = useMemo(() => dataset.deliverables, [dataset.deliverables]);

  const cardSettings: CardSettingsModel = useMemo(() => ({
    headerField: 'id',
    contentField: 'title',
    template: cardTemplate,
    grabberField: 'id',
  }), []);

  function onActionComplete(args: any) {
    if (args.requestType === 'cardChanged') {
      const changed = args.changedRecords?.[0] ?? args.data?.[0];
      if (changed) {
        const id = changed.id ?? args.data?.id;
        const newStage = changed.key ?? changed.stage ?? args.data?.stage;
        if (id && newStage) store.moveDeliverable(id, newStage as Stage, flags.customerPersisted);
      }
    } else if (args.requestType === 'cardCreated' || args.requestType === 'cardUpdated') {
      if (args.addedRecords?.length) {
        for (const r of args.addedRecords) store.addDeliverable(r, flags.customerPersisted);
      }
    }
  }

  function openNew() {
    setEditing(null);
    setDraft({
      id: 'del-' + Date.now(),
      campaignId: dataset.campaigns[0]?.id ?? '',
      title: '',
      channel: dataset.campaigns[0]?.channel ?? 'Paid Search',
      stage: 'Backlog', priority: 'Medium', dueDate: '2026-10-25',
      assignee: dataset.owners[0] ?? 'Aria Chen',
      assetType: 'Ad Copy', notes: ''
    });
    setNewOpen(true);
  }

  function openEdit(d: Deliverable) {
    setEditing(d);
    setDraft({ ...d });
    setNewOpen(true);
  }

  function saveDraft() {
    if (!draft.title.trim()) return;
    if (editing) {
      store.editDeliverable(editing.id, draft, flags.customerPersisted);
    } else {
      store.addDeliverable({ ...draft, id: draft.id }, flags.customerPersisted);
    }
    setNewOpen(false);
  }

  function removeDraft() {
    if (editing) {
      store.removeDeliverable(editing.id, flags.customerPersisted);
      setNewOpen(false);
    }
  }

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <h1 className="app-page-title">Planning Board</h1>
          <p className="app-page-sub">Deliverables in flight. Drag a card to move it to the next stage; the workflow enforces allowed transitions.</p>
        </div>
        <ButtonComponent cssClass="e-primary" onClick={openNew}>
          New deliverable
        </ButtonComponent>
      </div>

      <div className="e-card" style={{ padding: 0, overflowX: "auto" }}>
        <KanbanComponent
          id="planning-kanban"
          ref={kanbanRef}
          keyField="stage"
          dataSource={cards}
          cardSettings={cardSettings}
          actionComplete={onActionComplete}
          dialogOpen={(args: any) => { args.cancel = true; openEdit(args.data); }}
          cssClass="app-planning-kanban"
          width={'100vw'}
        >
          <ColumnsDirective>
            {STAGES.map(s => (
              <ColumnDirective
                key={s}
                headerText={s}
                keyField={s}
                transitionColumns={TRANSITIONS[s]}
                allowToggle={true}
                isExpanded
              />
            ))}
          </ColumnsDirective>
        </KanbanComponent>
      </div>

      <DialogComponent
        ref={dialogRef}
        visible={newOpen}
        showCloseIcon
        closeOnEscape
        width="560px"
        header={editing ? `Edit · ${editing.title}` : 'New deliverable'}
        open={(args: any) => { args.preventFocus = false; }}
        close={() => setNewOpen(false)}
        buttons={[
          { click: saveDraft, buttonModel: { content: editing ? 'Save changes' : 'Create deliverable', isPrimary: true, cssClass: 'e-primary' } },
          ...(editing ? [{ click: removeDraft, buttonModel: { content: 'Delete', cssClass: 'e-danger e-outline' } }] : []),
          { click: () => setNewOpen(false), buttonModel: { content: 'Cancel', cssClass: 'e-outline' } }
        ]}
      >
        <form onSubmit={(e) => { e.preventDefault(); saveDraft(); }} className="app-form-grid">
          <label className="app-form-field app-form-field--wide">
            <span>Title</span>
            <TextBoxComponent value={draft.title} change={(e: any) => setDraft(d => ({ ...d, title: e.value }))} placeholder="What is being produced?" />
          </label>

          <label className="app-form-field">
            <span>Channel</span>
            <DropDownListComponent
              dataSource={CHANNELS}
              value={draft.channel}
              change={(e: any) => setDraft(d => ({ ...d, channel: e.value as Channel }))}
              popupHeight="220px"
            />
          </label>

          <label className="app-form-field">
            <span>Asset type</span>
            <DropDownListComponent
              dataSource={ASSET_TYPES}
              value={draft.assetType}
              change={(e: any) => setDraft(d => ({ ...d, assetType: e.value as AssetType }))}
              popupHeight="200px"
            />
          </label>

          <label className="app-form-field">
            <span>Priority</span>
            <DropDownListComponent
              dataSource={PRIORITIES}
              value={draft.priority}
              change={(e: any) => setDraft(d => ({ ...d, priority: e.value as Priority }))}
              popupHeight="200px"
            />
          </label>

          <label className="app-form-field">
            <span>Due date</span>
            <DateTimePickerComponent
              value={new Date(draft.dueDate + 'T00:00:00')}
              format={DATE_FORMAT}
              change={(e: any) => {
                const v = e.value instanceof Date ? e.value : new Date(e.value);
                if (!isNaN(v.getTime())) setDraft(d => ({ ...d, dueDate: v.toISOString().slice(0, 10) }));
              }}
            />
          </label>

          <label className="app-form-field">
            <span>Assignee</span>
            <DropDownListComponent
              dataSource={dataset.owners}
              value={draft.assignee}
              change={(e: any) => setDraft(d => ({ ...d, assignee: e.value as string }))}
              popupHeight="200px"
            />
          </label>

          <label className="app-form-field app-form-field--wide">
            <span>Notes</span>
            <textarea
              className="e-input"
              rows={3}
              value={draft.notes}
              onChange={(e) => setDraft(d => ({ ...d, notes: e.target.value }))}
              placeholder="Optional notes for the team"
            />
          </label>
        </form>
      </DialogComponent>
    </div>
  );
}
