import {
  deleteStoredOAuthSession,
  fetchAuthorizationServerMetadata,
  readStoredOAuthSession,
} from '../services/oauth/local-auth.js';

interface LogoutOptions {
  localOnly: boolean;
}

export async function logout(args: string[]): Promise<void> {
  const options = parseLogoutOptions(args);
  const session = readStoredOAuthSession();

  if (!session) {
    deleteStoredOAuthSession();
    console.log('No PaPut OAuth session was found.');
    return;
  }

  if (!options.localOnly) {
    try {
      await revokeRefreshToken(session);
      console.log('PaPut OAuth refresh token was revoked.');
    } catch (error) {
      console.warn(
        `Could not revoke the remote token: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      console.warn('Removing the local token cache anyway.');
    }
  }

  deleteStoredOAuthSession();
  console.log('Local PaPut OAuth token cache was removed.');
}

function parseLogoutOptions(args: string[]): LogoutOptions {
  const options: LogoutOptions = { localOnly: false };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      printLogoutHelp();
      process.exit(0);
    } else if (arg === '--local-only') {
      options.localOnly = true;
    } else {
      throw new Error(`Unknown logout option: ${arg}`);
    }
  }

  return options;
}

async function revokeRefreshToken(session: {
  api_url: string;
  client_id: string;
  refresh_token: string;
}): Promise<void> {
  const metadata = await fetchAuthorizationServerMetadata(session.api_url);
  if (!metadata.revocation_endpoint) {
    throw new Error('OAuth metadata does not provide a revocation endpoint.');
  }

  const response = await fetch(metadata.revocation_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: session.client_id,
      token: session.refresh_token,
      token_type_hint: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

function printLogoutHelp(): void {
  console.log(`Usage:
  paput-mcp logout [options]

Options:
  --local-only          Remove the local token cache without calling the revoke endpoint
`);
}
