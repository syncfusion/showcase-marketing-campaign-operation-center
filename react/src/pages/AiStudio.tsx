import { useEffect, useMemo, useRef, useState } from 'react';
import { AIAssistViewComponent, PromptRequestEventArgs } from '@syncfusion/ej2-react-interactive-chat';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { SidebarComponent } from '@syncfusion/ej2-react-navigations';
import {
  Sparkles, Eye, ThumbsUp, MessageCircle, Share2,
  Facebook, Instagram, Youtube, Twitter, Linkedin, Twitch, Send, Music2,
  Globe, Mail, Radio, X, Wand2, Lightbulb
} from 'lucide-react';
import { useDataset } from '../store/store';
import { sampleAI } from '../ai/provider';
import { compactMoney, compactCount, count, shortDate } from '../format/format';
import { CHANNELS, type Campaign, type Channel } from '../types/domain';
import './pages.css';

// Tiny markdown -> HTML converter. The view's responses are written in this dialect.
function renderMarkdown(text: string): string {
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = text.split('\n');
  const out: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let paraBuf: string[] = [];

  const flushPara = () => {
    if (paraBuf.length) {
      out.push(`<p>${inline(paraBuf.join(' '))}</p>`);
      paraBuf = [];
    }
  };
  const closeList = () => {
    if (inList && listType) { out.push(`</${listType}>`); inList = false; listType = null; }
  };
  const inline = (s: string) => escape(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) { flushPara(); closeList(); continue; }
    if (/^#{1,3}\s+/.test(line)) { flushPara(); closeList(); const t = line.replace(/^#+\s+/, ''); out.push(`<h3>${inline(t)}</h3>`); continue; }
    const ol = /^(\d+)\.\s+/.exec(line);
    const ul = /^[-•]\s+/.test(line);
    if (ol) {
      flushPara();
      if (!inList || listType !== 'ol') { closeList(); out.push('<ol>'); inList = true; listType = 'ol'; }
      out.push(`<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>`);
      continue;
    }
    if (ul) {
      flushPara();
      if (!inList || listType !== 'ul') { closeList(); out.push('<ul>'); inList = true; listType = 'ul'; }
      out.push(`<li>${inline(line.replace(/^[-•]\s+/, ''))}</li>`);
      continue;
    }
    closeList();
    paraBuf.push(line);
  }
  flushPara();
  closeList();
  return out.join('');
}

// Map a campaign channel + objective to the social platforms that typically carry it.
// Each campaign is rendered with a small stack of platform icons (Lucide).
type PlatformKey = 'facebook' | 'instagram' | 'youtube' | 'twitter' | 'linkedin' | 'tiktok' | 'twitch' | 'telegram' | 'web' | 'email' | 'podcast';
const PLATFORM_ICON: Record<PlatformKey, typeof Facebook> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  twitter: Twitter,
  linkedin: Linkedin,
  tiktok: Music2,
  twitch: Twitch,
  telegram: Send,
  web: Globe,
  email: Mail,
  podcast: Radio
};
const PLATFORM_LABEL: Record<PlatformKey, string> = {
  facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', twitter: 'X / Twitter',
  linkedin: 'LinkedIn', tiktok: 'TikTok', twitch: 'Twitch', telegram: 'Telegram',
  web: 'Web', email: 'Email', podcast: 'Podcast'
};
const PLATFORM_COLOR: Record<PlatformKey, string> = {
  facebook: '#1877F2', instagram: '#E4405F', youtube: '#FF0000', twitter: '#0f172a',
  linkedin: '#0A66C2', tiktok: '#f43f5e', twitch: '#9146FF', telegram: '#229ED9',
  web: '#475569', email: '#b54708', podcast: '#7c3aed'
};

