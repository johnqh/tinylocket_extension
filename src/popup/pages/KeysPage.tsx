import { useState } from 'react';
import { usePopupStore } from '../store';
import { PROVIDERS, type LlmProvider } from '../../shared/types/providers';

export default function KeysPage() {
  const { keys, addKey, deleteKey, setCurrentPage } = usePopupStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newProvider, setNewProvider] = useState<LlmProvider>('openai');
  const [newName, setNewName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newEndpointUrl, setNewEndpointUrl] = useState('');
  const [error, setError] = useState('');

  const selectedProvider = PROVIDERS.find((p) => p.id === newProvider);

  const handleAdd = async () => {
    if (!newApiKey && !selectedProvider?.requiresEndpointUrl) {
      setError('API key is required');
      return;
    }
    if (selectedProvider?.requiresEndpointUrl && !newEndpointUrl) {
      setError('Endpoint URL is required');
      return;
    }

    try {
      await addKey(
        newProvider,
        newName || selectedProvider?.name || newProvider,
        newApiKey,
        newEndpointUrl || undefined
      );
      setIsAdding(false);
      setNewProvider('openai');
      setNewName('');
      setNewApiKey('');
      setNewEndpointUrl('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add key');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this API key?')) {
      await deleteKey(id);
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
        <h1 className="text-lg font-semibold text-gray-800 flex-1">API Keys</h1>
        <button
          onClick={() => setIsAdding(true)}
          className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Add Key Form */}
      {isAdding && (
        <div className="bg-blue-50 p-4 border-b space-y-3">
          <select
            value={newProvider}
            onChange={(e) => setNewProvider(e.target.value as LlmProvider)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`Name (optional, defaults to ${selectedProvider?.name})`}
            className="w-full px-3 py-2 border rounded-lg"
          />

          {selectedProvider?.requiresEndpointUrl && (
            <input
              type="url"
              value={newEndpointUrl}
              onChange={(e) => setNewEndpointUrl(e.target.value)}
              placeholder="Endpoint URL (e.g., http://localhost:1234)"
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            />
          )}

          <input
            type="password"
            value={newApiKey}
            onChange={(e) => setNewApiKey(e.target.value)}
            placeholder={selectedProvider?.requiresEndpointUrl ? 'API Key (optional)' : 'API Key'}
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsAdding(false);
                setError('');
              }}
              className="flex-1 py-2 border rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Add Key
            </button>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="flex-1 overflow-y-auto">
        {keys.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <p>No API keys configured</p>
            <p className="text-sm mt-1">Add your first key to get started</p>
          </div>
        ) : (
          <div className="divide-y">
            {keys.map((key) => {
              const provider = PROVIDERS.find((p) => p.id === key.provider);
              return (
                <div key={key.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                    {provider?.name.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">{key.name}</div>
                    <div className="text-xs text-gray-500">{provider?.name || key.provider}</div>
                    {key.endpointUrl && (
                      <div className="text-xs text-gray-400 truncate">{key.endpointUrl}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(key.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
