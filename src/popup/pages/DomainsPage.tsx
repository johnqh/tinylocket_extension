import { useState } from 'react';
import { usePopupStore } from '../store';

export default function DomainsPage() {
  const { domains, addDomain, removeDomain, setCurrentPage } = usePopupStore();
  const [newDomain, setNewDomain] = useState('');
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!newDomain) {
      setError('Domain is required');
      return;
    }

    // Validate domain format
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$|^localhost$/i;
    if (!domainRegex.test(newDomain)) {
      setError('Invalid domain format');
      return;
    }

    try {
      await addDomain(newDomain.toLowerCase());
      setNewDomain('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add domain');
    }
  };

  const handleRemove = async (domain: string) => {
    await removeDomain(domain);
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
        <h1 className="text-lg font-semibold text-gray-800">Allowed Domains</h1>
      </div>

      {/* Add Domain */}
      <div className="p-4 bg-gray-50 border-b">
        <p className="text-sm text-gray-600 mb-3">
          Only whitelisted domains can use your API keys
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="example.com"
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
          >
            Add
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      {/* Domains List */}
      <div className="flex-1 overflow-y-auto">
        {domains.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <p>No domains whitelisted</p>
            <p className="text-sm mt-1">Add domains that can use your API keys</p>
          </div>
        ) : (
          <div className="divide-y">
            {domains.map((d) => (
              <div key={d.domain} className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 truncate">{d.domain}</div>
                  <div className="text-xs text-gray-500">
                    Added {new Date(d.addedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(d.domain)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
