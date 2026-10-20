import { StrictMode, createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerLicense } from '@syncfusion/ej2-base';
import './styles/tokens.css';
import { App } from './App';
import { getPublicBasePath } from './basePath';
// Syncfusion license — set VITE_SYNCFUSION_LICENSE_KEY in the deploy config.
// Per app-source-baseline.md, register only when a key is present; when it is
// not, evidence is recorded honestly rather than a placeholder being used to
// suppress the trial banner.
const licenseKey = (import.meta.env.VITE_SYNCFUSION_LICENSE_KEY ?? '').toString().trim();
if (licenseKey) registerLicense(licenseKey);

// Theme readiness. The Syncfusion theme bundle (a 4 MB stylesheet from the
// CDN) drives every control's layout, so the React tree must wait for it
// before removing the static startup frame (#app-boot) and revealing
// layout-measuring controls. "Ready" is the <link>'s `load` or `error`
// event, never `link.sheet` (which is true the moment the link is inserted,
// before the file arrives — workflow 2.18.1). The App's useEffect removes
// #app-boot when `ready` flips true.
//
// While the bundle is downloading, React mounts in parallel (createRoot.render
// is fire-and-forget) and the store hydrates localStorage in requestIdleCallback,
// so no work is wasted.
type ThemeContextValue = { ready: boolean };
const ThemeContext = createContext<ThemeContextValue>({ ready: false });

function ThemeProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const link = document.getElementById('theme-link') as HTMLLinkElement | null;
    if (!link) { setReady(true); return; }
    let armed = true;
    const finish = () => { if (armed) { armed = false; setReady(true); } };
    link.addEventListener('load', finish, { once: true });
    link.addEventListener('error', finish, { once: true });
    // Safety net: if neither load nor error fires (offline, cached after
    // the listener attached, etc.) unblock the app after 1.5 s so the page
    // is never stuck on the boot frame.
    const timeout = window.setTimeout(finish, 1500);
    return () => {
      armed = false;
      window.clearTimeout(timeout);
    };
  }, []);

  const value = useMemo(() => ({ ready }), [ready]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeReady(): boolean {
  return useContext(ThemeContext).ready;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={getPublicBasePath()}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
