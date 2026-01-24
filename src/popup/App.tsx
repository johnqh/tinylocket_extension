import { useEffect } from 'react';
import { usePopupStore } from './store';
import SetupPage from './pages/SetupPage';
import UnlockPage from './pages/UnlockPage';
import HomePage from './pages/HomePage';
import KeysPage from './pages/KeysPage';
import DomainsPage from './pages/DomainsPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const { currentPage, checkAuthState, loadDomains, loadHistory, loadSettings } = usePopupStore();

  useEffect(() => {
    // Check auth state on mount
    checkAuthState();
    loadDomains();
    loadHistory();
    loadSettings();
  }, [checkAuthState, loadDomains, loadHistory, loadSettings]);

  // Listen for lock events from background
  useEffect(() => {
    const listener = (message: { type: string }) => {
      if (message.type === 'SESSION_LOCKED') {
        checkAuthState();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [checkAuthState]);

  const renderPage = () => {
    switch (currentPage) {
      case 'setup':
        return <SetupPage />;
      case 'unlock':
        return <UnlockPage />;
      case 'home':
        return <HomePage />;
      case 'keys':
        return <KeysPage />;
      case 'domains':
        return <DomainsPage />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-[480px] bg-gray-50">
      {renderPage()}
    </div>
  );
}
