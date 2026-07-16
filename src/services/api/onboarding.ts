import type { OnboardingStatus } from '../../types/index.js';
import type { ApiClient } from './client.js';

const ONBOARDING_STATUS_TIMEOUT_MS = 3_000;

export async function getOnboardingStatus(
  client: ApiClient,
): Promise<OnboardingStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    ONBOARDING_STATUS_TIMEOUT_MS,
  );
  let status: OnboardingStatus;

  try {
    status = await client.get<OnboardingStatus>(
      '/api/v1/mcp/onboarding-status',
      { signal: controller.signal },
    );
  } finally {
    clearTimeout(timeout);
  }

  if (
    !status ||
    typeof status.memo_count !== 'number' ||
    typeof status.has_skill_sheet !== 'boolean'
  ) {
    throw new Error('Invalid onboarding status response format');
  }

  return status;
}
