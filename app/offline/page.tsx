import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Offline | Engineer Document Control',
  description: 'You are currently working in offline mode.',
};

const css = `
  html, body { margin: 0; }
  .ol {
    --bg: #f4f6f8; --card: #ffffff; --border: #e2e6ec;
    --fg: #152a44; --muted: #6b7280;
    --warn-bg: #fef3c7; --warn-fg: #b45309;
    --btn: #152a44; --btn-fg: #ffffff;
    min-height: 100vh; min-height: 100dvh; display: flex; align-items: center; justify-content: center;
    padding: 24px; box-sizing: border-box; background: var(--bg); color: var(--fg);
    font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  }
  html.dark .ol {
    --bg: #0a1424; --card: #0e1c30; --border: #1f3452;
    --fg: #f4f6f8; --muted: #94a3b8;
    --warn-bg: #78350f; --warn-fg: #fde68a;
    --btn: #02a9d3; --btn-fg: #081220;
  }
  @media (prefers-color-scheme: dark) {
    html:not(.light) .ol {
      --bg: #0a1424; --card: #0e1c30; --border: #1f3452;
      --fg: #f4f6f8; --muted: #94a3b8;
      --warn-bg: #78350f; --warn-fg: #fde68a;
      --btn: #02a9d3; --btn-fg: #081220;
    }
  }
  .ol-card {
    max-width: 28rem; width: 100%; text-align: center; box-sizing: border-box;
    background: var(--card); border: 1px solid var(--border);
    border-radius: 12px; padding: 32px;
  }
  .ol-icon {
    width: 48px; height: 48px; margin: 0 auto; border-radius: 9999px;
    display: flex; align-items: center; justify-content: center;
    background: var(--warn-bg); color: var(--warn-fg);
  }
  .ol h1 { margin: 16px 0 0; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
  .ol p { margin: 8px 0 0; font-size: 13px; line-height: 1.5; color: var(--muted); }
  .ol a {
    display: inline-block; margin-top: 24px; padding: 8px 16px; border-radius: 8px;
    background: var(--btn); color: var(--btn-fg); font-size: 13px; font-weight: 600;
    text-decoration: none;
  }
  .ol a:hover { opacity: 0.9; }
`;

const autoRecover = `window.addEventListener('online', function () { location.replace('/'); });`;

export default function OfflinePage() {
  return (
    <main className="ol">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="ol-card">
        <div className="ol-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20h.01" />
            <path d="M8.5 16.4a5 5 0 0 1 7 0" />
            <path d="M5 12.9a10 10 0 0 1 5.2-2.7" />
            <path d="M2 8.8a15 15 0 0 1 4.2-2.6" />
            <path d="M19 12.9a10 10 0 0 0-1.6-1.1" />
            <path d="M22 8.8A15 15 0 0 0 12 6" />
            <path d="m2 2 20 20" />
          </svg>
        </div>
        <h1>Connection Unavailable</h1>
        <p>
          The engineering document portal needs an active connection to sync
          document revisions and authority NOC matrices.
        </p>
        <Link href="/dashboard">Try again</Link>
      </div>
      <script dangerouslySetInnerHTML={{ __html: autoRecover }} />
    </main>
  );
}
