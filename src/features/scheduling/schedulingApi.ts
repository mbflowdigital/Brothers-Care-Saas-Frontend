type ProblemDetails = { title?: string; detail?: string }

export type SchedulingPatientOption = {
  id: string
  fullName: string
  healthPlan: string | null
}

export type SchedulingClinicUnitOption = {
  id: string
  name: string
  timeZoneId: string
}

export type SchedulingOptions = {
  professionalId: string
  patients: SchedulingPatientOption[]
  clinicUnits: SchedulingClinicUnitOption[]
  defaultAppointmentDurationMinutes: number | null
}

export type ProfessionalAvailability = {
  professionalId: string
  clinicUnitId: string
  timeZoneId: string
  isScheduleConfigured: boolean
  weeklyWindows: Array<{
    id: string
    clinicUnitId: string
    dayOfWeek: number
    startsAt: string
    endsAt: string
  }>
  blocks: ProfessionalAvailabilityBlock[]
}

export type ProfessionalAvailabilityBlock = {
  id: string
  startsAt: string
  endsAt: string
  kind: 'Blocked' | 'Vacation'
  reason: string | null
}

export type WeeklyAvailabilityWindowInput = {
  dayOfWeek: number
  startsAt: string
  endsAt: string
}

export type CreateAvailabilityBlockInput = {
  startsAt: string
  endsAt: string
  kind: ProfessionalAvailabilityBlock['kind']
  reason: string | null
}

export type AppointmentScheduleItem = {
  id: string
  professionalId: string
  professionalName: string
  patientId: string
  patientName: string
  clinicUnitId: string
  clinicUnitName: string
  timeZoneId: string
  startsAt: string
  endsAt: string
  notes: string | null
  status: string
  durationMinutes: number
  createdAt: string
  updatedAt: string
}

export type AvailableAppointmentSlot = {
  startsAt: string
  endsAt: string
}

export type CreateAppointmentInput = {
  patientId: string
  clinicUnitId: string
  startsAt: string
  endsAt: string
  notes: string | null
}

export type CreatedAppointment = {
  id: string
  clinicUnitId: string
  patientId: string
  professionalId: string
  startsAt: string
  endsAt: string
  notes: string | null
  status: string
  createdAt: string
}

export type RescheduleAppointmentInput = {
  clinicUnitId: string
  startsAt: string
  endsAt: string
}

export type CancelAppointmentInput = {
  reason: string
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export async function getSchedulingOptions(): Promise<SchedulingOptions> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/appointments/options`, {
      credentials: 'include',
      signal: AbortSignal.timeout(15000),
    })
  } catch (caught) {
    throw connectionError(caught, 'Não foi possível conectar ao serviço de agenda.')
  }

  if (!response.ok) return throwResponseError(
    response,
    'Não foi possível carregar as opções de agendamento.',
    {
      403: 'Selecione uma empresa ativa para acessar a agenda.',
      404: 'Perfil profissional não encontrado nesta empresa.',
    },
  )
  return response.json() as Promise<SchedulingOptions>
}

export async function createAppointment(input: CreateAppointmentInput): Promise<CreatedAppointment> {
  let response: Response
  try {
    const csrf = await getCsrfToken()
    response = await fetch(`${apiBaseUrl}/appointments`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        [csrf.headerName]: csrf.token,
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(15000),
    })
  } catch (caught) {
    throw connectionError(caught, 'Não foi possível conectar ao serviço de agenda.')
  }

  if (!response.ok) return throwResponseError(response, 'Não foi possível criar o agendamento.')
  return response.json() as Promise<CreatedAppointment>
}

export type ListAppointmentsInput = {
  from: string
  to: string
  clinicUnitId: string
  professionalId?: string
  status?: string
}

export async function listAppointments(input: ListAppointmentsInput): Promise<AppointmentScheduleItem[]> {
  const parameters = new URLSearchParams({
    from: input.from,
    to: input.to,
    clinicUnitId: input.clinicUnitId,
  })
  if (input.professionalId) parameters.set('professionalId', input.professionalId)
  if (input.status) parameters.set('status', input.status)

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/appointments?${parameters}`, {
      credentials: 'include',
      signal: AbortSignal.timeout(15000),
    })
  } catch (caught) {
    throw connectionError(caught, 'Não foi possível conectar ao serviço de agenda.')
  }

  if (!response.ok) return throwResponseError(
    response,
    'Não foi possível carregar os próximos agendamentos.',
    {
      403: 'Selecione uma empresa ativa para acessar a agenda.',
      404: 'Perfil profissional não encontrado nesta empresa.',
    },
  )
  return response.json() as Promise<AppointmentScheduleItem[]>
}

