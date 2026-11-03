type ProblemDetails = { title?: string }

export type CommercialOnboardingInput = {
  companyName: string
  cnpj: string
  responsibleName: string
  responsibleEmail: string
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

async function getCsrfToken(): Promise<{ token: string; headerName: string }> {
  const response = await fetch(`${apiBaseUrl}/auth/csrf-token`, { credentials: 'include' })
  if (!response.ok) throw new Error('Não foi possível preparar sua solicitação. Tente novamente.')

  const payload = await response.json() as { token?: string; headerName?: string }
  if (!payload.token || !payload.headerName) {
    throw new Error('Não foi possível preparar sua solicitação. Tente novamente.')
  }

  return { token: payload.token, headerName: payload.headerName }
}

export type CommercialOnboardingResult = { tenantId: string; status: string }

export async function requestCommercialOnboarding(input: CommercialOnboardingInput): Promise<CommercialOnboardingResult> {
  const csrf = await getCsrfToken()
  const response = await fetch(`${apiBaseUrl}/commercial-onboardings/simulated-payment`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
    body: JSON.stringify(input),
  })

  if (response.ok) return response.json() as Promise<CommercialOnboardingResult>

  const problem = await response.json().catch(() => null) as ProblemDetails | null
  throw new Error(problem?.title ?? 'Não foi possível enviar sua solicitação. Tente novamente.')
}

export async function resendCommercialOnboardingInvitation(tenantId: string): Promise<void> {
  const csrf = await getCsrfToken()
  const response = await fetch(`${apiBaseUrl}/commercial-onboardings/${encodeURIComponent(tenantId)}/resend-simulated-invitation`, {
    method: 'POST',
    credentials: 'include',
    headers: { [csrf.headerName]: csrf.token },
  })

  if (response.ok) return

  const problem = await response.json().catch(() => null) as ProblemDetails | null
  throw new Error(problem?.title ?? 'Não foi possível reenviar o convite. Tente novamente.')
}
