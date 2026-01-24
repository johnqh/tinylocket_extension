import { usePopupStore } from '../store';
import { AUTO_LOCK_OPTIONS } from '../../shared/constants';

export default function SettingsPage() {
  const { settings, updateSettings, setCurrentPage } = usePopupStore();

  const handleAutoLockChange = async (minutes: number) => {
    await updateSettings({ autoLockMinutes: minutes });
  };

  const handleHistoryToggle = async () => {
    await updateSettings({ historyEnabled: !settings?.historyEnabled });
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
        <h1 className="text-lg font-semibold text-gray-800">Settings</h1>
      </div>

      {/* Settings */}
      <div className="flex-1 p-4 space-y-6">
        {/* Auto-lock */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Auto-lock Timeout</h3>
          <p className="text-xs text-gray-500 mb-3">
            Automatically lock after a period of inactivity
          </p>
          <div className="space-y-2">
            {AUTO_LOCK_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="autoLock"
                  checked={settings?.autoLockMinutes === option.value}
                  onChange={() => handleAutoLockChange(option.value)}
                  className="w-4 h-4 text-blue-500"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* History */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Request History</h3>
          <label className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={settings?.historyEnabled ?? true}
              onChange={handleHistoryToggle}
              className="w-4 h-4 text-blue-500 rounded"
            />
            <div>
              <div className="text-sm text-gray-700">Enable request history</div>
              <div className="text-xs text-gray-500">
                Track API requests for debugging
              </div>
            </div>
          </label>
        </div>

        {/* Version */}
        <div className="pt-4 border-t">
          <p className="text-xs text-gray-400 text-center">
            TinyLocket v{chrome.runtime.getManifest().version}
          </p>
        </div>
      </div>
    </div>
  );
}
