/**
 * Make a regular (non-streaming) API request.
 */
export async function makeApiRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: unknown
): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  let responseBody: unknown;
  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    responseBody = await response.json();
  } else {
    responseBody = await response.text();
  }

  return {
    status: response.status,
    headers: responseHeaders,
    body: responseBody,
  };
}

/**
 * Make a streaming API request.
 * Streams chunks back to the content script via chrome.tabs.sendMessage.
 */
export async function makeStreamingRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: unknown,
  requestId: string
): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return {
      status: response.status,
      headers: responseHeaders,
      body: errorBody,
    };
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Send final chunk
        await broadcastStreamChunk(requestId, '', true);
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      fullContent += chunk;

      // Send chunk to all tabs
      await broadcastStreamChunk(requestId, chunk, false);
    }
  } catch (error) {
    // Send error as final chunk
    await broadcastStreamChunk(requestId, '', true);
    throw error;
  }

  return {
    status: response.status,
    headers: responseHeaders,
    body: fullContent,
  };
}

/**
 * Broadcast a stream chunk to all tabs.
 */
async function broadcastStreamChunk(
  requestId: string,
  chunk: string,
  done: boolean
): Promise<void> {
  const tabs = await chrome.tabs.query({});

  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'TINYLOCKET_STREAM_CHUNK',
          requestId,
          chunk,
          done,
        });
      } catch {
        // Tab might not have content script, ignore
      }
    }
  }
}
