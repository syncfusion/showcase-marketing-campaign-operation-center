import { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Megaphone, LayoutDashboard, KanbanSquare, BarChart3, Sparkles } from 'lucide-react';
import { AppShell } from './shell/AppShell';
import { useBootstrap } from './store/store';
import { useThemeReady } from './main';
const PortfolioPage = lazy(() => import('./pages/Portfolio').then(m => ({ default: m.PortfolioPage })));
const PlanningPage = lazy(() => import('./pages/Planning').then(m => ({ default: m.PlanningPage })));
const AnalyticsPage = lazy(() => import('./pages/Analytics').then(m => ({ default: m.AnalyticsPage })));
const AiStudioPage = lazy(() => import('./pages/AiStudio').then(m => ({ default: m.AiStudioPage })));

type Theme = 'light' | 'dark';
const THEME_KEY = 'marketing-campaign-ops-theme';

function readTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'dark' ? 'dark' : 'light';
  } catch { return 'light'; }
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const link = document.getElementById('theme-link') as HTMLLinkElement | null;
  if (link) {
    // Syncfusion ships light + dark bundles; swap the href to keep charts in step.
    link.href = theme === 'dark'
      ? 'https://cdn.syncfusion.com/ej2/29.2.4/tailwind3-dark.css'
      : 'https://cdn.syncfusion.com/ej2/29.2.4/tailwind3.css';
  }
}

const ROUTES = [
  { id: 'portfolio', path: '/', label: 'Campaign Portfolio', icon: 'dashboard' as const },
  { id: 'planning', path: '/planning', label: 'Planning Board', icon: 'planning' as const },
  { id: 'analytics', path: '/analytics', label: 'Performance Analytics', icon: 'analytics' as const },
  { id: 'ai', path: '/ai-studio', label: 'Compaign Studio', icon: 'ai' as const }
];

export function App() {
  useBootstrap();
  const themeReady = useThemeReady();
  const [theme, setTheme] = useState<Theme>(readTheme);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { applyTheme(theme); }, [theme]);
  // The static startup frame (#app-boot) covers the viewport with the shell
  // and "Loading…" until the Syncfusion theme bundle has applied, because the
  // shell has no layout without it. The theme provider in main.tsx reports
  // `ready` on the link's load/error event, so we strip the frame here.
  useEffect(() => {
    if (themeReady) document.getElementById('app-boot')?.remove();
  }, [themeReady]);

  const currentId = (() => {
    const path = location.pathname;
    if (path.startsWith('/planning')) return 'planning';
    if (path.startsWith('/analytics')) return 'analytics';
    if (path.startsWith('/social')) return 'ai';
    return 'portfolio';
  })();

  const items = [
    { id: 'portfolio', label: 'Campaign Portfolio', href: '', icon: LayoutDashboard },
    { id: 'planning', label: 'Planning Board', href: 'planning', icon: KanbanSquare },
    { id: 'analytics', label: 'Performance Analytics', href: 'analytics', icon: BarChart3 },
    { id: 'ai', label: 'Social Campaigns', href: 'social', icon: Sparkles }
  ];

  function onNavigate(id: string) {
    const target = items.find(i => i.id === id);
    if (target) navigate(target.href.replace(/^#/, ''));
  }

  return (
    <AppShell
      appName="Marketing Campaign Ops"
      appSubtitle="Campaign Operations Center"
      logo={<Megaphone size={20} aria-hidden="true" />}
      items={items}
      currentId={currentId}
      onNavigate={onNavigate}
      theme={theme}
      onThemeChange={(t) => { setTheme(t); try { localStorage.setItem(THEME_KEY, t); } catch { /* ignore */ } }}
      storageKey="marketing-campaign-ops-nav-collapsed"
    >
      <Routes>
        <Route path="/" element={<Suspense fallback={<div className="app-page">Loading…</div>}><PortfolioPage /></Suspense>} />
        <Route path="/planning" element={<Suspense fallback={<div className="app-page">Loading…</div>}><PlanningPage /></Suspense>} />
        <Route path="/analytics" element={<Suspense fallback={<div className="app-page">Loading…</div>}><AnalyticsPage /></Suspense>} />
        <Route path="/social" element={<Suspense fallback={<div className="app-page">Loading…</div>}><AiStudioPage /></Suspense>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
