import type { LlmProvider } from './providers';

// Message types for communication between web app and extension
export const MESSAGE_TARGET = {
  CONTENT_SCRIPT: 'TINYLOCKET_CONTENT_SCRIPT',
  INPAGE: 'TINYLOCKET_INPAGE',
} as const;

export const MESSAGE_TYPE = {
  PING: 'TINYLOCKET_PING',
  PONG: 'TINYLOCKET_PONG',
  REQUEST: 'TINYLOCKET_REQUEST',
  RESPONSE: 'TINYLOCKET_RESPONSE',
  STREAM_CHUNK: 'TINYLOCKET_STREAM_CHUNK',
  GET_PROVIDERS: 'TINYLOCKET_GET_PROVIDERS',
  GET_STATUS: 'TINYLOCKET_GET_STATUS',
} as const;

export type MessageType = (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE];

// Request from web app to extension
export interface TinylocketRequest {
  type: typeof MESSAGE_TYPE.REQUEST;
  id: string;
  payload: {
    provider: LlmProvider;
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: unknown;
    stream?: boolean;
    endpointUrl?: string; // For lm_studio
  };
}

// Response from extension to web app
export interface TinylocketResponse {
  type: typeof MESSAGE_TYPE.RESPONSE;
  id: string;
  success: boolean;
  error?: {
    code: TinylocketErrorCode;
    message: string;
  };
  data?: {
    status: number;
    headers: Record<string, string>;
    body: unknown;
  };
}

// Streaming chunk from extension to web app
export interface TinylocketStreamChunk {
  type: typeof MESSAGE_TYPE.STREAM_CHUNK;
  id: string;
  chunk: string;
  done: boolean;
}

export type TinylocketErrorCode =
  | 'NOT_INSTALLED'
  | 'CONNECTION_REFUSED'
  | 'LOCKED'
  | 'DOMAIN_NOT_ALLOWED'
  | 'NO_KEY'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'INVALID_REQUEST';

// Status response
export interface TinylocketStatus {
  installed: true;
  unlocked: boolean;
  version: string;
}

// Provider info for web apps
export interface ProviderInfo {
  id: LlmProvider;
  name: string;
  hasKey: boolean;
}

// Internal messages (content script <-> background)
export interface BackgroundMessage {
  type: string;
  payload?: unknown;
  origin?: string;
  requestId?: string;
}