export async function getAvailableAppointmentSlots(input: {
  clinicUnitId: string
  date: string
  durationMinutes: number
  patientId?: string
  appointmentId?: string
}): Promise<AvailableAppointmentSlot[]> {
  const parameters = new URLSearchParams({
    clinicUnitId: input.clinicUnitId,
    date: input.date,
    durationMinutes: String(input.durationMinutes),
  })
  if (input.patientId) parameters.set('patientId', input.patientId)
  if (input.appointmentId) parameters.set('appointmentId', input.appointmentId)

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/appointments/available-slots?${parameters}`, {
      credentials: 'include',
      signal: AbortSignal.timeout(15000),
    })
  } catch (caught) {
    throw connectionError(caught, 'Não foi possível consultar os horários disponíveis.')
  }

  if (!response.ok) return throwResponseError(
    response,
    'Não foi possível consultar os horários disponíveis.',
    {
      403: 'O paciente ou a unidade não está disponível para este profissional.',
      404: 'O agendamento não foi encontrado nesta empresa.',
      409: 'Somente atendimentos agendados podem ser reagendados.',
    },
  )

  const payload = await response.json() as { slots: AvailableAppointmentSlot[] }
  return payload.slots
}

export async function getProfessionalAvailability(
  professionalId: string,
  clinicUnitId: string,
): Promise<ProfessionalAvailability> {
  const now = new Date()
  const parameters = new URLSearchParams({
    clinicUnitId,
    from: now.toISOString(),
    through: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  })
  let response: Response
  try {
    response = await fetch(
      `${apiBaseUrl}/professionals/${professionalId}/availability?${parameters}`,
      { credentials: 'include', signal: AbortSignal.timeout(15000) },
    )
  } catch (caught) {
    throw connectionError(caught, 'Não foi possível conectar ao serviço de disponibilidade.')
  }

  if (!response.ok) return throwResponseError(
    response,
    'Não foi possível carregar a disponibilidade.',
    {
      403: 'Você não tem permissão para consultar a disponibilidade deste profissional.',
      404: 'O profissional ou a unidade não foi encontrado nesta empresa.',
    },
  )
  return response.json() as Promise<ProfessionalAvailability>
}

export async function setProfessionalWeeklyAvailability(
  professionalId: string,
  clinicUnitId: string,
  windows: WeeklyAvailabilityWindowInput[],
): Promise<void> {
  let response: Response
  try {
    const csrf = await getCsrfToken()
    response = await fetch(
      `${apiBaseUrl}/professionals/${professionalId}/availability/weekly`,
      {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          [csrf.headerName]: csrf.token,
        },
        body: JSON.stringify({ clinicUnitId, windows }),
        signal: AbortSignal.timeout(15000),
      },
    )
  } catch (caught) {
    throw connectionError(caught, 'Não foi possível conectar ao serviço de disponibilidade.')
  }

  if (!response.ok) return throwResponseError(
    response,
    'Não foi possível salvar a jornada semanal.',
    {
      400: 'Confira os horários. Eles devem ser válidos e não podem se sobrepor no mesmo dia.',
      403: 'Você não tem permissão para alterar a disponibilidade deste profissional.',
      404: 'O profissional ou a unidade não foi encontrado nesta empresa.',
    },
  )
}

export async function createProfessionalAvailabilityBlock(
  professionalId: string,
  input: CreateAvailabilityBlockInput,
): Promise<ProfessionalAvailabilityBlock> {
  let response: Response
  try {
    const csrf = await getCsrfToken()
    response = await fetch(
      `${apiBaseUrl}/professionals/${professionalId}/availability/blocks`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          [csrf.headerName]: csrf.token,
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(15000),
      },
    )
  } catch (caught) {
    throw connectionError(caught, 'Não foi possível conectar ao serviço de disponibilidade.')
  }

  if (!response.ok) return throwResponseError(
    response,
    'Não foi possível criar o bloqueio.',
    {
      400: 'Informe um período válido, com término posterior ao início.',
      403: 'Você não tem permissão para bloquear a disponibilidade deste profissional.',
      404: 'O profissional não foi encontrado nesta empresa.',
      409: 'Não é possível bloquear o período porque há atendimentos agendados.',
    },
  )
  return response.json() as Promise<ProfessionalAvailabilityBlock>
}

export async function deleteProfessionalAvailabilityBlock(
  professionalId: string,
  blockId: string,
): Promise<void> {
  let response: Response
  try {
    const csrf = await getCsrfToken()
    response = await fetch(
      `${apiBaseUrl}/professionals/${professionalId}/availability/blocks/${blockId}`,
      {
        method: 'DELETE',
        credentials: 'include',
        headers: { [csrf.headerName]: csrf.token },
        signal: AbortSignal.timeout(15000),
      },
    )
  } catch (caught) {
    throw connectionError(caught, 'Não foi possível conectar ao serviço de disponibilidade.')
  }

  if (!response.ok) return throwResponseError(
    response,
    'Não foi possível remover o bloqueio.',
    {
      403: 'Você não tem permissão para remover este bloqueio.',
      404: 'O bloqueio não foi encontrado nesta empresa.',
    },
  )
}

export async function getAppointment(appointmentId: string): Promise<AppointmentScheduleItem> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}/appointments/${appointmentId}`, {
      credentials: 'include',
      signal: AbortSignal.timeout(15000),
    })
  } catch (caught) {
    throw connectionError(caught, 'Não foi possível conectar ao serviço de agenda.')
  }

  if (!response.ok) return throwResponseError(
    response,
    'Não foi possível carregar os detalhes do agendamento.',
    {
      403: 'Você não tem acesso a este agendamento.',
      404: 'Agendamento não encontrado.',
    },
  )
  return response.json() as Promise<AppointmentScheduleItem>
}

