type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

function requireHttps(url: string): void {
  const parsed = new URL(url);
  if (
    parsed.protocol !== 'https:' &&
    parsed.hostname !== 'localhost' &&
    parsed.hostname !== '127.0.0.1' &&
    parsed.hostname !== '::1'
  ) {
    throw new Error(
      `Refusing to send access token over plain HTTP to non-local host: ${url}`,
    );
  }
}

// 絶対 URL は apiUrl と同一オリジンのみ許可（SSRF / トークン漏洩防止）。
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
  const accessToken = config.accessToken;

  if (!accessToken) {
    throw new Error(
      'PaPut authentication is not configured for this MCP request.',
    );
  }

  const url = resolveEndpointUrl(config.apiUrl, endpoint);
  requireHttps(url);

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
