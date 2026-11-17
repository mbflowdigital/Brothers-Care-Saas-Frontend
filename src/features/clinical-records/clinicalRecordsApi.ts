const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export type ClinicalRecordStatus = 'Draft' | 'Finalized'
export type ClinicalRecordOptions = {
  patients: Array<{ id: string; name: string; clinicUnitIds: string[] }>
  units: Array<{ id: string; name: string }>
  author: { membershipId: string; professionalId: string; name: string; specialty?: string | null }
}
export type ClinicalRecordSummary = {
  id: string; patientId: string; patientName: string; clinicUnitId: string; clinicUnitName: string
  authorName: string; authorSpecialty?: string | null; status: ClinicalRecordStatus; summary: string
  createdAt: string; updatedAt: string; finalizedAt?: string | null
}
export type ClinicalRecord = ClinicalRecordSummary & {
  authorMembershipId: string; appointmentId?: string | null; patientReport: string
  proceduresAndObservations: string; assessmentAndPlan: string; version: string
}
export type ClinicalRecordInput = {
  patientReport: string; proceduresAndObservations: string; assessmentAndPlan: string
}

type ProblemDetails = { title?: string }

async function problem(response: Response, fallback: string): Promise<never> {
  const payload = await response.json().catch(() => null) as ProblemDetails | null
  throw new Error(payload?.title ?? fallback)
}

async function csrfHeaders() {
  const response = await fetch(`${apiBaseUrl}/auth/csrf-token`, { credentials: 'include', signal: AbortSignal.timeout(10000) })
  if (!response.ok) return problem(response, 'Não foi possível preparar a solicitação segura.')
  const payload = await response.json() as { token?: string; headerName?: string }
  if (!payload.token || !payload.headerName) throw new Error('Não foi possível preparar a solicitação segura.')
  return { 'Content-Type': 'application/json', [payload.headerName]: payload.token }
}

async function read<T>(path: string, fallback: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { credentials: 'include', signal: AbortSignal.timeout(15000) })
  return response.ok ? response.json() as Promise<T> : problem(response, fallback)
}

async function write<T>(path: string, method: 'POST' | 'PATCH', body: unknown, fallback: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method, credentials: 'include', headers: await csrfHeaders(), body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
  })
  return response.ok ? response.json() as Promise<T> : problem(response, fallback)
}

export const getClinicalRecordOptions = () => read<ClinicalRecordOptions>('/clinical-records/options', 'Não foi possível preparar o prontuário.')
export const listClinicalRecords = (patientId: string) => read<ClinicalRecordSummary[]>(`/patients/${patientId}/clinical-records`, 'Não foi possível carregar o histórico clínico.')
export const getClinicalRecord = (recordId: string) => read<ClinicalRecord>(`/clinical-records/${recordId}`, 'Não foi possível abrir esta evolução.')
export const createClinicalRecord = (patientId: string, clinicUnitId: string, input: ClinicalRecordInput) =>
  write<ClinicalRecord>('/clinical-records', 'POST', { patientId, clinicUnitId, ...input }, 'Não foi possível salvar o rascunho.')
export const updateClinicalRecord = (recordId: string, version: string, input: ClinicalRecordInput) =>
  write<ClinicalRecord>(`/clinical-records/${recordId}`, 'PATCH', { ...input, version }, 'Não foi possível atualizar o rascunho.')
export const finalizeClinicalRecord = (recordId: string, version: string) =>
  write<ClinicalRecord>(`/clinical-records/${recordId}/finalization`, 'POST', { version }, 'Não foi possível finalizar a evolução.')
