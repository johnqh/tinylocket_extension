import { sessionService } from '../shared/services';
import { handleMessage } from './message-handler';

// Initialize session service
sessionService.init();

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    });

  // Return true to indicate we will respond asynchronously
  return true;
});

// Handle extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('TinyLocket installed');
  } else if (details.reason === 'update') {
    console.log('TinyLocket updated to version', chrome.runtime.getManifest().version);
  }
});

console.log('TinyLocket background service worker started');
