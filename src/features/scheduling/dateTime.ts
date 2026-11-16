type LocalDateTimeParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

export type AgendaView = 'day' | 'week' | 'month' | 'list'

export type AgendaDateRange = {
  fromDate: string
  toExclusiveDate: string
}

const formatters = new Map<string, Intl.DateTimeFormat>()

export function localDateTimeToOffsetIso(
  value: string,
  timeZone: string,
  disambiguation: 'reject' | 'compatible' = 'reject',
): string {
  let parts = parseLocalDateTime(value)
  const formatter = getFormatter(timeZone)
  let possibleInstants = findPossibleInstants(parts, formatter)

  if (possibleInstants.length === 0 && disambiguation === 'compatible') {
    const targetWallTime = wallClockMilliseconds(parts, 0)
    for (let minute = 1; minute <= 1560 && possibleInstants.length === 0; minute += 1) {
      parts = readUtcParts(targetWallTime + minute * 60 * 1000)
      possibleInstants = findPossibleInstants(parts, formatter)
    }
  }

  if (possibleInstants.length === 0) {
    throw new Error('Esse horário não existe no fuso da unidade por causa da mudança de horário local.')
  }
  if (possibleInstants.length > 1 && disambiguation === 'reject') {
    throw new Error('Esse horário ocorre duas vezes no fuso da unidade. Escolha outro horário.')
  }

  const instant = Math.min(...possibleInstants)
  const offsetMilliseconds = wallClockMilliseconds(readParts(formatter, instant), 0) - instant
  const offsetMinutes = Math.round(offsetMilliseconds / 60000)
  const sign = offsetMinutes < 0 ? '-' : '+'
  const absoluteOffset = Math.abs(offsetMinutes)
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, '0')
  const offsetRemainder = String(absoluteOffset % 60).padStart(2, '0')
  const wallTime = [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-') + `T${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}:00`

  return `${wallTime}${sign}${offsetHours}:${offsetRemainder}`
}

export function getTodayInTimeZone(timeZone: string, now = new Date()): string {
  const formatter = getFormatter(timeZone)
  const parts = readParts(formatter, now.getTime())
  return formatLocalDate(parts)
}

export function getAgendaDateRange(view: AgendaView, date: string): AgendaDateRange {
  const selected = parseLocalDate(date)
  if (view === 'day') {
    return { fromDate: date, toExclusiveDate: addDays(date, 1) }
  }
  if (view === 'month') {
    const firstDay = formatLocalDate({ ...selected, day: 1 })
    const nextMonth = new Date(Date.UTC(selected.year, selected.month, 1))
    return {
      fromDate: firstDay,
      toExclusiveDate: formatLocalDate({
        ...selected,
        year: nextMonth.getUTCFullYear(),
        month: nextMonth.getUTCMonth() + 1,
        day: 1,
      }),
    }
  }

  const weekday = new Date(Date.UTC(selected.year, selected.month - 1, selected.day)).getUTCDay()
  const daysSinceMonday = (weekday + 6) % 7
  const fromDate = addDays(date, -daysSinceMonday)
  return { fromDate, toExclusiveDate: addDays(fromDate, 7) }
}

export function getAgendaDates(fromDate: string, toExclusiveDate: string): string[] {
  const dates: string[] = []
  for (let date = fromDate; date < toExclusiveDate; date = addDays(date, 1)) {
    dates.push(date)
  }
  return dates
}

export function getAgendaMonthDates(date: string): string[] {
  const selected = parseLocalDate(date)
  const firstDay = formatLocalDate({ ...selected, day: 1 })
  const firstWeekday = new Date(Date.UTC(selected.year, selected.month - 1, 1)).getUTCDay()
  const daysBefore = (firstWeekday + 6) % 7
  const daysInMonth = new Date(Date.UTC(selected.year, selected.month, 0)).getUTCDate()
  const cellCount = Math.ceil((daysBefore + daysInMonth) / 7) * 7
  const gridStart = addDays(firstDay, -daysBefore)
  return getAgendaDates(gridStart, addDays(gridStart, cellCount))
}

