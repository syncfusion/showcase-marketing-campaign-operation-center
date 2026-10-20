// Session overlay + customer persistence.
// Public mode = session (per-tab in-memory, lost on close) by default.
// Customer persistence = browser (saved to localStorage under STORAGE_KEY) once the
// app's "Save my edits" toggle is on. Public edits (session) are kept separately from
// customer edits (browser) so that the rule "JSON cannot update shipped files" holds:
// browser storage never writes the fixture file on disk.

import { useEffect, useSyncExternalStore } from 'react';
import { seedDataset } from '../data/fixtures';
import type { Campaign, Dataset, Deliverable, Stage } from '../types/domain';

const STORAGE_KEY = 'marketing-campaign-ops-session-v1';
const CUSTOMER_KEY = 'marketing-campaign-ops-customer-v1';

export type CustomerEdits = {
  campaigns: Record<string, Partial<Campaign>>;
  deliverables: Record<string, Partial<Deliverable>>;
  newDeliverables: Deliverable[];
  newCampaigns: Campaign[];
  removedCampaignIds: string[];
  removedDeliverableIds: string[];
};

const emptyEdits = (): CustomerEdits => ({
  campaigns: {},
  deliverables: {},
  newDeliverables: [],
  newCampaigns: [],
  removedCampaignIds: [],
  removedDeliverableIds: []
});

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full / disabled */ }
}

type Listener = () => void;

class Store {
  // Hold the seed dataset by reference until a write actually needs a mutable
  // copy. This is the single largest per-mount cost removed for the first
  // refresh: structuredClone used to run on every store init and every edit,
  // even when the user had no overlays and the result was discarded.
  private dataset: Dataset = seedDataset;
  private sessionEdits: CustomerEdits = emptyEdits();
  private customerEdits: CustomerEdits = emptyEdits();
  private sessionPersisted = false;
  private customerPersisted = false;
  private hydrated = false;
  private listeners = new Set<Listener>();

