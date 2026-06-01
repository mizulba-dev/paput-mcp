type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ApiConfig {
  apiUrl: string;
  apiKey?: string;
}

export async function apiRequest<T = unknown>(
  config: ApiConfig,
  endpoint: string,
  method: HttpMethod,
  body?: unknown,
): Promise<T> {
  if (!config.apiKey) {
    throw new Error(
      'PAPUT_API_KEY is not configured. Set PAPUT_API_KEY or use OAuth authentication when it is available.',
    );
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${config.apiUrl}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'X-API-Key': config.apiKey,
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

export function createApiClient(apiUrl: string, apiKey?: string) {
  const config: ApiConfig = { apiUrl, apiKey };

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
