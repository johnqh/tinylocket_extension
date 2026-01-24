export type LlmProvider =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'mistral'
  | 'cohere'
  | 'groq'
  | 'xai'
  | 'deepseek'
  | 'perplexity'
  | 'together'
  | 'lm_studio';

export interface ProviderConfig {
  id: LlmProvider;
  name: string;
  baseUrl: string;
  authHeader: string;
  authPrefix: string;
  testEndpoint: string;
  requiresEndpointUrl: boolean;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    testEndpoint: '/v1/models',
    requiresEndpointUrl: false,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    authHeader: 'x-api-key',
    authPrefix: '',
    testEndpoint: '/v1/messages',
    requiresEndpointUrl: false,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    authHeader: 'x-goog-api-key',
    authPrefix: '',
    testEndpoint: '/v1/models',
    requiresEndpointUrl: false,
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    testEndpoint: '/v1/models',
    requiresEndpointUrl: false,
  },
  {
    id: 'cohere',
    name: 'Cohere',
    baseUrl: 'https://api.cohere.ai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    testEndpoint: '/v1/models',
    requiresEndpointUrl: false,
  },
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    testEndpoint: '/v1/models',
    requiresEndpointUrl: false,
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    testEndpoint: '/v1/models',
    requiresEndpointUrl: false,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    testEndpoint: '/v1/models',
    requiresEndpointUrl: false,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    baseUrl: 'https://api.perplexity.ai',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    testEndpoint: '/chat/completions',
    requiresEndpointUrl: false,
  },
  {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    testEndpoint: '/v1/models',
    requiresEndpointUrl: false,
  },
  {
    id: 'lm_studio',
    name: 'LM Studio / Custom',
    baseUrl: '',
    authHeader: 'Authorization',
    authPrefix: 'Bearer ',
    testEndpoint: '/v1/models',
    requiresEndpointUrl: true,
  },
];

export function getProviderById(id: LlmProvider): ProviderConfig | undefined {
  return PROVIDERS.find((p) => p.id === id);
}
