import { NavLink } from 'react-router-dom';

/* Sun icon for light mode indicator */
function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

/* Moon icon for dark mode indicator */
function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function Navbar({ theme, toggleTheme }) {
  const isDark = theme === 'dark';

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-150 no-underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 px-1 py-0.5 ${
      isActive
        ? 'text-blue-500 border-b-2 border-blue-500 pb-0'
        : 'text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
    }`;

  return (
    <nav className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 min-h-14 py-2">
          <NavLink to="/" className="flex items-center gap-2 no-underline shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1">
            <span className="text-xl font-bold text-blue-700 dark:text-blue-400 tracking-tight">
              FinPulse
            </span>
          </NavLink>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-6">
            <NavLink to="/" end className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/compare" className={navLinkClass}>
              Compare
            </NavLink>
            <NavLink to="/sectors" className={navLinkClass}>
              Sectors
            </NavLink>
            <NavLink to="/heatmap" className={navLinkClass}>
              Heatmap
            </NavLink>

            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
