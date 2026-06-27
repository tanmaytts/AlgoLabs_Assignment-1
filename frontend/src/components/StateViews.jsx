export function Loading({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-slate-400">
      <div className="w-8 h-8 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mb-4" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function ErrorView({ error, endpoint }) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : 'An unexpected error occurred';

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-lg w-full text-center">
        <p className="text-red-700 dark:text-red-400 font-semibold text-base mb-1">
          Failed to load data
        </p>
        {endpoint && (
          <p className="text-red-500 dark:text-red-500 text-xs mb-2 font-mono">{endpoint}</p>
        )}
        <p className="text-red-600 dark:text-red-400 text-sm">{message}</p>
      </div>
    </div>
  );
}

export function EmptyView({ message = 'No data available.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-slate-500">
      <svg
        className="w-12 h-12 mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 17v-2m3 2v-4m3 4v-6M5 20h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2z"
        />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}
