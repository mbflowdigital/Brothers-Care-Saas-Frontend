import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, FileText, MapPin, Stethoscope, UserRound, X } from 'lucide-react'
import { getPatientRegistrationOptions } from '../patients/patientApi'
import { CancelAppointmentForm } from './CancelAppointmentForm'
import { RescheduleAppointmentForm } from './RescheduleAppointmentForm'
import './scheduling.css'
import {
  formatAgendaDate,
  formatAppointmentTimeRange,
  getAgendaDateRange,
  getAgendaDates,
  getAgendaMonthDates,
  getAppointmentDate,
  getTodayInTimeZone,
  localDateTimeToOffsetIso,
  shiftAgendaDate,
  type AgendaView,
} from './dateTime'
import { getAppointment, getSchedulingOptions, listAppointments, type AppointmentScheduleItem } from './schedulingApi'

type AgendaViewerRole = 'professional' | 'clinicAdministrator' | 'unsupported'
type AgendaUnit = { id: string; name: string; timeZoneId: string }
type AgendaProfessional = { id: string; name: string; specialty: string }

const viewLabels: Record<AgendaView, string> = {
  day: 'Dia',
  week: 'Semana',
  month: 'Mês',
  list: 'Lista',
}

const statusLabels: Record<string, string> = {
  Scheduled: 'Agendado',
  Completed: 'Realizado',
  NoShow: 'Falta',
  Cancelled: 'Cancelado',
}

