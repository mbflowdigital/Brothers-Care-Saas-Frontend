import type { OnboardingApi, OnboardingCompletion, OnboardingCompletionResult, OnboardingContext } from '../types'
import { OnboardingApiError } from '../types'

type ProblemDetails = { title?: string; type?: string }
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

async function parseFailure(response: Response): Promise<never> {
  const problem = await response.json().catch(() => null) as ProblemDetails | null
  const problemType = problem?.type?.toLowerCase() ?? ''
  const state = problemType.includes('cnpj-mismatch')
    ? 'cnpj-mismatch'
    : problemType.includes('revoked')
      ? 'revoked'
      : problemType.includes('used')
        ? 'used'
        : problemType.includes('expired')
          ? 'expired'
          : problemType.includes('invalid-onboarding-token')
            ? 'invalid'
            : 'unavailable'
  throw new OnboardingApiError(state, problem?.title ?? 'Não foi possível validar o convite.')
}

const httpApi: OnboardingApi = {
  async getContext(token: string, cnpj: string): Promise<OnboardingContext> {
    const response = await fetch(`${apiBaseUrl}/onboarding/context`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, cnpj }),
    })
    if (!response.ok) return parseFailure(response)
    return response.json() as Promise<OnboardingContext>
  },
  async complete(payload: OnboardingCompletion): Promise<OnboardingCompletionResult> {
    const response = await fetch(`${apiBaseUrl}/onboarding/completion`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) return parseFailure(response)
    return response.json() as Promise<OnboardingCompletionResult>
  },
}

async function selectedApi(): Promise<OnboardingApi> {
  const useDevelopmentMock = import.meta.env.DEV && import.meta.env.VITE_USE_ONBOARDING_MOCK === 'true'
  if (!useDevelopmentMock) return httpApi
  const module = await import('../mocks/mockOnboardingApi')
  return module.mockOnboardingApi
}

export const onboardingApi: OnboardingApi = {
  async getContext(token, cnpj) { return (await selectedApi()).getContext(token, cnpj) },
  async complete(payload) { return (await selectedApi()).complete(payload) },
}
