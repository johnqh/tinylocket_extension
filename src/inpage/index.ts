import { MESSAGE_TARGET, MESSAGE_TYPE } from '../shared/types/messages';
import type { LlmProvider } from '../shared/types/providers';

/**
 * Inpage script that runs in the page context and provides the window.tinylocket API.
 */

interface TinylocketRequest {
  provider: LlmProvider;
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  stream?: boolean;
  endpointUrl?: string;
}

interface TinylocketResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  data: T;
}

interface TinylocketStatus {
  installed: boolean;
  unlocked: boolean;
  version: string;
}

interface ProviderInfo {
  id: LlmProvider;
  name: string;
  hasKey: boolean;
}

type StreamCallback = (chunk: string, done: boolean) => void;

// Pending requests waiting for responses
const pendingRequests = new Map<
  string,
  {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    streamCallback?: StreamCallback;
  }
>();

// Generate unique request ID
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Send message to content script
function sendMessage(type: string, payload?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const requestId = generateRequestId();

    // Set up timeout
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('Request timed out'));
    }, 30000);

    pendingRequests.set(requestId, {
      resolve: (value) => {
        clearTimeout(timeout);
        pendingRequests.delete(requestId);
        resolve(value);
      },
      reject: (error) => {
        clearTimeout(timeout);
        pendingRequests.delete(requestId);
        reject(error);
      },
    });

    window.postMessage(
      {
        target: MESSAGE_TARGET.CONTENT_SCRIPT,
        type,
        requestId,
        payload,
      },
      window.location.origin
    );
  });
}

// Listen for responses from content script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.target !== MESSAGE_TARGET.INPAGE) return;

  const { type, requestId, success, error, data, chunk, done } = event.data;

  // Handle streaming chunks
  if (type === MESSAGE_TYPE.STREAM_CHUNK) {
    const pending = pendingRequests.get(requestId);
    if (pending?.streamCallback) {
      pending.streamCallback(chunk, done);
      if (done) {
        pending.resolve({ status: 200, headers: {}, data: null });
      }
    }
    return;
  }

  // Handle regular responses
  const pending = pendingRequests.get(requestId);
  if (!pending) return;

  if (success) {
    pending.resolve(data);
  } else {
    const err = new Error(error?.message || 'Unknown error');
    (err as Error & { code: string }).code = error?.code || 'NETWORK_ERROR';
    pending.reject(err);
  }
});

// The public API exposed on window.tinylocket
const tinylocket = {
  /**
   * Check if the extension is installed.
   */
  async isInstalled(): Promise<boolean> {
    try {
      await sendMessage(MESSAGE_TYPE.PING);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Get the current status of the extension.
   */
  async getStatus(): Promise<TinylocketStatus> {
    const result = (await sendMessage(MESSAGE_TYPE.GET_STATUS)) as TinylocketStatus;
    return result;
  },

  /**
   * Get available providers and whether they have keys configured.
   */
  async getProviders(): Promise<ProviderInfo[]> {
    const result = (await sendMessage(MESSAGE_TYPE.GET_PROVIDERS)) as ProviderInfo[];
    return result;
  },

  /**
   * Make an API request through the extension.
   */
  async request<T = unknown>(options: TinylocketRequest): Promise<TinylocketResponse<T>> {
    const result = (await sendMessage(MESSAGE_TYPE.REQUEST, options)) as {
      status: number;
      headers: Record<string, string>;
      body: T;
    };

    return {
      status: result.status,
      headers: result.headers,
      data: result.body,
    };
  },

  /**
   * Make a streaming API request through the extension.
   */
  async *stream(options: TinylocketRequest): AsyncGenerator<string, void, unknown> {
    const requestId = generateRequestId();
    const chunks: string[] = [];
    let done = false;
    let error: Error | null = null;

    // Create a promise that resolves when streaming is complete
    const streamPromise = new Promise<void>((resolve, reject) => {
      pendingRequests.set(requestId, {
        resolve: () => {
          done = true;
          resolve();
        },
        reject: (err) => {
          error = err;
          reject(err);
        },
        streamCallback: (chunk, isDone) => {
          if (chunk) {
            chunks.push(chunk);
          }
          if (isDone) {
            done = true;
          }
        },
      });
    });

    // Send the request
    window.postMessage(
      {
        target: MESSAGE_TARGET.CONTENT_SCRIPT,
        type: MESSAGE_TYPE.REQUEST,
        requestId,
        payload: { ...options, stream: true },
      },
      window.location.origin
    );

    // Yield chunks as they arrive
    while (!done || chunks.length > 0) {
      if (chunks.length > 0) {
        yield chunks.shift()!;
      } else if (!done) {
        // Wait a bit for more chunks
        await new Promise((r) => setTimeout(r, 10));
      }
    }

    if (error) {
      throw error;
    }
  },
};

// Expose on window
declare global {
  interface Window {
    tinylocket: typeof tinylocket;
  }
}

window.tinylocket = tinylocket;

console.log('TinyLocket inpage script loaded');
