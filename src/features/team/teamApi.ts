const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export type TeamRole = 'ClinicAdministrator' | 'Professional' | 'Receptionist'
export type TeamStatus = 'Active' | 'Invited' | 'Suspended' | 'Revoked'
export type TeamUnit = { id: string; name: string }
export type TeamMember = { membershipId: string; userId: string; displayName: string; email: string; role: TeamRole; status: TeamStatus; createdAt: string; units: TeamUnit[]; isCurrentUser: boolean }
export type ClinicUnit = { id: string; name: string; isActive: boolean }
export type InviteTeamMember = { displayName: string; email: string; role: TeamRole; clinicUnitIds: string[] }

async function problem(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => null) as { title?: string } | null
  throw new Error(body?.title ?? fallback)
}

async function secureHeaders() {
  const response = await fetch(`${apiBaseUrl}/auth/csrf-token`, { credentials: 'include' })
  if (!response.ok) return problem(response, 'Não foi possível preparar a solicitação segura.')
  const payload = await response.json() as { token?: string; headerName?: string }
  if (!payload.token || !payload.headerName) throw new Error('Não foi possível preparar a solicitação segura.')
  return { 'Content-Type': 'application/json', [payload.headerName]: payload.token }
}

export async function listTeam() {
  const response = await fetch(`${apiBaseUrl}/team-members`, { credentials: 'include', cache: 'no-store' })
  if (!response.ok) return problem(response, 'Não foi possível carregar sua equipe.')
  return response.json() as Promise<TeamMember[]>
}

export async function listClinicUnits() {
  const response = await fetch(`${apiBaseUrl}/clinic-units?pageSize=100`, { credentials: 'include', cache: 'no-store' })
  if (!response.ok) return problem(response, 'Não foi possível carregar as unidades.')
  const page = await response.json() as { items: ClinicUnit[] }
  return page.items.filter((unit) => unit.isActive)
}

export async function inviteTeamMember(input: InviteTeamMember) {
  const response = await fetch(`${apiBaseUrl}/invitations`, { method: 'POST', credentials: 'include', headers: await secureHeaders(), body: JSON.stringify(input) })
  if (!response.ok) return problem(response, 'Não foi possível enviar o convite.')
}

export async function updateTeamMember(membershipId: string, input: Pick<InviteTeamMember, 'role' | 'clinicUnitIds'>) {
  const response = await fetch(`${apiBaseUrl}/team-members/${membershipId}`, { method: 'PATCH', credentials: 'include', headers: await secureHeaders(), body: JSON.stringify(input) })
  if (!response.ok) return problem(response, 'Não foi possível atualizar este acesso.')
}

export async function deactivateTeamMember(membershipId: string) {
  const response = await fetch(`${apiBaseUrl}/team-members/${membershipId}/deactivation`, { method: 'POST', credentials: 'include', headers: await secureHeaders() })
  if (!response.ok) return problem(response, 'Não foi possível desativar este acesso.')
}
