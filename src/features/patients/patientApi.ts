type ProblemDetails = { title?: string }

export type PatientRegistration = {
  id: string
  fullName: string
  birthDate: string
  healthPlan?: string | null
  status: string
  professionalId?: string | null
  clinicUnitId?: string | null
  createdAt: string
}

export type PatientRegistrationOptions = {
  professionals: Array<{ id: string; name: string; specialty: string; clinicUnitIds: string[] }>
  clinicUnits: Array<{ id: string; name: string; timeZoneId: string }>
}

export type PatientListItem = {
  id: string
  fullName: string
  birthDate: string
  healthPlan?: string | null
  status: string
  professionalId?: string | null
  professionalName?: string | null
  clinicUnitId?: string | null
  createdAt: string
}

export type PatientPage = {
  items: PatientListItem[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

async function getCsrfToken(): Promise<{ token: string; headerName: string }> {
  const response = await fetch(`${apiBaseUrl}/auth/csrf-token`, {
    credentials: 'include',
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('Não foi possível preparar a solicitação segura. Tente novamente.')

  const payload = await response.json() as { token?: string; headerName?: string }
  if (!payload.token || !payload.headerName) {
    throw new Error('Não foi possível preparar a solicitação segura. Tente novamente.')
  }

  return { token: payload.token, headerName: payload.headerName }
}

export async function getPatientRegistrationOptions(): Promise<PatientRegistrationOptions> {
  const response = await fetch(`${apiBaseUrl}/patients/registration-options`, {
    credentials: 'include',
    signal: AbortSignal.timeout(15000),
  })
  if (response.ok) return response.json() as Promise<PatientRegistrationOptions>

  const problem = await response.json().catch(() => null) as ProblemDetails | null
  throw new Error(problem?.title ?? 'Não foi possível carregar profissionais e unidades.')
}

export async function listPatients(search = '', page = 1, pageSize = 10): Promise<PatientPage> {
  const parameters = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (search.trim()) parameters.set('search', search.trim())
  const response = await fetch(`${apiBaseUrl}/patients?${parameters}`, {
    credentials: 'include',
    signal: AbortSignal.timeout(15000),
  })
  if (response.ok) return response.json() as Promise<PatientPage>

  const problem = await response.json().catch(() => null) as ProblemDetails | null
  throw new Error(problem?.title ?? 'Não foi possível carregar os pacientes.')
}

export async function createPatient(input: {
  fullName: string
  birthDate: string
  healthPlan?: string
  professionalId?: string
  clinicUnitId?: string
}): Promise<PatientRegistration> {
  const csrf = await getCsrfToken()
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/patients`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
      body: JSON.stringify({
        fullName: input.fullName,
        birthDate: input.birthDate,
        healthPlan: input.healthPlan || null,
        professionalId: input.professionalId || null,
        clinicUnitId: input.clinicUnitId || null,
      }),
      signal: AbortSignal.timeout(15000),
    })
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === 'TimeoutError') {
      throw new Error('O cadastro demorou mais que o esperado. Verifique a conexão e tente novamente.')
    }
    throw new Error('Não foi possível conectar ao serviço de pacientes. Tente novamente.')
  }

  if (response.ok) return response.json() as Promise<PatientRegistration>

  const problem = await response.json().catch(() => null) as ProblemDetails | null
  throw new Error(problem?.title ?? 'Não foi possível cadastrar o paciente. Tente novamente.')
}

export async function updatePatient(patientId: string, input: {
  fullName: string
  birthDate: string
  healthPlan?: string
  professionalId?: string
  clinicUnitId?: string
}): Promise<PatientRegistration> {
  return writePatient(`/patients/${patientId}`, 'PUT', input)
}

export async function deactivatePatient(patientId: string): Promise<PatientRegistration> {
  const csrf = await getCsrfToken()
  const response = await fetch(`${apiBaseUrl}/patients/${patientId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { [csrf.headerName]: csrf.token },
    signal: AbortSignal.timeout(15000),
  })
  if (response.ok) return response.json() as Promise<PatientRegistration>
  const problem = await response.json().catch(() => null) as ProblemDetails | null
  throw new Error(problem?.title ?? 'Não foi possível desativar o paciente.')
}

async function writePatient(
  path: string,
  method: 'PUT',
  input: { fullName: string; birthDate: string; healthPlan?: string; professionalId?: string; clinicUnitId?: string },
): Promise<PatientRegistration> {
  const csrf = await getCsrfToken()
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
    body: JSON.stringify({ ...input, healthPlan: input.healthPlan || null, professionalId: input.professionalId || null, clinicUnitId: input.clinicUnitId || null }),
    signal: AbortSignal.timeout(15000),
  })
  if (response.ok) return response.json() as Promise<PatientRegistration>
  const problem = await response.json().catch(() => null) as ProblemDetails | null
  throw new Error(problem?.title ?? 'Não foi possível atualizar o paciente.')
}
