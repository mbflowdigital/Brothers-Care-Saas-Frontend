import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'
import { addMinutesToLocalDateTime, getTodayInTimeZone, localDateTimeToOffsetIso, offsetIsoToLocalDateTime } from './dateTime'
import { getSchedulingOptions, rescheduleAppointment, type AppointmentScheduleItem, type SchedulingOptions } from './schedulingApi'

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const TIME_SLOTS = Array.from({ length: 28 }, (_, index) => {
  const totalMinutes = 7 * 60 + index * 30
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
})

export function RescheduleAppointmentForm({ appointment, onCompleted, onCancel }: {
  appointment: AppointmentScheduleItem
  onCompleted: () => void
  onCancel: () => void
}) {
  const initialLocalDateTime = offsetIsoToLocalDateTime(appointment.startsAt, appointment.timeZoneId)
  const [options, setOptions] = useState<SchedulingOptions | null>(null)
  const [unitId, setUnitId] = useState(appointment.clinicUnitId)
  const [selectedDate, setSelectedDate] = useState(initialLocalDateTime.slice(0, 10))
  const [selectedTime, setSelectedTime] = useState(initialLocalDateTime.slice(11, 16))
  const [visibleMonth, setVisibleMonth] = useState(`${initialLocalDateTime.slice(0, 7)}-01`)
  const [durationMinutes, setDurationMinutes] = useState(() => Math.round((Date.parse(appointment.endsAt) - Date.parse(appointment.startsAt)) / 60000))
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getSchedulingOptions()
      .then((result) => {
        if (!active) return
        setOptions(result)
        if (!result.clinicUnits.some((unit) => unit.id === appointment.clinicUnitId)) setUnitId(result.clinicUnits[0]?.id ?? '')
      })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Não foi possível carregar as unidades disponíveis.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [appointment.clinicUnitId])

  const selectedUnit = options?.clinicUnits.find((unit) => unit.id === unitId)
  const timeZoneId = selectedUnit?.timeZoneId ?? appointment.timeZoneId
  const today = getTodayInTimeZone(timeZoneId)
  const dates = useMemo(() => getMonthDates(visibleMonth), [visibleMonth])
  const durationOptions = [...new Set([30, 45, 60, 90, 120, durationMinutes])].sort((left, right) => left - right)
  const endPreview = selectedDate && selectedTime ? addMinutesToLocalDateTime(`${selectedDate}T${selectedTime}`, durationMinutes).slice(11, 16) : ''

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!selectedUnit || !selectedDate || !selectedTime) {
      setError('Selecione unidade, dia e horário para continuar.')
      return
    }

    try {
      const localStartsAt = `${selectedDate}T${selectedTime}`
      const localEndsAt = addMinutesToLocalDateTime(localStartsAt, durationMinutes)
      const startsAt = localDateTimeToOffsetIso(localStartsAt, selectedUnit.timeZoneId)
      const endsAt = localDateTimeToOffsetIso(localEndsAt, selectedUnit.timeZoneId)
      if (Date.parse(startsAt) < Date.now()) {
        setError('Escolha um horário futuro para reagendar.')
        return
      }
      setSubmitting(true)
      await rescheduleAppointment(appointment.id, { clinicUnitId: selectedUnit.id, startsAt, endsAt })
      onCompleted()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível reagendar o atendimento.')
    } finally {
      setSubmitting(false)
    }
  }

  return <form className="appointment-reschedule-form" onSubmit={submit} aria-busy={loading || submitting}>
    <div className="appointment-reschedule-title"><CalendarClock /><div><strong>Reagendar atendimento</strong><small>Escolha um novo dia e horário para esta sessão.</small></div></div>
    {loading
      ? <p className="modal-copy">Carregando opções disponíveis…</p>
      : <>
        <div className="field">
          <label htmlFor="reschedule-unit">Unidade <b>*</b></label>
          <select id="reschedule-unit" value={unitId} onChange={(event) => setUnitId(event.target.value)} required>
            <option value="" disabled>Selecione uma unidade</option>
            {options?.clinicUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
          </select>
        </div>
        <div className="reschedule-picker">
          <section className="reschedule-calendar" aria-label="Selecione o dia">
            <div className="reschedule-calendar-header">
              <button type="button" className="icon-button" aria-label="Mês anterior" onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}><ChevronLeft /></button>
              <strong>{formatMonth(visibleMonth)}</strong>
              <button type="button" className="icon-button" aria-label="Próximo mês" onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}><ChevronRight /></button>
            </div>
            <div className="reschedule-weekdays">{WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}</div>
            <div className="reschedule-days">
              {dates.map((date) => <button key={date} type="button" className={`${date === selectedDate ? 'selected' : ''} ${date.slice(0, 7) !== visibleMonth.slice(0, 7) ? 'outside' : ''}`} onClick={() => setSelectedDate(date)} disabled={date < today} aria-pressed={date === selectedDate}>{Number(date.slice(-2))}</button>)}
            </div>
          </section>
          <section className="reschedule-time" aria-label="Selecione o horário">
            <div className="reschedule-time-heading"><Clock3 /><div><strong>Horário</strong><small>{selectedDate ? formatShortDate(selectedDate) : 'Selecione um dia'}</small></div></div>
            <div className="reschedule-time-slots">{TIME_SLOTS.map((time) => <button key={time} type="button" className={time === selectedTime ? 'selected' : ''} onClick={() => setSelectedTime(time)}>{time}</button>)}</div>
            <label className="reschedule-duration"><span>Duração</span><select value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value))}>{durationOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}</select></label>
            {endPreview && <p className="reschedule-summary">Novo horário: <strong>{selectedTime} – {endPreview}</strong></p>}
          </section>
        </div>
      </>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="appointment-reschedule-actions"><button type="button" className="button button-outline" onClick={onCancel} disabled={submitting}>Voltar</button><button type="submit" className="button button-primary" disabled={loading || submitting || !selectedUnit}>{submitting ? 'Reagendando…' : 'Confirmar reagendamento'}</button></div>
  </form>
}

function getMonthDates(month: string): string[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(Date.UTC(year, monthNumber - 1, 1))
  const daysBefore = (first.getUTCDay() + 6) % 7
  const start = new Date(Date.UTC(year, monthNumber - 1, 1 - daysBefore))
  return Array.from({ length: 42 }, (_, index) => toDateInputValue(new Date(start.getTime() + index * 86400000)))
}

function shiftMonth(month: string, amount: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  return toDateInputValue(new Date(Date.UTC(year, monthNumber - 1 + amount, 1))).slice(0, 8) + '01'
}

function toDateInputValue(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function formatMonth(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}