export async function rescheduleAppointment(
  appointmentId: string,
  input: RescheduleAppointmentInput,
): Promise<CreatedAppointment> {
  let response: Response
  try {
    const csrf = await getCsrfToken()
    response = await fetch(`${apiBaseUrl}/appointments/${appointmentId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        [csrf.headerName]: csrf.token,
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(15000),
    })
  } catch (caught) {
    throw connectionError(caught, 'Não foi possível conectar ao serviço de agenda.')
  }

  if (!response.ok) return throwResponseError(response, 'Não foi possível reagendar o atendimento.')
  return response.json() as Promise<CreatedAppointment>
}

export async function cancelAppointment(
  appointmentId: string,
  input: CancelAppointmentInput,
): Promise<CreatedAppointment> {
  let response: Response
  try {
    const csrf = await getCsrfToken()
    response = await fetch(`${apiBaseUrl}/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        [csrf.headerName]: csrf.token,
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(15000),
    })
  } catch (caught) {
    throw connectionError(caught, 'Não foi possível conectar ao serviço de agenda.')
  }

  if (!response.ok) return throwResponseError(response, 'Não foi possível cancelar o atendimento.', {
    409: 'Somente atendimentos ainda agendados podem ser cancelados.',
  })
  return response.json() as Promise<CreatedAppointment>
}

export async function completeAppointment(appointmentId: string): Promise<CreatedAppointment> {
  return postAppointmentAction(appointmentId, 'complete')
}

export async function markAppointmentNoShow(
  appointmentId: string,
  input: CancelAppointmentInput,
): Promise<CreatedAppointment> {
  return postAppointmentAction(appointmentId, 'no-show', input)
}

async function postAppointmentAction(
  appointmentId: string,
  action: 'complete' | 'no-show',
  input?: unknown,
): Promise<CreatedAppointment> {
  let response: Response
  try {
    const csrf = await getCsrfToken()
    response = await fetch(`${apiBaseUrl}/appointments/${appointmentId}/${action}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        [csrf.headerName]: csrf.token,
      },
      body: input ? JSON.stringify(input) : undefined,
      signal: AbortSignal.timeout(15000),
    })
  } catch (caught) {
    throw connectionError(caught, 'Não foi possível conectar ao serviço de agenda.')
  }

  if (!response.ok) return throwResponseError(response, 'Não foi possível atualizar o atendimento.', {
    409: 'Esta ação só está disponível após o início de um atendimento ainda agendado.',
  })
  return response.json() as Promise<CreatedAppointment>
}

async function getCsrfToken(): Promise<{ token: string; headerName: string }> {
  const response = await fetch(`${apiBaseUrl}/auth/csrf-token`, {
    credentials: 'include',
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) return throwResponseError(response, 'Não foi possível preparar a solicitação segura.')

  const payload = await response.json() as { token?: string; headerName?: string }
  if (!payload.token || !payload.headerName) {
    throw new Error('Não foi possível preparar a solicitação segura. Tente novamente.')
  }
  return { token: payload.token, headerName: payload.headerName }
}

async function throwResponseError(
  response: Response,
  fallback: string,
  statusMessages: Partial<Record<number, string>> = {},
): Promise<never> {
  const problem = await response.json().catch(() => null) as ProblemDetails | null
  const message = statusMessages[response.status] ?? (response.status === 401
    ? 'Sua sessão expirou. Entre novamente para continuar.'
    : response.status === 403
      ? 'O paciente ou a unidade não está disponível para este profissional.'
      : response.status === 404
        ? 'O perfil profissional ou agendamento não foi encontrado nesta empresa.'
        : response.status === 409
          ? 'Esse horário conflita com outro atendimento. Escolha outro horário.'
          : response.status === 422
              ? problem?.detail ?? problem?.title ?? fallback
            : response.status === 400
              ? problem?.detail ?? 'Confira os dados informados e tente novamente.'
              : problem?.detail ?? problem?.title ?? fallback
  )
  throw new Error(message)
}

function connectionError(caught: unknown, fallback: string): Error {
  if (caught instanceof DOMException && caught.name === 'TimeoutError') {
    return new Error('A solicitação demorou mais que o esperado. Tente novamente.')
  }
  if (caught instanceof TypeError) return new Error(`${fallback} Verifique sua conexão e tente novamente.`)
  if (caught instanceof Error && caught.message) return caught
  return new Error(fallback)
}
