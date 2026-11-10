type ProblemDetails = { title?: string }

export type AuthSessionSummary = {
  user: { id: string; displayName: string; email: string }
  platformAdministrator: { role: string } | null
  memberships: Array<{ id: string; tenantId: string; tenantName: string; role: string }>
  activeTenant: { id: string; name: string } | null
  expiresAt: string
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

async function getCsrfToken(): Promise<string> {
  const response = await fetch(`${apiBaseUrl}/auth/csrf-token`, { credentials: 'include' })
  if (!response.ok) throw new Error('Não foi possível preparar a solicitação segura. Tente novamente.')

  const payload = await response.json() as { token?: string; headerName?: string }
  if (!payload.token || !payload.headerName) throw new Error('Não foi possível preparar a solicitação segura. Tente novamente.')
  return payload.token
}

async function post(path: string, payload: object): Promise<void> {
  const csrfToken = await getCsrfToken()
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(payload),
  })
  if (response.ok) return

  const problem = await response.json().catch(() => null) as ProblemDetails | null
  throw new Error(problem?.title ?? 'Não foi possível concluir sua solicitação. Tente novamente.')
}

async function postForSession(path: string, payload: object): Promise<AuthSessionSummary> {
  const csrfToken = await getCsrfToken()
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify(payload),
  })
  if (response.ok) return response.json() as Promise<AuthSessionSummary>
  const problem = await response.json().catch(() => null) as ProblemDetails | null
  throw new Error(problem?.title ?? 'Não foi possível entrar. Tente novamente.')
}

export function login(cpf: string, password: string) {
  return postForSession('/auth/login', { cpf, password })
}

export function selectActiveTenant(tenantId: string) {
  return putForSession('/auth/active-tenant', { tenantId })
}

async function putForSession(path: string, payload: object): Promise<AuthSessionSummary> {
  const csrfToken = await getCsrfToken()
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify(payload),
  })
  if (response.ok) return response.json() as Promise<AuthSessionSummary>
  const problem = await response.json().catch(() => null) as ProblemDetails | null
  throw new Error(problem?.title ?? 'Não foi possível selecionar a empresa.')
}

export async function getCurrentSession(): Promise<AuthSessionSummary | null> {
  const response = await fetch(`${apiBaseUrl}/auth/session`, { credentials: 'include' })
  if (response.status === 401) return null
  if (!response.ok) throw new Error('Não foi possível consultar sua sessão.')
  return response.json() as Promise<AuthSessionSummary>
}

export async function logout(): Promise<void> {
  const csrfToken = await getCsrfToken()
  await fetch(`${apiBaseUrl}/auth/logout`, {
    method: 'POST', credentials: 'include', headers: { 'X-CSRF-Token': csrfToken },
  })
}

export async function createTenant(tenantName: string, administratorEmail: string, administratorDisplayName: string, clinicUnitName: string) {
  const csrfToken = await getCsrfToken()
  const response = await fetch(`${apiBaseUrl}/tenants`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ tenantName, administratorEmail, administratorDisplayName, clinicUnitName: clinicUnitName || null }) })
  if (response.ok) return
  const problem = await response.json().catch(() => null) as ProblemDetails | null
  throw new Error(problem?.title ?? 'Não foi possível criar a empresa.')
}

export type TenantListItem = { id: string; name: string; cnpj?: string; status: string; firstAdministratorStatus: string; responsibleName?: string; responsibleEmail?: string }
export async function listTenants(search = ''): Promise<TenantListItem[]> {
  const response = await fetch(`${apiBaseUrl}/tenants?search=${encodeURIComponent(search)}`, { credentials: 'include' })
  if (!response.ok) throw new Error('Não foi possível carregar as empresas.')
  return response.json() as Promise<TenantListItem[]>
}

export type TenantPreRegistrationInput = { companyName: string; cnpj: string; responsibleName: string; responsibleEmail: string }

async function preRegistrationRequest(path: string, method: 'POST' | 'PUT' | 'DELETE', payload?: object): Promise<Response> {
  const csrfToken = await getCsrfToken()
  const response = await fetch(`${apiBaseUrl}/tenant-pre-registrations${path}`, {
    method, credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: payload ? JSON.stringify(payload) : undefined,
  })
  if (response.ok) return response
  const problem = await response.json().catch(() => null) as ProblemDetails | null
  throw new Error(problem?.title ?? 'Não foi possível concluir a operação.')
}

export async function createPreRegistration(input: TenantPreRegistrationInput): Promise<void> { await preRegistrationRequest('', 'POST', input) }
export async function updatePreRegistration(id: string, input: TenantPreRegistrationInput): Promise<void> { await preRegistrationRequest(`/${id}`, 'PUT', input) }
export async function cancelPreRegistration(id: string): Promise<void> { await preRegistrationRequest(`/${id}`, 'DELETE') }
export async function resendPreRegistration(id: string): Promise<void> { await preRegistrationRequest(`/${id}/resend`, 'POST') }

export function activateAccount(token: string, cpf: string, password: string, passwordConfirmation: string) {
  return post('/auth/activation', { token, cpf, password, passwordConfirmation })
}

export type InvitationContext = { displayName: string; email: string; hasCpf: boolean; tenantId: string; tenantName: string; role: string; units: Array<{ id: string; name: string }>; expiresAt: string }
export async function getInvitationContext(token: string): Promise<InvitationContext> {
  const csrfToken = await getCsrfToken()
  const response = await fetch(`${apiBaseUrl}/auth/invitation-context`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify({ token }) })
  if (response.ok) return response.json() as Promise<InvitationContext>
  const problem = await response.json().catch(() => null) as ProblemDetails | null
  throw new Error(problem?.title ?? 'Este convite não está mais disponível.')
}

export function requestPasswordRecovery(email: string) {
  return post('/auth/password-recovery-requests', { email })
}

export function confirmPasswordRecovery(token: string, password: string, passwordConfirmation: string) {
  return post('/auth/password-recovery-confirmations', { token, password, passwordConfirmation })
}