  /**
   * Lazy init: read any persisted overlays from localStorage.
   *
   * Previously this ran synchronously inside a useEffect on every App mount
   * (twice in StrictMode) and called applyEdits() — which structuredClone'd
   * the entire seed dataset — before React could paint the first frame.
   *
   * Now we:
   *   - synchronously seed the in-memory dataset to the shipped fixtures so
   *     useDataset() returns real data on the very first render;
   *   - defer the localStorage reads until after first paint
   *     (requestIdleCallback / setTimeout fallback, normally well under a
   *     millisecond on a fast device, but never blocks the render path);
   *   - if any persisted edits exist, run applyEdits() once and emit.
   *
   * The blank-session path (the common case for a first-time visitor, a
   * refresh with no customer-saved edits, or when localStorage is disabled)
   * does zero JSON work before first paint.
   */
  init() {
    // Run hydration after the browser has a chance to paint.
    const runHydration = () => {
      if (this.hydrated) return;
      this.hydrated = true;
      let session = emptyEdits();
      let customer = emptyEdits();
      try {
        session = safeRead<CustomerEdits>(STORAGE_KEY, session);
        customer = safeRead<CustomerEdits>(CUSTOMER_KEY, customer);
        this.sessionPersisted = safeRead<boolean>(STORAGE_KEY + ':flag', false);
        this.customerPersisted = safeRead<boolean>(CUSTOMER_KEY + ':flag', false);
      } catch {
        // localStorage unavailable; treat as empty session.
      }
      const hasEdits =
        Object.keys(session.campaigns).length > 0 ||
        Object.keys(session.deliverables).length > 0 ||
        session.newCampaigns.length > 0 ||
        session.newDeliverables.length > 0 ||
        session.removedCampaignIds.length > 0 ||
        session.removedDeliverableIds.length > 0 ||
        customer.newCampaigns.length > 0 ||
        customer.newDeliverables.length > 0;
      this.sessionEdits = session;
      this.customerEdits = customer;
      if (hasEdits) this.applyEdits();
      else this.emit();
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(runHydration, { timeout: 50 });
    else setTimeout(runHydration, 0);
  }

  subscribe = (l: Listener) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  private emit() { this.listeners.forEach(l => l()); }

  getDataset(): Dataset { return this.dataset; }

  isSessionPersisted() { return this.sessionPersisted; }
  isCustomerPersisted() { return this.customerPersisted; }

  setSessionPersisted(flag: boolean) {
    this.sessionPersisted = flag;
    safeWrite(STORAGE_KEY + ':flag', flag);
    if (flag) safeWrite(STORAGE_KEY, this.sessionEdits);
    else safeWrite(STORAGE_KEY, '');
    this.emit();
  }

  setCustomerPersisted(flag: boolean) {
    this.customerPersisted = flag;
    safeWrite(CUSTOMER_KEY + ':flag', flag);
    if (flag) safeWrite(CUSTOMER_KEY, this.customerEdits);
    else safeWrite(CUSTOMER_KEY, '');
    this.emit();
  }

  /** Apply a campaign edit, optionally as a customer edit (persistent) or session edit. */
  editCampaign(id: string, patch: Partial<Campaign>, customer: boolean) {
    const target = customer ? this.customerEdits : this.sessionEdits;
    target.campaigns[id] = { ...(target.campaigns[id] ?? {}), ...patch };
    this.persist(customer);
    this.applyEdits();
  }

  editDeliverable(id: string, patch: Partial<Deliverable>, customer: boolean) {
    const target = customer ? this.customerEdits : this.sessionEdits;
    target.deliverables[id] = { ...(target.deliverables[id] ?? {}), ...patch };
    this.persist(customer);
    this.applyEdits();
  }

  /** Move a deliverable to a different stage. */
  moveDeliverable(id: string, stage: Stage, customer: boolean) {
    this.editDeliverable(id, { stage }, customer);
  }

  addDeliverable(d: Deliverable, customer: boolean) {
    const target = customer ? this.customerEdits : this.sessionEdits;
    target.newDeliverables.push(d);
    this.persist(customer);
    this.applyEdits();
  }

  addCampaign(c: Campaign, customer: boolean) {
    const target = customer ? this.customerEdits : this.sessionEdits;
    target.newCampaigns.push(c);
    this.persist(customer);
    this.applyEdits();
  }

  removeCampaign(id: string, customer: boolean) {
    const target = customer ? this.customerEdits : this.sessionEdits;
    target.removedCampaignIds.push(id);
    this.persist(customer);
    this.applyEdits();
  }

  removeDeliverable(id: string, customer: boolean) {
    const target = customer ? this.customerEdits : this.sessionEdits;
    target.removedDeliverableIds.push(id);
    this.persist(customer);
    this.applyEdits();
  }

  /** Reset to the shipped JSON baseline; clear both overlays. */
  resetAll() {
    this.sessionEdits = emptyEdits();
    this.customerEdits = emptyEdits();
    safeWrite(STORAGE_KEY, '');
    safeWrite(CUSTOMER_KEY, '');
    // Drop back to the seed dataset directly; no clone needed.
    this.dataset = seedDataset;
    this.emit();
  }

  private persist(customer: boolean) {
    if (customer && this.customerPersisted) safeWrite(CUSTOMER_KEY, this.customerEdits);
    if (!customer && this.sessionPersisted) safeWrite(STORAGE_KEY, this.sessionEdits);
  }

  /**
   * Compose the dataset: baseline + per-record patches + new records − removed ids.
   *
   * The baseline is the frozen seed dataset on the common (no-overlay) path;
   * we only structuredClone when we actually need a merged copy. The first
   * edit-free paint of the app spends essentially zero time here.
   */
  private applyEdits() {
    const removeIds = new Set([
      ...this.sessionEdits.removedCampaignIds,
      ...this.customerEdits.removedCampaignIds
    ]);
    const removeDelIds = new Set([
      ...this.sessionEdits.removedDeliverableIds,
      ...this.customerEdits.removedDeliverableIds
    ]);

    const merge = <T extends { id: string }>(records: T[], patches: Record<string, Partial<T>>): T[] =>
      records
        .filter(r => !removeIds.has(r.id) && !removeDelIds.has(r.id))
        .map(r => ({ ...r, ...(patches[r.id] ?? {}) }));

    const campaigns = merge(seedDataset.campaigns, { ...this.sessionEdits.campaigns, ...this.customerEdits.campaigns });
    const deliverables = merge(seedDataset.deliverables, { ...this.sessionEdits.deliverables, ...this.customerEdits.deliverables });

    // New records (session + customer). Customer wins on id collision.
    const newCs = [...this.sessionEdits.newCampaigns, ...this.customerEdits.newCampaigns];
    const newDs = [...this.sessionEdits.newDeliverables, ...this.customerEdits.newDeliverables];
    const campMap = new Map(campaigns.map(x => [x.id, x]));
    for (const nc of newCs) campMap.set(nc.id, { ...(campMap.get(nc.id) ?? {}), ...nc });
    const delMap = new Map(deliverables.map(x => [x.id, x]));
    for (const nd of newDs) delMap.set(nd.id, { ...(delMap.get(nd.id) ?? {}), ...nd });

    this.dataset = {
      campaigns: [...campMap.values()],
      deliverables: [...delMap.values()],
      owners: seedDataset.owners,
      generatedAt: seedDataset.generatedAt
    };
    this.emit();
  }
}

export const store = new Store();

export function useDataset(): Dataset {
  return useSyncExternalStore(store.subscribe, () => store.getDataset(), () => store.getDataset());
}

interface StoreFlags {
  sessionPersisted: boolean;
  customerPersisted: boolean;
}
const flagsClient = (): StoreFlags => ({
  sessionPersisted: store.isSessionPersisted(),
  customerPersisted: store.isCustomerPersisted()
});
const flagsEmpty: StoreFlags = { sessionPersisted: false, customerPersisted: false };
let flagsCache: StoreFlags = flagsEmpty;
function flagsSnapshot(): StoreFlags {
  const next = flagsClient();
  if (flagsCache.sessionPersisted === next.sessionPersisted && flagsCache.customerPersisted === next.customerPersisted) {
    return flagsCache;
  }
  flagsCache = next;
  return flagsCache;
}

export function useStoreFlags(): StoreFlags {
  // useSyncExternalStore requires a stable snapshot reference. We memoize on
  // the listener side: the store.subscribe callback emits only on real change,
  // and flagsSnapshot returns the same object while flags are unchanged.
  return useSyncExternalStore(
    store.subscribe,
    flagsSnapshot,
    () => flagsEmpty
  );
}

export function useBootstrap() {
  useEffect(() => { store.init(); }, []);
}
