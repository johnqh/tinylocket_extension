import { MESSAGE_TARGET, MESSAGE_TYPE } from '../shared/types/messages';

/**
 * Content script that bridges communication between the page and the extension.
 * Injects the inpage script and relays messages between page <-> background.
 */

// Inject the inpage script
function injectInpageScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('src/inpage/index.ts');
  script.type = 'module';
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
}

// Inject as early as possible
injectInpageScript();

// Listen for messages from the page (inpage script)
window.addEventListener('message', async (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  // Only accept messages targeted at content script
  if (event.data?.target !== MESSAGE_TARGET.CONTENT_SCRIPT) return;

  const { type, requestId, payload } = event.data;

  try {
    // Forward message to background script
    const response = await chrome.runtime.sendMessage({
      type,
      requestId,
      payload,
      origin: window.location.origin,
    });

    // Send response back to page
    window.postMessage(
      {
        target: MESSAGE_TARGET.INPAGE,
        type: MESSAGE_TYPE.RESPONSE,
        requestId,
        ...response,
      },
      window.location.origin
    );
  } catch (error) {
    // Send error back to page
    window.postMessage(
      {
        target: MESSAGE_TARGET.INPAGE,
        type: MESSAGE_TYPE.RESPONSE,
        requestId,
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      window.location.origin
    );
  }
});

// Listen for streaming chunks from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TINYLOCKET_STREAM_CHUNK') {
    // Forward to page
    window.postMessage(
      {
        target: MESSAGE_TARGET.INPAGE,
        type: MESSAGE_TYPE.STREAM_CHUNK,
        requestId: message.requestId,
        chunk: message.chunk,
        done: message.done,
      },
      window.location.origin
    );
  }
});

console.log('TinyLocket content script loaded');
