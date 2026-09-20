import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { initials } from '../../lib/format.js';
import { Icon } from '../ui/Icon.jsx';

const NAVIGATION = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/leads', label: 'Leads', icon: 'leads' },
  { to: '/insights', label: 'Insights', icon: 'insights' },
];

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500 text-white">
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
        <path d="M6 5v14h12" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M9.5 14.5 13 10l2.5 2.5L19 7"
          stroke="#a9c0ff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
    <span className="text-[15px] font-semibold tracking-tight text-ink">LeadFlow</span>
  </div>
);

const NavItems = ({ onNavigate }) => (
  <nav className="space-y-0.5" aria-label="Main">
    {NAVIGATION.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
            isActive
              ? 'bg-brand-50 text-brand-700'
              : 'text-ink-soft hover:bg-black/4 hover:text-ink'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Icon name={item.icon} className={isActive ? 'h-4 w-4 text-brand-500' : 'h-4 w-4'} />
            {item.label}
          </>
        )}
      </NavLink>
    ))}
  </nav>
);

const SidebarContent = ({ onNavigate }) => (
  <>
    <div className="px-4 py-4">
      <Logo />
    </div>

    <div className="px-3">
      <p className="px-2.5 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        Workspace
      </p>
      <NavItems onNavigate={onNavigate} />
    </div>

    <div className="mt-auto p-3">
      <div className="rounded-lg bg-surface-sunken p-3 ring-1 ring-line">
        <p className="text-xs font-medium text-ink">Leads arrive from WordPress</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          The website form syncs straight into this workspace and is scored on arrival.
        </p>
      </div>
    </div>
  </>
);

/**
 * The application frame.
 *
 * A fixed sidebar on desktop, and the same navigation as a slide-over sheet on
 * small screens — the mobile menu is the identical component, not a cut-down
 * second copy that drifts out of sync.
 */
export const AppShell = () => {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu on navigation, otherwise it stays open over the page
  // the person just asked for.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh">
      {/* Keyboard users should be able to reach the content without tabbing
          through the whole sidebar on every page. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-raised"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
        <SidebarContent />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/25" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-surface shadow-overlay">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1.5 text-ink-muted hover:bg-black/5 hover:text-ink"
              aria-label="Close menu"
            >
              <Icon name="close" />
            </button>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="-ml-1 rounded-md p-2 text-ink-soft hover:bg-black/5 hover:text-ink lg:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>

          <div className="lg:hidden">
            <Logo />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2.5 rounded-md py-1 pl-1 pr-2.5 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                {initials(user?.name)}
              </span>
              <span className="text-left leading-tight">
                <span className="block text-xs font-medium text-ink">{user?.name}</span>
                <span className="block text-[11px] text-ink-muted">{user?.email}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-ink-soft transition-colors hover:bg-black/5 hover:text-ink"
            >
              <Icon name="logout" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main id="main" className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

/**
 * Page heading: title, one line of context, and the page's primary action.
 *
 * Every page uses it, which is what keeps the top of each screen in the same
 * place as you move between them.
 */
export const PageHeader = ({ title, description, actions }) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
      {description ? <p className="mt-1 text-sm text-ink-soft">{description}</p> : null}
    </div>
    {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
  </div>
);
