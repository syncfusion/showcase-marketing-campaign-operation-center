// AI Assist provider behind an interface (AIProvider) so the view never computes
// answers itself. Deterministic, no external API, grounded in current campaign data.
// The footer disclosure ("Grounded in your current session data") lives in the panel
// header, not in every response.

import type { Campaign, Deliverable } from '../types/domain';
import { compactMoney, count, percent } from '../format/format';

export interface AIRequest {
  prompt: string;
  scope: { campaigns: Campaign[]; deliverables: Deliverable[] };
}

export interface AIProvider {
  answer(req: AIRequest): Promise<string>;
}

const KNOWN_TASKS = [
  'suggest copy for',
  'write subject line',
  'recommend budget for',
  'anomaly',
  'summarize'
];

function matchesTask(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  for (const t of KNOWN_TASKS) if (lower.includes(t)) return t;
  return null;
}

function statusTone(revenue: number, spend: number): string {
  if (spend === 0) return 'paused or not yet launched';
  const roas = revenue / spend;
  if (roas >= 3) return 'strong — return is well above spend';
  if (roas >= 1.5) return 'healthy';
  if (roas >= 1) return 'breaking even — review channel mix';
  return 'under-performing — consider pause or rework';
}

function buildAnomalyAnswer(req: AIRequest): string {
  const { campaigns } = req.scope;
  const candidates = campaigns
    .filter(c => c.spend > 0)
    .map(c => ({ c, roas: c.revenue / c.spend, ctr: c.impressions > 0 ? c.clicks / c.impressions : 0, cvr: c.clicks > 0 ? c.conversions / c.clicks : 0 }))
    .filter(x => x.roas > 0);

  if (candidates.length === 0) {
    return 'No live spend to analyze yet. Run the Q4 campaigns for a few more days, then ask again.';
  }

  const sortedByRoas = [...candidates].sort((a, b) => a.roas - b.roas);
  const worst = sortedByRoas[0];
  const sortedByCtr = [...candidates].sort((a, b) => a.ctr - b.ctr);
  const lowCtr = sortedByCtr[0];

  return [
    `**Performance anomaly scan**`,
    ``,
    `**Under-performing on return** — ${worst.c.title} (${worst.c.code}) is returning ${worst.roas.toFixed(2)}x against ${compactMoney(worst.c.spend)} spend on ${worst.c.channel}. Status reads as **${statusTone(worst.c.revenue, worst.c.spend)}**.`,
    ``,
    `**Click-through weakness** — ${lowCtr.c.title} (${lowCtr.c.code}) is at ${(lowCtr.ctr * 100).toFixed(2)}% CTR on ${lowCtr.c.channel}. Compare creative freshness and audience targeting against your Q3 baseline.`,
    ``,
    `**Suggested next step**: pause or rework the lowest-ROAS campaign first; reassign 25–50% of its remaining budget to the highest-ROAS channel. Use the *Q4 Reallocation* prompt for a concrete plan.`,
    ``
  ].join('\n');
}

function buildSuggestCopyAnswer(req: AIRequest): string {
  const { campaigns } = req.scope;
  const live = campaigns.filter(c => c.status === 'Active' || c.status === 'Scheduled');
  const target = live[0];
  if (!target) return 'No active campaign to write copy for. Pick one from the portfolio and try again.';
  return [
    `**Copy variants for ${target.title} (${target.code})**`,
    ``,
    `Audience: **${target.targetAudience}** • Channel: **${target.channel}** • Objective: **${target.objective}**`,
    ``,
    `1.  "Built for ${target.targetAudience.toLowerCase()} — see how ${target.title.split(' ').slice(0, 2).join(' ')} cuts your week of work in half." _(pain-point)_`,
    `2.  "From a 20-tab Monday to a one-page Tuesday. See what changed." _(curiosity)_`,
    `3.  "Join 4,200+ teams who run their Q4 on autopilot. See the playbook." _(social proof)_`,
    ``,
    `Subject line test pair for the nurture sequence:`,
    `•  A: "Your Q4 plan, in 4 minutes"`,
    `•  B: "One chart that changed our Q4"`,
    ``
  ].join('\n');
}