function platformsForCampaign(c: Campaign): PlatformKey[] {
  // Channel + objective gives a believable social mix.
  if (c.channel === 'Paid Social') {
    if (c.targetAudience === 'B2B Enterprise' || c.targetAudience === 'Mid-Market Tech') {
      return ['linkedin', 'twitter', 'facebook'];
    }
    if (c.targetAudience === 'Consumer Retail') {
      return ['instagram', 'facebook', 'tiktok'];
    }
    return ['instagram', 'facebook'];
  }
  if (c.channel === 'Influencer Partnerships') {
    if (c.targetAudience === 'B2B Enterprise') return ['linkedin', 'youtube'];
    return ['instagram', 'tiktok', 'youtube'];
  }
  if (c.channel === 'Content & SEO') {
    return ['youtube', 'linkedin', 'web'];
  }
  if (c.channel === 'Event & Webinar') {
    return ['linkedin', 'youtube', 'email'];
  }
  if (c.channel === 'Email Marketing') {
    return ['email'];
  }
  if (c.channel === 'Paid Search') {
    return []; // not a social surface; omitted from the social cards
  }
  return ['web'];
}

// Hero tint per campaign (CSS gradient). Keeps cards visually distinct without external images.
function heroStyle(c: Campaign): React.CSSProperties {
  // Build a deterministic hue pair from the campaign code so the same campaign always renders the same hero.
  const seed = Array.from(c.code).reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const palettes = [
    ['#fde7e7', '#fbcfe8', '#a78bfa'], // pink / fuchsia
    ['#fef3c7', '#fde68a', '#f59e0b'], // amber
    ['#dbeafe', '#c7d2fe', '#6366f1'], // blue / indigo
    ['#ccfbf1', '#a7f3d0', '#10b981'], // teal
    ['#ede9fe', '#fbcfe8', '#ec4899'], // violet
    ['#fee2e2', '#fecaca', '#dc2626'], // red
    ['#e0e7ff', '#c7d2fe', '#4f46e5'], // indigo cool
    ['#fef9c3', '#fde68a', '#ca8a04']  // warm yellow
  ];
  const [a, b, c1] = palettes[seed % palettes.length];
  return {
    background: `linear-gradient(135deg, ${a} 0%, ${b} 55%, ${c1} 100%)`
  };
}

// A short, poster-style line derived from the campaign's objective + audience so the hero
// gradient feels like a real campaign poster while staying grounded in the session data.
function heroHeadline(c: Campaign): string {
  const audience = c.targetAudience === 'Consumer Retail' ? 'Holiday'
    : c.targetAudience === 'B2B Enterprise' ? 'Enterprise'
    : c.targetAudience === 'Mid-Market Tech' ? 'Mid-Market'
    : 'Growth';
  switch (c.objective) {
    case 'Brand Awareness':       return `${audience} Brand Lift`;
    case 'Lead Generation':       return `Pipeline for ${audience}`;
    case 'Customer Acquisition':  return `New Customers, ${audience}`;
    case 'Retention & Loyalty':   return `Loyalty Playbook`;
    case 'Product Launch':        return `Launch — ${audience}`;
  }
}

function progressFor(c: Campaign): { pct: number; tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral' } {
  if (c.status === 'Draft') return { pct: 4, tone: 'neutral' };
  if (c.status === 'Scheduled') return { pct: 12, tone: 'info' };
  if (c.status === 'Completed') return { pct: 100, tone: 'success' };
  if (c.status === 'Paused') return { pct: Math.round((c.spend / Math.max(c.budget, 1)) * 100), tone: 'warning' };
  const pct = c.budget > 0 ? Math.min(100, Math.round((c.spend / c.budget) * 100)) : 0;
  const roas = c.spend > 0 ? c.revenue / c.spend : 0;
  const tone: 'success' | 'info' | 'warning' | 'danger' = roas >= 2 ? 'success' : roas >= 1 ? 'info' : roas >= 0.5 ? 'warning' : 'danger';
  return { pct: Math.max(pct, 6), tone };
}

