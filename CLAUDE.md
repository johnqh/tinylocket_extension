# TinyLocket Extension

Chrome extension (Manifest V3): Secure API key wallet for AI providers.

## Tech Stack

- **Language**: TypeScript (JSX)
- **Framework**: React 18
- **Build**: Vite + @crxjs/vite-plugin
- **State Management**: Zustand 4.5
- **Styling**: Tailwind CSS 3
- **Cryptography**: @noble/hashes + @noble/ciphers (PBKDF2-SHA256 310K iterations, AES-256-GCM)
- **IDs**: uuid v10

## Project Structure

```
src/
├── manifest.json                    # MV3 manifest
├── inpage/
│   └── index.ts                     # window.tinylocket API (injected into pages)
├── content/
│   └── index.ts                     # Bridge: page <-> background
├── background/
│   ├── index.ts                     # Service worker entry
│   ├── message-handler.ts           # PING, GET_STATUS, GET_PROVIDERS, REQUEST handling
│   └── api-proxy.ts                 # HTTP fetch proxy + streaming
├── popup/
│   ├── index.tsx                    # Popup entry
│   ├── App.tsx                      # Popup router
│   ├── index.html / index.css
│   ├── store/
│   │   └── index.ts                 # Zustand store
│   └── pages/
│       ├── SetupPage.tsx            # Create master password
│       ├── UnlockPage.tsx           # Unlock vault
│       ├── HomePage.tsx             # Stats dashboard
│       ├── KeysPage.tsx             # API key CRUD
│       ├── DomainsPage.tsx          # Domain whitelist
│       ├── HistoryPage.tsx          # Request history
│       └── SettingsPage.tsx         # Auto-lock timeout
└── shared/
    ├── constants.ts
    ├── types/
    │   ├── index.ts
    │   ├── messages.ts              # Message types + error codes
    │   ├── storage.ts               # Storage schemas
    │   └── providers.ts             # 11 provider definitions
    └── services/
        ├── index.ts
        ├── CryptoService.ts         # Encrypt/decrypt (AES-256-GCM)
        ├── StorageService.ts        # chrome.storage.local wrapper
        ├── VaultService.ts          # Encrypted key vault
        └── SessionService.ts        # Auto-lock via chrome.alarms
```

## Commands

```bash
bun run dev          # Start dev server (loads unpacked extension)
bun run build        # Production build
bun run lint         # ESLint
bun run type-check   # TypeScript check
```

## Architecture

```
Web Page (inpage script)
    ↕ window.postMessage
Content Script (bridge)
    ↕ chrome.runtime.sendMessage
Background Service Worker
    ↕ fetch (with injected auth headers)
AI Provider APIs
```

### Message Flow

1. Page calls `window.tinylocket.request()`
2. Inpage script sends `postMessage` to content script
3. Content script relays via `chrome.runtime.sendMessage` to background
4. Background validates: vault unlocked + domain whitelisted
5. Background injects provider-specific auth headers and proxies HTTP request
6. Response relayed back through the same chain

### Streaming

Background creates a `ReadableStream`, broadcasts chunks via `chrome.tabs.sendMessage` back to the content script and page.

## Security Model

- API keys **never leave the extension** -- keys are stored encrypted in chrome.storage.local
- Extension proxies all requests, injecting auth headers server-side
- Vault encrypted with AES-256-GCM, key derived via PBKDF2-SHA256 (310K iterations)
- Encryption key zeroed from memory on vault lock
- Domain whitelist controls which sites can use stored keys

## Supported Providers (11)

openai, anthropic, gemini, mistral, cohere, groq, xai, deepseek, perplexity, together, lm_studio

Provider-specific headers are injected (e.g., `anthropic-version` for Anthropic).

## Chrome Permissions

- `storage` -- encrypted vault persistence
- `alarms` -- auto-lock timer
- Host permissions for all 11 provider API domains + Firebase

## Related Projects

- **tinylocket_client** (`../tinylocket_client`) -- Client library that web pages use to communicate with this extension via `window.postMessage`
- **tinylocket_app** (`../tinylocket_app`) -- Marketing website that documents this extension and provides an interactive TestPage playground

## Coding Patterns

- Chrome Manifest V3 with 3 execution contexts: inpage (injected into web pages) -> content script (bridge) -> background service worker
- AES-256-GCM vault encryption with PBKDF2-SHA256 key derivation (310K iterations) using `@noble/hashes` and `@noble/ciphers`
- Zustand 4.5 for popup UI state management (in `popup/store/`)
- 11 provider configs with provider-specific auth header injection (e.g., `anthropic-version` for Anthropic)
- API keys never leave the extension -- the background service worker proxies all HTTP requests
- Message types are centralized in `shared/types/messages.ts` -- all contexts share these types
- Services in `shared/services/` handle crypto, storage, vault, and session management

## Gotchas

- **Encryption key is zeroed from memory on vault lock** -- never cache the derived key outside of the session
- Domain whitelist controls which websites can use stored keys -- requests from non-whitelisted domains are rejected
- The inpage script is injected into **all pages** -- keep it minimal and non-intrusive
- Uses `@noble/hashes` and `@noble/ciphers` for crypto, **not** the Web Crypto API -- do not mix crypto libraries
- Auto-lock is implemented via `chrome.alarms` -- the `SessionService` manages the timer
- The content script is a stateless bridge -- it should not hold any state or secrets
- Streaming uses `chrome.tabs.sendMessage` to relay chunks back through the content script to the page
- The command for type checking is `bun run type-check` (with a hyphen), not `typecheck`

## Testing

- No test suite is configured
- Use `bun run type-check` for TypeScript validation
- Use `bun run lint` for linting
- Manual testing requires loading the unpacked extension in Chrome via `bun run dev`
