import {
  chmodSync,
  rmSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { z } from 'zod';

const REFRESH_SKEW_MS = 5 * 60 * 1000;

export interface StoredOAuthSession {
  access_token: string;
  api_url: string;
  client_id: string;
  expires_at: string;
  issuer: string;
  redirect_uri: string;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export const tokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string().optional().default(''),
  token_type: z.string().optional().default('Bearer'),
});

type TokenResponse = z.infer<typeof tokenResponseSchema>;

export function getOAuthSessionPath(): string {
  const paputHome = process.env.PAPUT_HOME || join(homedir(), '.paput');
  return join(paputHome, 'oauth.json');
}

export function readStoredOAuthSession(): StoredOAuthSession | undefined {
  const path = getOAuthSessionPath();
  if (!existsSync(path)) return undefined;

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as StoredOAuthSession;
    if (!isStoredOAuthSession(parsed)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function writeStoredOAuthSession(session: StoredOAuthSession): void {
  const path = getOAuthSessionPath();
  ensurePrivateDirectory(dirname(path));

  const tmpPath = `${path}.tmp`;
  writeFileSync(tmpPath, `${JSON.stringify(session, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  renameSync(tmpPath, path);
  chmodSync(path, 0o600);
}

export function deleteStoredOAuthSession(): void {
  rmSync(getOAuthSessionPath(), { force: true });
}

let refreshInFlight: Promise<StoredOAuthSession | undefined> | undefined;

export async function getValidStoredAccessToken(
  apiUrl: string,
): Promise<string | undefined> {
  const session = readStoredOAuthSession();
  if (!session || !sameOrigin(session.api_url, apiUrl)) return undefined;

  if (new Date(session.expires_at).getTime() > Date.now() + REFRESH_SKEW_MS) {
    return session.access_token;
  }

  if (!refreshInFlight) {
    refreshInFlight = refreshStoredOAuthSession(session).finally(() => {
      refreshInFlight = undefined;
    });
  }
  const refreshed = await refreshInFlight;
  return refreshed?.access_token;
}

async function refreshStoredOAuthSession(
  session: StoredOAuthSession,
): Promise<StoredOAuthSession | undefined> {
  const metadata = await fetchAuthorizationServerMetadata(session.api_url);
  const response = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: session.client_id,
      refresh_token: session.refresh_token,
    }),
  });

  if (!response.ok) return undefined;

  const parsed = tokenResponseSchema.safeParse(await response.json());
  if (!parsed.success) return undefined;
  const token: TokenResponse = parsed.data;
  const refreshed = buildStoredOAuthSession({
    apiUrl: session.api_url,
    clientId: session.client_id,
    issuer: metadata.issuer,
    redirectUri: session.redirect_uri,
    token,
  });
  writeStoredOAuthSession(refreshed);
  return refreshed;
}

export async function fetchAuthorizationServerMetadata(
  apiUrl: string,
): Promise<{
  authorization_endpoint: string;
  issuer: string;
  registration_endpoint: string;
  revocation_endpoint?: string;
  token_endpoint: string;
}> {
  const issuer = new URL(apiUrl).origin;
  const response = await fetch(
    `${issuer}/.well-known/oauth-authorization-server`,
  );
  if (!response.ok) {
    throw new Error(`Failed to load OAuth metadata: HTTP ${response.status}`);
  }

  const metadata = (await response.json()) as {
    authorization_endpoint?: string;
    issuer?: string;
    registration_endpoint?: string;
    revocation_endpoint?: string;
    token_endpoint?: string;
  };

  if (
    !metadata.authorization_endpoint ||
    !metadata.issuer ||
    !metadata.registration_endpoint ||
    !metadata.token_endpoint
  ) {
    throw new Error('OAuth metadata is missing required endpoints.');
  }

  if (metadata.issuer !== issuer) {
    throw new Error(
      `OAuth metadata issuer mismatch: expected ${issuer}, got ${metadata.issuer}`,
    );
  }

  for (const [name, url] of [
    ['authorization_endpoint', metadata.authorization_endpoint],
    ['token_endpoint', metadata.token_endpoint],
    ['registration_endpoint', metadata.registration_endpoint],
  ] as const) {
    if (new URL(url).origin !== issuer) {
      throw new Error(
        `OAuth metadata ${name} origin does not match issuer: ${url}`,
      );
    }
  }

  return {
    authorization_endpoint: metadata.authorization_endpoint,
    issuer: metadata.issuer,
    registration_endpoint: metadata.registration_endpoint,
    revocation_endpoint: metadata.revocation_endpoint,
    token_endpoint: metadata.token_endpoint,
  };
}

export function buildStoredOAuthSession(params: {
  apiUrl: string;
  clientId: string;
  issuer: string;
  redirectUri: string;
  token: TokenResponse;
}): StoredOAuthSession {
  return {
    access_token: params.token.access_token,
    api_url: params.apiUrl,
    client_id: params.clientId,
    expires_at: new Date(
      Date.now() + params.token.expires_in * 1000,
    ).toISOString(),
    issuer: params.issuer,
    redirect_uri: params.redirectUri,
    refresh_token: params.token.refresh_token,
    scope: params.token.scope,
    token_type: params.token.token_type,
  };
}

function isStoredOAuthSession(value: StoredOAuthSession): boolean {
  return (
    typeof value.access_token === 'string' &&
    typeof value.api_url === 'string' &&
    typeof value.client_id === 'string' &&
    typeof value.expires_at === 'string' &&
    typeof value.issuer === 'string' &&
    typeof value.redirect_uri === 'string' &&
    typeof value.refresh_token === 'string' &&
    typeof value.scope === 'string' &&
    typeof value.token_type === 'string'
  );
}

function sameOrigin(left: string, right: string): boolean {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}

function ensurePrivateDirectory(path: string): void {
  mkdirSync(path, { mode: 0o700, recursive: true });
  chmodSync(path, 0o700);
}