function statusTone(s: Campaign['status']): 'success' | 'info' | 'warning' | 'neutral' {
  switch (s) {
    case 'Active': return 'success';
    case 'Scheduled': return 'info';
    case 'Paused': return 'warning';
    case 'Completed': return 'neutral';
    case 'Draft': return 'neutral';
  }
}

// Render a compact social-media-style card from a campaign's session data.
function SocialCard({ campaign, channelLabel }: { campaign: Campaign; channelLabel: string }) {
  const platforms = platformsForCampaign(campaign);
  const { pct, tone } = progressFor(campaign);
  const start = new Date(campaign.startDate + 'T00:00:00');
  const end = new Date(campaign.endDate + 'T00:00:00');
  const created = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000); // realistic "created" 1 week before launch
  // Engagement metrics derived from campaign data; kept grounded so the user recognises the numbers.
  const views = campaign.impressions;
  const likes = Math.round(campaign.clicks * 0.7);
  const comments = Math.round(campaign.conversions * 0.5);
  const shares = Math.round(campaign.conversions * 0.18);
  const updated = end.getTime() < Date.now() ? end : new Date(); // last update = end if completed, else today

  return (
    <article className="e-card app-social-card" aria-label={`Social card: ${campaign.title}`}>
      <div className="e-card-content app-social-card-inner">
        <header className="app-social-card-head">
          <div className="app-social-platforms" aria-label="Platforms">
            {platforms.map((p, idx) => {
              const Icon = PLATFORM_ICON[p];
              const bg = PLATFORM_COLOR[p];
              // TikTok brand uses a cyan→pink gradient with dark glyph; using a flat
              // brand-black chip matches the card surface in dark theme and the icon
              // disappears, so give the chip the brand gradient and keep the glyph
              // on a dark colour so it reads in both themes.
              const style: React.CSSProperties = p === 'tiktok'
                ? {
                    background: 'linear-gradient(135deg, #25F4EE 0%, #FE2C55 100%)',
                    color: '#0b0f19'
                  }
                : { background: bg };
              return (
                <span
                  key={`${p}-${idx}`}
                  className="app-social-platform"
                  title={PLATFORM_LABEL[p]}
                  aria-label={PLATFORM_LABEL[p]}
                  style={style}
                >
                  <Icon size={14} aria-hidden="true" />
                </span>
              );
            })}
          </div>
          <span className={`app-pill app-pill--${statusTone(campaign.status)}`}>{campaign.status}</span>
        </header>

        <h3 className="app-social-card-title">{campaign.title}</h3>
        <p className="app-social-card-meta">
          {campaign.targetAudience} · {channelLabel}
        </p>

        <div
          className="app-social-hero"
          style={heroStyle(campaign)}
          role="img"
          aria-label={`${heroHeadline(campaign)} — ${campaign.targetAudience} ${campaign.objective}`}
        >
          <span className="app-social-hero-eyebrow">{campaign.code}</span>
          {/* <span className="app-social-hero-headline">{heroHeadline(campaign)}</span> */}
          <span className="app-social-hero-foot">{campaign.targetAudience} · {campaign.objective}</span>
        </div>

        <p className="app-social-card-dates">
          <span><strong>Created:</strong> {shortDate(created)}</span>
          <span><strong>Last update:</strong> {shortDate(updated)}</span>
        </p>

        <div className="app-progress app-social-card-progress" aria-label="Spend pacing">
          <div className="app-progress-track">
            <div
              className={`app-progress-fill app-progress-fill--${tone}`}
              style={{ width: `${pct}%` }}
              aria-hidden="true"
            />
          </div>
          <span className="app-progress-value">{pct}%</span>
        </div>

        <p className="app-social-card-window">
          <span>Start: {shortDate(start)}</span>
          <span>End: {shortDate(end)}</span>
        </p>

        <ul className="app-social-card-stats" aria-label="Engagement">
          <li title={`${count(views)} views`}><Eye size={14} aria-hidden="true" /><span>{compactCount(views)}</span></li>
          <li title={`${count(likes)} likes`}><ThumbsUp size={14} aria-hidden="true" /><span>{compactCount(likes)}</span></li>
          <li title={`${count(comments)} comments`}><MessageCircle size={14} aria-hidden="true" /><span>{compactCount(comments)}</span></li>
          <li title={`${count(shares)} shares`}><Share2 size={14} aria-hidden="true" /><span>{compactCount(shares)}</span></li>
        </ul>
      </div>
    </article>
  );
}

