import { getValidStoredAccessToken } from '../oauth/local-auth.js';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// エンドポイントを解決する。絶対 URL は apiUrl と同一オリジンの場合のみ許可し、
// アクセストークンを別ホストへ送ってしまう（SSRF / トークン漏洩）のを防ぐ。
function resolveEndpointUrl(apiUrl: string, endpoint: string): string {
  if (!/^https?:\/\//i.test(endpoint)) {
    return `${apiUrl}${endpoint}`;
  }

  const apiOrigin = new URL(apiUrl).origin;
  const endpointOrigin = new URL(endpoint).origin;
  if (endpointOrigin !== apiOrigin) {
    throw new Error(`Refusing to send request to untrusted host: ${endpoint}`);
  }

  return endpoint;
}

interface ApiConfig {
  apiUrl: string;
  accessToken?: string;
}

export async function apiRequest<T = unknown>(
  config: ApiConfig,
  endpoint: string,
  method: HttpMethod,
  body?: unknown,
): Promise<T> {
  const accessToken =
    config.accessToken ?? (await getValidStoredAccessToken(config.apiUrl));

  if (!accessToken) {
    throw new Error(
      'PaPut authentication is not configured. Run `paput-mcp login`.',
    );
  }

  const url = resolveEndpointUrl(config.apiUrl, endpoint);

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(method !== 'GET' && method !== 'DELETE'
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
  };

  if (body && method !== 'GET' && method !== 'DELETE') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`,
      );
    } catch (e) {
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }
  }

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    // Return an empty object when JSON parsing fails but the request succeeded
    return {} as T;
  }
}

export function createApiClient(apiUrl: string, accessToken?: string) {
  const config: ApiConfig = { apiUrl, accessToken };

  return {
    get: <T = unknown>(endpoint: string) =>
      apiRequest<T>(config, endpoint, 'GET'),

    post: <T = unknown>(endpoint: string, body?: unknown) =>
      apiRequest<T>(config, endpoint, 'POST', body),

    put: <T = unknown>(endpoint: string, body?: unknown) =>
      apiRequest<T>(config, endpoint, 'PUT', body),

    delete: <T = unknown>(endpoint: string) =>
      apiRequest<T>(config, endpoint, 'DELETE'),

    request: <T = unknown>(
      endpoint: string,
      method: HttpMethod,
      body?: unknown,
    ) => apiRequest<T>(config, endpoint, method, body),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
