const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export type TeamRole = 'ClinicAdministrator' | 'Professional' | 'Receptionist'
export type TeamStatus = 'Active' | 'Invited' | 'Suspended' | 'Revoked'
export type TeamUnit = { id: string; name: string }
export type TeamMember = { membershipId: string; userId: string; displayName: string; email: string; role: TeamRole; status: TeamStatus; createdAt: string; units: TeamUnit[]; isCurrentUser: boolean; performsCare: boolean; specialty?: string; councilType?: string; registrationNumber?: string; councilState?: string; defaultAppointmentDurationMinutes?: number }
export type ClinicUnit = { id: string; name: string; isActive: boolean }
export type InviteTeamMember = { displayName: string; email: string; role: TeamRole; clinicUnitIds: string[]; performsCare: boolean; specialty: string; councilType: string; registrationNumber: string; councilState: string; defaultAppointmentDurationMinutes?: number }
export type InvitationResult = { deliveryStatus: 'sent' | 'manual-required'; activationUrl?: string; expiresAt?: string }

async function responseJson<T>(response: Response, emptyMessage: string): Promise<T> {
  const body = await response.text()
  if (!body.trim()) throw new Error(`${emptyMessage} (HTTP ${response.status}).`)

  try {
    return JSON.parse(body) as T
  } catch {
    throw new Error(`O servidor retornou uma resposta inválida (HTTP ${response.status}).`)
  }
}

async function problem(response: Response, fallback: string): Promise<never> {
  const body = await response.text()
  let title: string | undefined
  if (body.trim()) {
    try {
      title = (JSON.parse(body) as { title?: string }).title
    } catch {}
  }
  if (title) throw new Error(title)
  throw new Error(`${fallback} (HTTP ${response.status}).`)
}

async function secureHeaders() {
  const response = await fetch(`${apiBaseUrl}/auth/csrf-token`, { credentials: 'include' })
  if (!response.ok) return problem(response, 'Não foi possível preparar a solicitação segura.')
  const payload = await responseJson<{ token?: string; headerName?: string }>(
    response,
    'O serviço de segurança retornou uma resposta vazia',
  )
  if (!payload.token || !payload.headerName) throw new Error('Não foi possível preparar a solicitação segura.')
  return { 'Content-Type': 'application/json', [payload.headerName]: payload.token }
}

export async function listTeam() {
  const response = await fetch(`${apiBaseUrl}/team-members`, { credentials: 'include', cache: 'no-store' })
  if (!response.ok) return problem(response, 'Não foi possível carregar sua equipe.')
  const members = await responseJson<TeamMember[]>(response, 'O servidor não retornou os dados da equipe')
  if (!Array.isArray(members)) throw new Error(`O servidor retornou um formato inválido para a equipe (HTTP ${response.status}).`)
  return members
}

export async function listClinicUnits() {
  const response = await fetch(`${apiBaseUrl}/clinic-units?pageSize=100`, { credentials: 'include', cache: 'no-store' })
  if (!response.ok) return problem(response, 'Não foi possível carregar as unidades.')
  const page = await responseJson<{ items?: ClinicUnit[] }>(response, 'O servidor não retornou as unidades')
  if (!Array.isArray(page.items)) throw new Error(`O servidor retornou um formato inválido para as unidades (HTTP ${response.status}).`)
  return page.items.filter((unit) => unit.isActive)
}

export async function inviteTeamMember(input: InviteTeamMember) {
  const response = await fetch(`${apiBaseUrl}/invitations`, { method: 'POST', credentials: 'include', headers: await secureHeaders(), body: JSON.stringify(input) })
  if (!response.ok) return problem(response, 'Não foi possível enviar o convite.')
  const result = await responseJson<Partial<InvitationResult>>(
    response,
    'O servidor aceitou a solicitação, mas não retornou os detalhes do convite. O acesso pode ter sido criado; atualize a equipe antes de tentar novamente para evitar duplicidade',
  )
  if (result.deliveryStatus !== 'sent' && result.deliveryStatus !== 'manual-required') {
    throw new Error(`O servidor aceitou a solicitação (HTTP ${response.status}), mas retornou um status de entrega inválido. O acesso pode ter sido criado; atualize a equipe antes de reenviar.`)
  }
  if (result.activationUrl !== undefined && typeof result.activationUrl !== 'string') {
    throw new Error(`O servidor retornou detalhes inválidos para o convite (HTTP ${response.status}). Verifique a equipe antes de reenviar.`)
  }
  return result as InvitationResult
}

export async function updateTeamMember(membershipId: string, input: Pick<InviteTeamMember, 'role' | 'clinicUnitIds' | 'performsCare' | 'specialty' | 'councilType' | 'registrationNumber' | 'councilState' | 'defaultAppointmentDurationMinutes'>) {
  const response = await fetch(`${apiBaseUrl}/team-members/${membershipId}`, { method: 'PATCH', credentials: 'include', headers: await secureHeaders(), body: JSON.stringify(input) })
  if (!response.ok) return problem(response, 'Não foi possível atualizar este acesso.')
}

export async function deactivateTeamMember(membershipId: string) {
  const response = await fetch(`${apiBaseUrl}/team-members/${membershipId}/deactivation`, { method: 'POST', credentials: 'include', headers: await secureHeaders() })
  if (!response.ok) return problem(response, 'Não foi possível desativar este acesso.')
}