export function shiftAgendaDate(view: AgendaView, date: string, direction: -1 | 1): string {
  if (view === 'day') return addDays(date, direction)
  if (view === 'week' || view === 'list') return addDays(date, direction * 7)

  const selected = parseLocalDate(date)
  const nextMonth = new Date(Date.UTC(selected.year, selected.month - 1 + direction, 1))
  const lastDay = new Date(Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0)).getUTCDate()
  return formatLocalDate({
    ...selected,
    year: nextMonth.getUTCFullYear(),
    month: nextMonth.getUTCMonth() + 1,
    day: Math.min(selected.day, lastDay),
  })
}

export function formatAgendaDate(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`))
}

export function formatAppointmentTimeRange(startsAt: string, endsAt: string, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
  return `${formatter.format(new Date(startsAt))}–${formatter.format(new Date(endsAt))}`
}

export function getAppointmentDate(startsAt: string, timeZone: string): string {
  return getTodayInTimeZone(timeZone, new Date(startsAt))
}

export function addMinutesToLocalDateTime(value: string, minutes: number): string {
  const parts = parseLocalDateTime(value)
  const wallTime = wallClockMilliseconds(parts, 0) + minutes * 60 * 1000
  const date = new Date(wallTime)
  const year = String(date.getUTCFullYear()).padStart(4, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hour = String(date.getUTCHours()).padStart(2, '0')
  const minute = String(date.getUTCMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

function findPossibleInstants(parts: LocalDateTimeParts, formatter: Intl.DateTimeFormat): number[] {
  const targetWallTime = wallClockMilliseconds(parts, 0)
  const possibleInstants = new Set<number>()

  for (let hours = -48; hours <= 48; hours += 3) {
    const sampleInstant = targetWallTime + hours * 60 * 60 * 1000
    const sampleParts = readParts(formatter, sampleInstant)
    const offsetMilliseconds = wallClockMilliseconds(sampleParts, 0) - sampleInstant
    const candidate = targetWallTime - offsetMilliseconds
    if (sameWallTime(readParts(formatter, candidate), parts)) {
      possibleInstants.add(candidate)
    }
  }

  return [...possibleInstants]
}

function parseLocalDateTime(value: string): LocalDateTimeParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new Error('Informe uma data e horário válidos.')

  const [, yearText, monthText, dayText, hourText, minuteText] = match
  const parts = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
  }
  const date = new Date(wallClockMilliseconds(parts, 0))
  if (
    date.getUTCFullYear() !== parts.year ||
    date.getUTCMonth() + 1 !== parts.month ||
    date.getUTCDate() !== parts.day ||
    parts.hour > 23 ||
    parts.minute > 59
  ) {
    throw new Error('Informe uma data e horário válidos.')
  }
  return parts
}

function parseLocalDate(value: string): Pick<LocalDateTimeParts, 'year' | 'month' | 'day'> {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new Error('Informe uma data válida.')
  const [, yearText, monthText, dayText] = match
  const parts = { year: Number(yearText), month: Number(monthText), day: Number(dayText) }
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  if (
    date.getUTCFullYear() !== parts.year ||
    date.getUTCMonth() + 1 !== parts.month ||
    date.getUTCDate() !== parts.day
  ) {
    throw new Error('Informe uma data válida.')
  }
  return parts
}

function readUtcParts(instant: number): LocalDateTimeParts {
  const date = new Date(instant)
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
  }
}

function addDays(value: string, days: number): string {
  const parts = parseLocalDate(value)
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
  return formatLocalDate({
    ...parts,
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  })
}

function formatLocalDate(parts: Pick<LocalDateTimeParts, 'year' | 'month' | 'day'>): string {
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-')
}

function getFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone)
  if (cached) return cached

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      calendar: 'gregory',
      numberingSystem: 'latn',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
    formatters.set(timeZone, formatter)
    return formatter
  } catch {
    throw new Error('O fuso horário informado para esta unidade não é válido.')
  }
}

function readParts(formatter: Intl.DateTimeFormat, instant: number): LocalDateTimeParts {
  const values = new Map(formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]))
  return {
    year: Number(values.get('year')),
    month: Number(values.get('month')),
    day: Number(values.get('day')),
    hour: Number(values.get('hour')),
    minute: Number(values.get('minute')),
  }
}

function wallClockMilliseconds(parts: LocalDateTimeParts, seconds: number): number {
  const date = new Date(0)
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day)
  date.setUTCHours(parts.hour, parts.minute, seconds, 0)
  return date.getTime()
}

function sameWallTime(left: LocalDateTimeParts, right: LocalDateTimeParts): boolean {
  return left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
}
