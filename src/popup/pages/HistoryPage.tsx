import { usePopupStore } from '../store';
import { PROVIDERS } from '../../shared/types/providers';

export default function HistoryPage() {
  const { history, clearHistory, setCurrentPage } = usePopupStore();

  const handleClear = async () => {
    if (confirm('Are you sure you want to clear all request history?')) {
      await clearHistory();
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[480px]">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <button
          onClick={() => setCurrentPage('home')}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-800 flex-1">Request History</h1>
        {history.length > 0 && (
          <button
            onClick={handleClear}
            className="text-sm text-red-500 hover:text-red-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No requests yet</p>
            <p className="text-sm mt-1">API requests will appear here</p>
          </div>
        ) : (
          <div className="divide-y">
            {history.map((entry) => {
              const provider = PROVIDERS.find((p) => p.id === entry.provider);
              const isSuccess = entry.status >= 200 && entry.status < 300;

              return (
                <div key={entry.id} className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        isSuccess
                          ? 'bg-green-100 text-green-700'
                          : entry.status === 0
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {entry.status || 'ERR'}
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      {provider?.name || entry.provider}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {entry.durationMs}ms
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{entry.endpoint}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{entry.domain}</span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-gray-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