export function AiStudioPage() {
  const dataset = useDataset();
  const assistRef = useRef<AIAssistViewComponent>(null);
  const [scopeChannel, setScopeChannel] = useState<string>('All');
  const [running, setRunning] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);

  // Escape closes the drawer — matches every enterprise AI-assist panel
  // (Linear, Notion AI, Intercom Fin) and matches the rest of the app shell.
  useEffect(() => {
    if (!assistOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAssistOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [assistOpen]);

  const scope = useMemo(() => ({
    campaigns: dataset.campaigns.filter(c => scopeChannel === 'All' || c.channel === scopeChannel),
    deliverables: dataset.deliverables
  }), [dataset, scopeChannel]);

  const totals = useMemo(() => {
    const socialChannels: Channel[] = ['Paid Social', 'Influencer Partnerships'];
    const socialCampaigns = scope.campaigns.filter(c => socialChannels.includes(c.channel));
    const spend = socialCampaigns.reduce((s, c) => s + c.spend, 0);
    const revenue = socialCampaigns.reduce((s, c) => s + c.revenue, 0);
    return { spend, revenue, count: socialCampaigns.length };
  }, [scope]);

  // Social cards: campaigns whose primary channel ships to a social surface.
  const socialCards = useMemo(() => {
    const socialChannels: Channel[] = ['Paid Social', 'Influencer Partnerships'];
    return dataset.campaigns
      .filter(c => socialChannels.includes(c.channel))
      .sort((a, b) => {
        // Active first, then by spend desc, so the most important card leads the row.
        const order = (s: Campaign['status']) =>
          s === 'Active' ? 0 : s === 'Scheduled' ? 1 : s === 'Paused' ? 2 : s === 'Completed' ? 3 : 4;
        const o = order(a.status) - order(b.status);
        if (o !== 0) return o;
        return b.spend - a.spend;
      });
  }, [dataset.campaigns]);

  async function onPromptRequest(args: PromptRequestEventArgs) {
    if (running) return;
    setRunning(true);
    try {
      const text = await sampleAI.answer({ prompt: args.prompt ?? '', scope });
      // AI responses are written in our tiny markdown dialect (**bold**, *italic*,
      // `code`, headings, lists). AIAssistView renders the response string as HTML,
      // so convert the dialect to HTML and wrap it in .app-ai-markdown so the
      // existing styles in pages.css apply.
      const html = `<div class="app-ai-markdown">${renderMarkdown(text)}</div>`;
      assistRef.current?.addPromptResponse(html);
    } finally {
      setRunning(false);
    }
  }

  const suggestions: string[] = [
    'Suggest copy for Holiday 2026 Brand Lift',
    'Write subject line variants for Q4 nurture',
    'Recommend budget for Paid Search in Q4',
    'Run an anomaly scan on the portfolio',
    'Summarize portfolio for the next two weeks'
  ];

  useEffect(() => {
    const rootElem = document.getElementById("root");
    if (!rootElem) return;
    if (assistOpen) {
      rootElem.style.overflow = 'hidden';
    } else {
      rootElem.style.overflow = '';
    }
  }, [assistOpen])

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <h1 className="app-page-title">Social Campaigns</h1>
          <p className="app-page-sub">
            Compose and review your campaign portfolio. Open AI Assist to draft copy,
            rebalance budget, or surface anomalies using your current session data.
          </p>
        </div>
        <div className="app-page-header-actions">
          <ButtonComponent
            cssClass="e-primary"
            onClick={() => setAssistOpen(true)}
          >
            <Sparkles size={14} aria-hidden="true" style={{ marginRight: 6, verticalAlign: '-2px' }} />
            Open AI Assist
          </ButtonComponent>
        </div>
      </div>

      {/* Social Media cards — sourced from real session campaign data. */}
      <section className="app-social-section" aria-label="Social media campaigns">
        <div className="app-social-grid">
          {socialCards.length === 0 ? (
            <div className="app-empty-state">No social campaigns in scope.</div>
          ) : (
            socialCards.map(c => (
              <SocialCard
                key={c.id}
                campaign={c}
                channelLabel={c.channel}
              />
            ))
          )}
        </div>
      </section>

      {/* AI Assist panel — slides in from the right.
          No opaque backdrop: matches enterprise AI panels (Linear, Notion AI, Intercom Fin)
          and avoids the z-index trap created by the page's `.e-content-animation` parent,
          which forces a new stacking context. Close via the X, Escape, or a click anywhere
          outside the panel (`closeOnDocumentClick`). */}
      {assistOpen && <SidebarComponent
        id="compaign-ai-drawer"
        className="app-ai-drawer"
        type="Over"
        position="Right"
        width="480px"
        isOpen={assistOpen}
        showBackdrop={false}
        closeOnDocumentClick
        // animate
        close={() => setAssistOpen(false)}
        // style={{ height: '100dvh', maxHeight: '100dvh' }}
      >
        <div className="app-ai-drawer-card">
          <header className="app-ai-drawer-head">
            <div className="app-ai-drawer-title">
              <span className="app-ai-drawer-icon" aria-hidden="true">
                <Wand2 size={16} />
              </span>
              <div className="app-ai-drawer-title-text">
                <strong>AI Assist</strong>
                <small>Grounded in your current session data</small>
              </div>
            </div>
            <button
              type="button"
              className="app-ai-drawer-close"
              aria-label="Close AI Assist"
              onClick={() => setAssistOpen(false)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </header>

          <div className="app-ai-scope">
            <div className="app-ai-scope-stats">
              <span className="app-ai-scope-stat">
                <strong>{totals.count}</strong>
                <small>campaigns</small>
              </span>
              <span className="app-ai-scope-stat">
                <strong>{compactMoney(totals.spend)}</strong>
                <small>spend</small>
              </span>
              <span className="app-ai-scope-stat">
                <strong>{compactMoney(totals.revenue)}</strong>
                <small>revenue</small>
              </span>
            </div>
            <div className="app-ai-scope-controls">
              <label className="app-ai-scope-field">
                <span>Channel</span>
                <DropDownListComponent
                  dataSource={['All', ...CHANNELS]}
                  value={scopeChannel}
                  change={(e: any) => setScopeChannel(e.value as string)}
                  popupHeight="220px"
                  width="160px"
                  cssClass="e-outline"
                />
              </label>
              <ButtonComponent
                cssClass="e-outline e-small"
                onClick={() => assistRef.current?.executePrompt('Run an anomaly scan')}
              >
                <Lightbulb size={12} aria-hidden="true" style={{ marginRight: 4, verticalAlign: '-1px' }} />
                Run anomaly scan
              </ButtonComponent>
            </div>
          </div>

          <div className="app-ai-assist-wrap">
            <AIAssistViewComponent
              id="campaign-ai"
              ref={assistRef}
              promptRequest={onPromptRequest}
              promptSuggestions={suggestions}
              promptSuggestionsHeader="Try asking"
              showHeader={false}
              height="100%"
              cssClass="app-ai-studio"
            />
          </div>
        </div>
      </SidebarComponent>}
    </div>
  );
}