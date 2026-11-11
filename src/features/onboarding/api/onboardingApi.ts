import type { OnboardingApi, OnboardingCompletion, OnboardingCompletionResult, OnboardingContext } from '../types'
import { OnboardingApiError } from '../types'

type ProblemDetails = { title?: string; type?: string }
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

async function parseFailure(response: Response): Promise<never> {
  const problem = await response.json().catch(() => null) as ProblemDetails | null
  const problemType = problem?.type?.toLowerCase() ?? ''
  const state = problemType.includes('revoked') ? 'revoked' : problemType.includes('used') ? 'used' : problemType.includes('expired') ? 'expired' : response.status === 503 ? 'unavailable' : 'invalid'
  throw new OnboardingApiError(state, problem?.title ?? 'Não foi possível validar o convite.')
}

async function secureHeaders() {
  const response = await fetch(`${apiBaseUrl}/auth/csrf-token`, { credentials: 'include' })
  if (!response.ok) throw new OnboardingApiError('unavailable', 'Não foi possível preparar a solicitação segura.')
  const payload = await response.json() as { token?: string; headerName?: string }
  if (!payload.token || !payload.headerName) throw new OnboardingApiError('unavailable', 'Não foi possível preparar a solicitação segura.')
  return { 'Content-Type': 'application/json', [payload.headerName]: payload.token }
}

const httpApi: OnboardingApi = {
  async getContext(token: string): Promise<OnboardingContext> {
    const headers = await secureHeaders()
    const response = await fetch(`${apiBaseUrl}/onboarding/context`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ token }),
    })
    if (!response.ok) return parseFailure(response)
    return response.json() as Promise<OnboardingContext>
  },
  async complete(payload: OnboardingCompletion): Promise<OnboardingCompletionResult> {
    const headers = await secureHeaders()
    const response = await fetch(`${apiBaseUrl}/onboarding/completion`, {
      method: 'POST',
      credentials: 'include',
      headers,
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
  async getContext(token) { return (await selectedApi()).getContext(token) },
  async complete(payload) { return (await selectedApi()).complete(payload) },
}