export function AppointmentAgendaPage({
  viewerRole,
  appointmentsRevision,
}: {
  viewerRole: AgendaViewerRole
  appointmentsRevision: number
}) {
  const [units, setUnits] = useState<AgendaUnit[]>([])
  const [professionals, setProfessionals] = useState<AgendaProfessional[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState('')
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [view, setView] = useState<AgendaView>('week')
  const [status, setStatus] = useState('')
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [optionsError, setOptionsError] = useState('')
  const [optionsRetry, setOptionsRetry] = useState(0)
  const [appointments, setAppointments] = useState<AppointmentScheduleItem[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(false)
  const [appointmentsError, setAppointmentsError] = useState('')
  const [appointmentsRetry, setAppointmentsRetry] = useState(0)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentScheduleItem | null>(null)

  useEffect(() => {
    let active = true
    setOptionsLoading(true)
    setOptionsError('')

    if (viewerRole === 'unsupported') {
      setOptionsLoading(false)
      return () => { active = false }
    }

    const loadOptions = viewerRole === 'professional'
      ? getSchedulingOptions().then((result) => ({
        units: result.clinicUnits,
        professionals: [],
      }))
      : getPatientRegistrationOptions().then((result) => ({
        units: result.clinicUnits,
        professionals: result.professionals,
      }))

    loadOptions
      .then((result) => {
        if (!active) return
        setUnits(result.units)
        setProfessionals(result.professionals)
        setSelectedUnitId((current) =>
          result.units.some((unit) => unit.id === current) ? current : result.units[0]?.id ?? '')
        setSelectedDate((current) =>
          current || (result.units[0] ? getTodayInTimeZone(result.units[0].timeZoneId) : ''))
      })
      .catch((caught: unknown) => {
        if (active) setOptionsError(caught instanceof Error ? caught.message : 'Não foi possível carregar as opções da agenda.')
      })
      .finally(() => {
        if (active) setOptionsLoading(false)
      })

    return () => { active = false }
  }, [viewerRole, optionsRetry])

  const selectedUnit = units.find((unit) => unit.id === selectedUnitId)
  const range = useMemo(
    () => selectedDate ? getAgendaDateRange(view, selectedDate) : null,
    [selectedDate, view],
  )

  useEffect(() => {
    const unit = selectedUnit
    const dateRange = range
    if (!unit || !dateRange || viewerRole === 'unsupported') return
    const activeUnit: AgendaUnit = unit
    const activeRange = dateRange

    let active = true
    setAppointmentsLoading(true)
    setAppointmentsError('')

    async function loadAppointments() {
      try {
        const from = localDateTimeToOffsetIso(
          `${activeRange.fromDate}T00:00`,
          activeUnit.timeZoneId,
          'compatible',
        )
        const to = localDateTimeToOffsetIso(
          `${activeRange.toExclusiveDate}T00:00`,
          activeUnit.timeZoneId,
          'compatible',
        )
        const results = await listAppointments({
          from,
          to,
          clinicUnitId: activeUnit.id,
          professionalId: viewerRole === 'clinicAdministrator' ? selectedProfessionalId || undefined : undefined,
          status: status || undefined,
        })
        if (!active) return
        const fromMilliseconds = Date.parse(from)
        const toMilliseconds = Date.parse(to)
        setAppointments(results.filter((appointment) => {
          const startsAt = Date.parse(appointment.startsAt)
          return startsAt >= fromMilliseconds && startsAt < toMilliseconds
        }))
      } catch (caught: unknown) {
        if (active) setAppointmentsError(caught instanceof Error ? caught.message : 'Não foi possível carregar os agendamentos.')
      } finally {
        if (active) setAppointmentsLoading(false)
      }
    }

    void loadAppointments()
    return () => { active = false }
  }, [
    appointmentsRevision,
    appointmentsRetry,
    range,
    selectedProfessionalId,
    selectedUnit,
    status,
    viewerRole,
  ])

  if (viewerRole === 'unsupported') {
    return <div className="card empty-state" role="status">
      <CalendarDays />
      <h3>Acesso à agenda indisponível</h3>
      <p>Esta agenda está disponível para administradores da clínica e para o próprio profissional.</p>
    </div>
  }

  if (optionsLoading) return <div className="card empty-state" role="status">Carregando unidades e profissionais…</div>
  if (optionsError) {
    return <div className="card empty-state" role="alert">
      <p>{optionsError}</p>
      <button className="button button-outline" onClick={() => setOptionsRetry((value) => value + 1)}>Tentar novamente</button>
    </div>
  }
  if (units.length === 0) {
    return <div className="card empty-state">
      <CalendarDays />
      <h3>Nenhuma unidade disponível</h3>
      <p>Não há unidades ativas vinculadas ao seu acesso nesta empresa.</p>
    </div>
  }

  const visibleDates = view === 'month' && selectedDate
    ? getAgendaMonthDates(selectedDate)
    : range ? getAgendaDates(range.fromDate, range.toExclusiveDate) : []
  const appointmentsByDate = new Map<string, AppointmentScheduleItem[]>()
  for (const appointment of appointments) {
    const date = getAppointmentDate(appointment.startsAt, selectedUnit?.timeZoneId ?? appointment.timeZoneId)
    const items = appointmentsByDate.get(date) ?? []
    items.push(appointment)
    appointmentsByDate.set(date, items)
  }

  function changeUnit(unitId: string) {
    const unit = units.find((item) => item.id === unitId)
    setSelectedUnitId(unitId)
    if (unit) setSelectedDate(getTodayInTimeZone(unit.timeZoneId))
  }

  return <section className="agenda-page" aria-label="Agenda de atendimentos">
    <div className="agenda-toolbar card">
      <div className="agenda-date-navigation">
        <button
          className="icon-button"
          aria-label="Período anterior"
          onClick={() => setSelectedDate((date) => shiftAgendaDate(view, date, -1))}
        ><ChevronLeft /></button>
        <strong>{range && formatRangeLabel(view, selectedDate, range.fromDate, range.toExclusiveDate)}</strong>
        <button
          className="icon-button"
          aria-label="Próximo período"
          onClick={() => setSelectedDate((date) => shiftAgendaDate(view, date, 1))}
        ><ChevronRight /></button>
        <button
          className="button button-outline"
          onClick={() => selectedUnit && setSelectedDate(getTodayInTimeZone(selectedUnit.timeZoneId))}
        >Hoje</button>
      </div>
      <div className="agenda-filters">
        <label>
          <span>Unidade</span>
          <select value={selectedUnitId} onChange={(event) => changeUnit(event.target.value)}>
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select>
        </label>
        {viewerRole === 'clinicAdministrator' && <label>
          <span>Profissional</span>
          <select value={selectedProfessionalId} onChange={(event) => setSelectedProfessionalId(event.target.value)}>
            <option value="">Todos os profissionais</option>
            {professionals.map((professional) => <option key={professional.id} value={professional.id}>
              {professional.name} · {professional.specialty}
            </option>)}
          </select>
        </label>}
        <label>
          <span>Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="agenda-view-tabs" role="group" aria-label="Visualização da agenda">
          {(Object.keys(viewLabels) as AgendaView[]).map((item) => <button
            type="button"
            className={view === item ? 'active' : ''}
            key={item}
            aria-pressed={view === item}
            onClick={() => setView(item)}
          >{viewLabels[item]}</button>)}
        </div>
      </div>
      {selectedUnit && <small className="agenda-timezone">Horários no fuso {selectedUnit.timeZoneId}</small>}
    </div>

    {appointmentsLoading
      ? <div className="card empty-state" role="status">Carregando agendamentos…</div>
      : appointmentsError
        ? <div className="card empty-state" role="alert">
          <p>{appointmentsError}</p>
          <button className="button button-outline" onClick={() => setAppointmentsRetry((value) => value + 1)}>Tentar novamente</button>
        </div>
        : view === 'month'
          ? <MonthCalendar
            dates={visibleDates}
            selectedDate={selectedDate}
            appointmentsByDate={appointmentsByDate}
            timeZoneId={selectedUnit?.timeZoneId ?? 'UTC'}
            showProfessional={viewerRole === 'clinicAdministrator'}
            onSelect={setSelectedAppointment}
          />
          : view === 'list'
            ? <ListCalendar
              dates={range ? getAgendaDates(range.fromDate, range.toExclusiveDate) : []}
              appointmentsByDate={appointmentsByDate}
              timeZoneId={selectedUnit?.timeZoneId ?? 'UTC'}
              showProfessional={viewerRole === 'clinicAdministrator'}
              onSelect={setSelectedAppointment}
            />
            : <div className={`agenda-day-grid ${view === 'day' ? 'single-day' : ''}`}>
              {visibleDates.map((date) => <DayColumn
                key={date}
                date={date}
                appointments={appointmentsByDate.get(date) ?? []}
                timeZoneId={selectedUnit?.timeZoneId ?? 'UTC'}
                showProfessional={viewerRole === 'clinicAdministrator'}
                onSelect={setSelectedAppointment}
              />)}
            </div>}
    {selectedAppointment && <AppointmentDetailsDialog
      appointment={selectedAppointment}
      canManageAppointment={viewerRole === 'professional'}
      onClose={() => setSelectedAppointment(null)}
      onChanged={() => {
        setSelectedAppointment(null)
        setAppointmentsRetry((value) => value + 1)
      }}
    />}
  </section>
}

function MonthCalendar({
  dates,
  selectedDate,
  appointmentsByDate,
  timeZoneId,
  showProfessional,
  onSelect,
}: {
  dates: string[]
  selectedDate: string
  appointmentsByDate: Map<string, AppointmentScheduleItem[]>
  timeZoneId: string
  showProfessional: boolean
  onSelect: (appointment: AppointmentScheduleItem) => void
}) {
  return <div className="agenda-month card">
    <div className="agenda-month-weekdays">
      {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => <span key={day}>{day}</span>)}
    </div>
    <div className="agenda-month-grid">
      {dates.map((date) => {
        const isCurrentMonth = date.slice(0, 7) === selectedDate.slice(0, 7)
        const items = appointmentsByDate.get(date) ?? []
        return <div className={`agenda-month-day ${isCurrentMonth ? '' : 'outside-month'}`} key={date}>
          <strong>{formatAgendaDate(date, { day: 'numeric' })}</strong>
          {items.slice(0, 2).map((appointment) => <AgendaAppointment
            key={appointment.id}
            appointment={appointment}
            timeZoneId={timeZoneId}
            showProfessional={showProfessional}
            compact
            onSelect={onSelect}
          />)}
          {items.length > 2 && <small className="agenda-more">+{items.length - 2} atendimentos</small>}
        </div>
      })}
    </div>
  </div>
}

function ListCalendar({
  dates,
  appointmentsByDate,
  timeZoneId,
  showProfessional,
  onSelect,
}: {
  dates: string[]
  appointmentsByDate: Map<string, AppointmentScheduleItem[]>
  timeZoneId: string
  showProfessional: boolean
  onSelect: (appointment: AppointmentScheduleItem) => void
}) {
  const hasAppointments = dates.some((date) => (appointmentsByDate.get(date)?.length ?? 0) > 0)
  if (!hasAppointments) return <div className="card empty-state"><p>Nenhum agendamento neste período.</p></div>
  return <div className="agenda-list">
    {dates.map((date) => {
      const items = appointmentsByDate.get(date) ?? []
      if (items.length === 0) return null
      return <section className="agenda-list-day card" key={date}>
        <h3>{formatAgendaDate(date, { weekday: 'long', day: '2-digit', month: 'long' })}</h3>
        {items.map((appointment) => <AgendaAppointment
          key={appointment.id}
          appointment={appointment}
          timeZoneId={timeZoneId}
          showProfessional={showProfessional}
          onSelect={onSelect}
        />)}
      </section>
    })}
  </div>
}

function DayColumn({
  date,
  appointments,
  timeZoneId,
  showProfessional,
  onSelect,
}: {
  date: string
  appointments: AppointmentScheduleItem[]
  timeZoneId: string
  showProfessional: boolean
  onSelect: (appointment: AppointmentScheduleItem) => void
}) {
  return <section className="agenda-day-column card">
    <h3>{formatAgendaDate(date, { weekday: 'short', day: '2-digit', month: '2-digit' })}</h3>
    {appointments.length === 0
      ? <p className="agenda-day-empty">Sem atendimentos</p>
      : appointments.map((appointment) => <AgendaAppointment
        key={appointment.id}
        appointment={appointment}
        timeZoneId={timeZoneId}
        showProfessional={showProfessional}
        onSelect={onSelect}
      />)}
  </section>
}

function AgendaAppointment({
  appointment,
  timeZoneId,
  showProfessional,
  compact = false,
  onSelect,
}: {
  appointment: AppointmentScheduleItem
  timeZoneId: string
  showProfessional: boolean
  compact?: boolean
  onSelect: (appointment: AppointmentScheduleItem) => void
}) {
  const statusLabel = statusLabels[appointment.status] ?? appointment.status
  return <button
    type="button"
    className={`agenda-appointment ${compact ? 'compact' : ''}`}
    onClick={() => onSelect(appointment)}
    aria-label={`Ver agendamento de ${appointment.patientName}`}
  >
    <time>{formatAppointmentTimeRange(appointment.startsAt, appointment.endsAt, timeZoneId)}</time>
    <strong>{appointment.patientName}</strong>
    {showProfessional && <span>{appointment.professionalName}</span>}
    {!compact && <span>{appointment.clinicUnitName}</span>}
    <small className={`agenda-status status-${appointment.status.toLowerCase()}`}>{statusLabel}</small>
  </button>
}

function AppointmentDetailsDialog({
  appointment: initialAppointment,
  canManageAppointment,
  onClose,
  onChanged,
}: {
  appointment: AppointmentScheduleItem
  canManageAppointment: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const [appointment, setAppointment] = useState(initialAppointment)
  const [error, setError] = useState('')
  const [rescheduling, setRescheduling] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    let active = true
    getAppointment(initialAppointment.id)
      .then((result) => { if (active) setAppointment(result) })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Não foi possível atualizar os detalhes.')
      })
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      active = false
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [initialAppointment.id, onClose])

  const timeZoneId = appointment.timeZoneId || 'UTC'
  const statusLabel = statusLabels[appointment.status] ?? appointment.status
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <section className="modal appointment-details-modal" role="dialog" aria-modal="true" aria-labelledby="appointment-details-title">
      <header className="modal-head">
        <div>
          <small>Detalhes do atendimento</small>
          <h2 id="appointment-details-title">{appointment.patientName}</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar detalhes"><X /></button>
      </header>
      <div className="modal-body appointment-details-body">
        {error && <p className="appointment-details-warning" role="alert">{error}</p>}
        <div className="appointment-details-highlight">
          <CalendarDays />
          <div>
            <strong>{formatDateTime(appointment.startsAt, timeZoneId)}</strong>
            <span>{formatAppointmentTimeRange(appointment.startsAt, appointment.endsAt, timeZoneId)}</span>
          </div>
          <small className={`agenda-status status-${appointment.status.toLowerCase()}`}>{statusLabel}</small>
        </div>
        <dl className="appointment-details-grid">
          <div><dt><UserRound />Paciente</dt><dd>{appointment.patientName}</dd></div>
          <div><dt><Stethoscope />Profissional</dt><dd>{appointment.professionalName}</dd></div>
          <div><dt><MapPin />Unidade</dt><dd>{appointment.clinicUnitName}</dd></div>
          <div><dt><Clock3 />Duração</dt><dd>{appointment.durationMinutes} minutos</dd></div>
          <div className="appointment-details-notes"><dt><FileText />Observações</dt><dd>{appointment.notes || 'Nenhuma observação registrada.'}</dd></div>
        </dl>
        {canManageAppointment && appointment.status === 'Scheduled' && (rescheduling
          ? <RescheduleAppointmentForm
            appointment={appointment}
            onCompleted={onChanged}
            onCancel={() => setRescheduling(false)}
          />
          : cancelling
            ? <CancelAppointmentForm
              appointment={appointment}
              onCompleted={onChanged}
              onCancel={() => setCancelling(false)}
            />
          : <div className="appointment-details-actions">
            <button type="button" className="button button-outline" onClick={() => setRescheduling(true)}>Reagendar</button>
            <button type="button" className="button button-danger" onClick={() => setCancelling(true)}>Cancelar</button>
          </div>)}
      </div>
    </section>
  </div>
}

function formatDateTime(value: string, timeZoneId: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: timeZoneId,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function formatRangeLabel(view: AgendaView, selectedDate: string, fromDate: string, toExclusiveDate: string): string {
  if (view === 'day') {
    return formatAgendaDate(selectedDate, { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  }
  if (view === 'month') return formatAgendaDate(selectedDate, { month: 'long', year: 'numeric' })
  const lastDate = shiftAgendaDate('day', toExclusiveDate, -1)
  return `${formatAgendaDate(fromDate, { day: '2-digit', month: 'short' })} — ${formatAgendaDate(lastDate, { day: '2-digit', month: 'short', year: 'numeric' })}`
}
