import { v4 as uuidv4 } from 'uuid';
import { vaultService, storageService, sessionService } from '../shared/services';
import { MESSAGE_TYPE, type TinylocketErrorCode } from '../shared/types/messages';
import type { LlmProvider, ProviderInfo } from '../shared/types/providers';
import { PROVIDERS, getProviderById } from '../shared/types/providers';
import type { RequestHistoryEntry } from '../shared/types/storage';
import { makeApiRequest, makeStreamingRequest } from './api-proxy';

interface MessagePayload {
  type: string;
  requestId?: string;
  origin?: string;
  payload?: {
    provider?: LlmProvider;
    endpoint?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: unknown;
    stream?: boolean;
    endpointUrl?: string;
  };
}

interface MessageResponse {
  type: string;
  requestId?: string;
  success: boolean;
  error?: { code: TinylocketErrorCode; message: string };
  data?: unknown;
}

/**
 * Handle messages from content scripts.
 */
export async function handleMessage(
  message: MessagePayload,
  sender: chrome.runtime.MessageSender
): Promise<MessageResponse> {
  const origin = sender.tab?.url ? new URL(sender.tab.url).origin : message.origin;
  const requestId = message.requestId || uuidv4();

  switch (message.type) {
    case MESSAGE_TYPE.PING:
      return handlePing(requestId);

    case MESSAGE_TYPE.GET_STATUS:
      return handleGetStatus(requestId);

    case MESSAGE_TYPE.GET_PROVIDERS:
      return handleGetProviders(requestId);

    case MESSAGE_TYPE.REQUEST:
      return handleRequest(requestId, message.payload!, origin!);

    default:
      return {
        type: MESSAGE_TYPE.RESPONSE,
        requestId,
        success: false,
        error: { code: 'INVALID_REQUEST', message: `Unknown message type: ${message.type}` },
      };
  }
}

/**
 * Handle ping request (check if extension is installed).
 */
function handlePing(requestId: string): MessageResponse {
  return {
    type: MESSAGE_TYPE.PONG,
    requestId,
    success: true,
    data: {
      installed: true,
      version: chrome.runtime.getManifest().version,
    },
  };
}

/**
 * Handle get status request.
 */
function handleGetStatus(requestId: string): MessageResponse {
  return {
    type: MESSAGE_TYPE.RESPONSE,
    requestId,
    success: true,
    data: {
      installed: true,
      unlocked: vaultService.isUnlocked(),
      version: chrome.runtime.getManifest().version,
    },
  };
}

/**
 * Handle get providers request.
 */
async function handleGetProviders(requestId: string): Promise<MessageResponse> {
  if (!vaultService.isUnlocked()) {
    return {
      type: MESSAGE_TYPE.RESPONSE,
      requestId,
      success: false,
      error: { code: 'LOCKED', message: 'Extension is locked' },
    };
  }

  const keys = vaultService.getKeys();
  const providers: ProviderInfo[] = PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    hasKey: keys.some((k) => k.provider === p.id),
  }));

  return {
    type: MESSAGE_TYPE.RESPONSE,
    requestId,
    success: true,
    data: providers,
  };
}

/**
 * Handle API request.
 */
async function handleRequest(
  requestId: string,
  payload: NonNullable<MessagePayload['payload']>,
  origin: string
): Promise<MessageResponse> {
  const startTime = Date.now();

  // Check if vault is unlocked
  if (!vaultService.isUnlocked()) {
    return {
      type: MESSAGE_TYPE.RESPONSE,
      requestId,
      success: false,
      error: { code: 'LOCKED', message: 'Extension is locked. Please unlock to continue.' },
    };
  }

  // Record activity to reset auto-lock timer
  sessionService.recordActivity();

  // Check if domain is whitelisted
  const domain = new URL(origin).hostname;
  const isWhitelisted = await storageService.isDomainWhitelisted(domain);
  if (!isWhitelisted) {
    return {
      type: MESSAGE_TYPE.RESPONSE,
      requestId,
      success: false,
      error: {
        code: 'DOMAIN_NOT_ALLOWED',
        message: `Domain ${domain} is not whitelisted. Add it in the TinyLocket extension.`,
      },
    };
  }

  // Get API key for provider
  const { provider, endpoint, method = 'POST', headers = {}, body, stream, endpointUrl } = payload;
  if (!provider) {
    return {
      type: MESSAGE_TYPE.RESPONSE,
      requestId,
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'Provider is required' },
    };
  }

  const keyEntry = vaultService.getKeyForProvider(provider);
  if (!keyEntry) {
    return {
      type: MESSAGE_TYPE.RESPONSE,
      requestId,
      success: false,
      error: {
        code: 'NO_KEY',
        message: `No API key configured for ${provider}. Add one in the TinyLocket extension.`,
      },
    };
  }

  const providerConfig = getProviderById(provider);
  if (!providerConfig) {
    return {
      type: MESSAGE_TYPE.RESPONSE,
      requestId,
      success: false,
      error: { code: 'INVALID_REQUEST', message: `Unknown provider: ${provider}` },
    };
  }

  // Build the full URL
  let baseUrl = providerConfig.baseUrl;
  if (providerConfig.requiresEndpointUrl) {
    baseUrl = endpointUrl || keyEntry.endpointUrl || '';
    if (!baseUrl) {
      return {
        type: MESSAGE_TYPE.RESPONSE,
        requestId,
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Custom endpoint URL is required for this provider' },
      };
    }
  }

  const fullUrl = `${baseUrl}${endpoint}`;

  // Add authentication header
  const authHeaders: Record<string, string> = {
    ...headers,
    [providerConfig.authHeader]: `${providerConfig.authPrefix}${keyEntry.apiKey}`,
  };

  // Add Anthropic-specific headers
  if (provider === 'anthropic') {
    authHeaders['anthropic-version'] = '2023-06-01';
  }

  try {
    let result: { status: number; headers: Record<string, string>; body: unknown };

    if (stream) {
      // Handle streaming request
      result = await makeStreamingRequest(fullUrl, method, authHeaders, body, requestId);
    } else {
      // Handle regular request
      result = await makeApiRequest(fullUrl, method, authHeaders, body);
    }

    const durationMs = Date.now() - startTime;

    // Log to history
    const historyEntry: RequestHistoryEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      provider,
      endpoint: endpoint || '',
      domain,
      status: result.status,
      durationMs,
    };
    await storageService.addRequestHistory(historyEntry);

    return {
      type: MESSAGE_TYPE.RESPONSE,
      requestId,
      success: true,
      data: result,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    // Log failed request to history
    const historyEntry: RequestHistoryEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      provider,
      endpoint: endpoint || '',
      domain,
      status: 0,
      durationMs,
    };
    await storageService.addRequestHistory(historyEntry);

    return {
      type: MESSAGE_TYPE.RESPONSE,
      requestId,
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
      },
    };
  }
}