function buildSubjectLineAnswer(req: AIRequest): string {
  return [
    `**Subject line test pairs**`,
    ``,
    `1.  "Your Q4 plan, in 4 minutes"  vs  "One chart that changed our Q4"`,
    `2.  "We saved 9 hours last week"  vs  "9 hours, one template"`,
    `3.  "Three teams, one playbook"  vs  "How three teams cut review time"`,
    `4.  "You're invited — see the deck"  vs  "A 12-slide deck, just for you"`,
    ``,
    `Test rule: open-rate uplift > 12% and click-to-open > 8% before promoting a winner.`,
    ``
  ].join('\n');
}

function buildBudgetAnswer(req: AIRequest): string {
  const { campaigns } = req.scope;
  const ranked = [...campaigns].filter(c => c.spend > 0).sort((a, b) => (b.revenue / Math.max(1, b.spend)) - (a.revenue / Math.max(1, a.spend)));
  if (ranked.length === 0) return 'No spend yet. Fund at least one campaign before asking for reallocation advice.';
  const top = ranked[0];
  const bottom = ranked[ranked.length - 1];
  const shift = Math.round(bottom.spend * 0.5);
  return [
    `**Q4 budget reallocation suggestion**`,
    ``,
    `Increase **${top.title}** (${top.code}) on **${top.channel}** by **${compactMoney(shift)}** — currently returning ${(top.revenue / top.spend).toFixed(2)}x.`,
    ``,
    `Decrease **${bottom.title}** (${bottom.code}) on **${bottom.channel}** by the same amount. It returns ${(bottom.revenue / Math.max(1, bottom.spend)).toFixed(2)}x on ${compactMoney(bottom.spend)} of spend.`,
    ``,
    `Expected blended ROAS if the shift is executed: monitor the next 14 days before committing the rest of the quarter's budget.`,
    ``
  ].join('\n');
}

function buildSummaryAnswer(req: AIRequest): string {
  const { campaigns, deliverables } = req.scope;
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const active = campaigns.filter(c => c.status === 'Active').length;
  const late = deliverables.filter(d => d.dueDate < '2026-10-15' && d.stage !== 'Completed').length;
  return [
    `**Portfolio snapshot**`,
    ``,
    `•  ${count(active)} active campaigns across ${new Set(campaigns.map(c => c.channel)).size} channels.`,
    `•  ${compactMoney(totalSpend)} spent so far, returning ${compactMoney(totalRevenue)} (${percent(totalSpend > 0 ? totalRevenue / totalSpend : 0)} return).`,
    `•  ${count(deliverables.length)} deliverables in flight; ${count(late)} past due on Q4 work.`,
    ``,
    `**Top three priorities for the next two weeks**`,
    `1.  Unblock the Summit keynote deck (urgent, due 10/30).`,
    `2.  Cut the lowest-ROAS live campaign and reallocate 50% of its remaining budget.`,
    `3.  Move two "In Review" holiday assets to "Ready for Launch" before 10/30.`,
    ``
  ].join('\n');
}

export class SampleAIProvider implements AIProvider {
  async answer(req: AIRequest): Promise<string> {
    // Simulate a small async delay so the chat surface is observable.
    await new Promise(resolve => setTimeout(resolve, 250));
    const task = matchesTask(req.prompt);
    if (!task) {
      return [
        `**AI Assist** — here are the things I can help with on your current session data:`,
        ``,
        `•  "Suggest copy for [campaign name]" — three on-brand variants and a subject line test pair`,
        `•  "Write subject line variants" — 4 test pairs tuned for nurture-style sequences`,
        `•  "Recommend budget for [channel]" — a Q4 reallocation plan grounded in current ROAS`,
        `•  "Anomaly scan" — flag the lowest-ROAS live campaign and the lowest-CTR live campaign`,
        `•  "Summarize portfolio" — a three-priority snapshot for the next two weeks`,
        ``
      ].join('\n');
    }
    switch (task) {
      case 'suggest copy for': return buildSuggestCopyAnswer(req);
      case 'write subject line': return buildSubjectLineAnswer(req);
      case 'recommend budget for': return buildBudgetAnswer(req);
      case 'anomaly': return buildAnomalyAnswer(req);
      case 'summarize': return buildSummaryAnswer(req);
    }
    return 'AI Assist did not recognise that task on the current session data. Try one of the suggestions below.';
  }
}

export const sampleAI = new SampleAIProvider();
