import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { patientApi } from '../../api/client'
import {
  PngIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../../components/common/Icons'

import searchIcon from '../../assets/icons/search.png'
import scheduleIcon from '../../assets/icons/schedule.png'

import ProfileStyle from '../../assets/styles/profile.module.css'
import ScheduleStyle from '../../assets/styles/schedule.module.css'
import SidebarStyle from '../../assets/styles/sidebar.module.css'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const VIEWS = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'agenda', label: 'Agenda' },
]

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()
const fmt = (d, options) => d.toLocaleDateString('en-US', options)

const TODAY = startOfDay(new Date())

// API appointment -> calendar event
const toEvent = (a) => {
  const at = new Date(a.date)
  return {
    id: a.id,
    at,
    date: startOfDay(at),
    time: at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    title: a.reason,
    doctor: a.doctor || 'Doctor to be assigned',
    type: a.type,
  }
}

const buildWeeks = (cursor, view) => {
  if (view === 'week') {
    const start = addDays(cursor, -cursor.getDay())
    return [Array.from({ length: 7 }, (_, i) => addDays(start, i))]
  }
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
  const start = addDays(first, -first.getDay())
  const rows = Math.ceil((first.getDay() + last.getDate()) / 7)
  return Array.from({ length: rows }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d))
  )
}

const Schedule = () => {
  const navigate = useNavigate()
  const { token } = useOutletContext()
  const [view, setView] = useState('month')
  const [cursor, setCursor] = useState(TODAY)
  const [search, setSearch] = useState('')
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')

  // Only scheduled visits belong on the calendar; past/cancelled ones live in history
  useEffect(() => {
    let cancelled = false
    patientApi
      .appointments(token, { status: 'Scheduled', order: 'oldest' })
      .then(({ appointments }) => !cancelled && setEvents(appointments.map(toEvent)))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [token])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return events.filter(
      (a) => !q || a.title.toLowerCase().includes(q) || a.doctor.toLowerCase().includes(q)
    )
  }, [events, search])

  const now = new Date()
  const upcoming = visible.filter((a) => a.at >= now).sort((a, b) => a.at - b.at)
  const weeks = buildWeeks(cursor, view)

  const title =
    view === 'week'
      ? `${fmt(weeks[0][0], { month: 'short', day: 'numeric' })} – ${fmt(weeks[0][6], { month: 'short', day: 'numeric', year: 'numeric' })}`
      : fmt(cursor, { month: 'long', year: 'numeric' })

  const agendaItems = visible
    .filter(
      (a) =>
        a.date.getMonth() === cursor.getMonth() && a.date.getFullYear() === cursor.getFullYear()
    )
    .sort((a, b) => a.at - b.at)

  const shift = (dir) => {
    if (view === 'week') setCursor(addDays(cursor, 7 * dir))
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1))
  }

  const eventsOn = (day) => visible.filter((a) => sameDay(a.date, day)).sort((a, b) => a.at - b.at)

  return (
    <div className={ScheduleStyle['schedule']}>
      <header className={ScheduleStyle['schedule__header']}>
        <div>
          <p className={ScheduleStyle['schedule__eyebrow']}>Patient schedule</p>
          <h1 className={ScheduleStyle['schedule__title']}>Your appointments</h1>
          <p className={ScheduleStyle['schedule__sub']}>Manage upcoming visits and keep track of your care.</p>
        </div>
        <button className={`${ScheduleStyle['btn-primary']} ${ProfileStyle['btn-primary']}`} onClick={() => navigate('/patient/dashboard')}>
          <PlusIcon width={15} height={15} />
          Book appointment
        </button>
      </header>

      <div className={ScheduleStyle['toolbar']}>
        <div className={ScheduleStyle['seg']} role="tablist" aria-label="Calendar view">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={view === v.id}
              className={`${ScheduleStyle['seg__btn']} ${view === v.id ? ScheduleStyle['seg__btn--active'] : ''}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <button className={ScheduleStyle['tool-btn']} onClick={() => shift(-1)} aria-label="Previous">
          <ChevronLeftIcon width={15} height={15} />
        </button>
        <button className={`${ScheduleStyle['tool-btn']} ${ScheduleStyle['tool-btn--today']}`} onClick={() => setCursor(TODAY)}>
          Today
        </button>
        <button className={ScheduleStyle['tool-btn']} onClick={() => shift(1)} aria-label="Next">
          <ChevronRightIcon width={15} height={15} />
        </button>
        <span className={ScheduleStyle['toolbar__title']}>{title}</span>

        <label className={ScheduleStyle['toolbar__search']}>
          <PngIcon src={searchIcon} size={14} className={SidebarStyle['icon-muted']} />
          <input
            type="search"
            placeholder="Search appointments"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <div className={ScheduleStyle['schedule__body']}>
        {view === 'agenda' ? (
          <section className={ScheduleStyle['agenda']}>
            {agendaItems.length === 0 ? (
              <p className={ScheduleStyle['agenda__empty']}>No appointments in {fmt(cursor, { month: 'long', year: 'numeric' })}.</p>
            ) : (
              agendaItems.map((a) => (
                <div key={a.id} className={ScheduleStyle['agenda__row']}>
                  <div className={ScheduleStyle['agenda__date']}>
                    <strong>{a.date.getDate()}</strong>
                    <span>{fmt(a.date, { month: 'short' })}</span>
                  </div>
                  <div>
                    <div className={ScheduleStyle['agenda__title']}>{a.title}</div>
                    <div className={ScheduleStyle['agenda__meta']}>{a.time} · {a.doctor}</div>
                  </div>
                </div>
              ))
            )}
          </section>
        ) : (
          <section className={ScheduleStyle['cal']}>
            <div className={ScheduleStyle['cal__head']}>
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            {weeks.map((week) => (
              <div key={week[0].toISOString()} className={ScheduleStyle['cal__row']}>
                {week.map((day) => {
                  const outside = view === 'month' && day.getMonth() !== cursor.getMonth()
                  return (
                    <div key={day.toISOString()} className={`${ScheduleStyle['cal__cell']} ${outside ? ScheduleStyle['cal__cell--outside'] : ''}`}>
                      <span className={`${ScheduleStyle['cal__day']} ${sameDay(day, TODAY) ? ScheduleStyle['cal__day--today'] : ''}`}>
                        {day.getDate()}
                      </span>
                      {eventsOn(day).map((a) => (
                        <div
                          key={a.id}
                          className={`${ScheduleStyle['cal__event']} ${a.type === 'follow-up' ? ScheduleStyle['cal__event--blue'] : ScheduleStyle['cal__event--teal']}`}
                          title={`${a.title} with ${a.doctor}`}
                        >
                          {a.time} · {a.title}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            ))}
          </section>
        )}

        <aside className={ScheduleStyle['upcoming']}>
          <div className={ScheduleStyle['upcoming__head']}>
            <div>
              <p className={ScheduleStyle['upcoming__eyebrow']}>Next up</p>
              <h2 className={ScheduleStyle['upcoming__title']}>Upcoming</h2>
            </div>
            <span className={ScheduleStyle['count']}>{upcoming.length}</span>
          </div>

          {upcoming.length === 0 ? (
            <div className={ScheduleStyle['upcoming__empty']}>
              <PngIcon src={scheduleIcon} size={16} className={SidebarStyle['icon-muted']} />
              <p className={ScheduleStyle['upcoming__empty-title']}>
                {error ? "Couldn't load appointments" : 'No matching appointments'}
              </p>
              <p className={ScheduleStyle['upcoming__empty-sub']}>
                {error || 'Start a new AI conversation to book care.'}
              </p>
            </div>
          ) : (
            <ul className={ScheduleStyle['upcoming__list']}>
              {upcoming.map((a) => (
                <li key={a.id} className={ScheduleStyle['upcoming__item']}>
                  <div className={ScheduleStyle['agenda__date']}>
                    <strong>{a.date.getDate()}</strong>
                    <span>{fmt(a.date, { month: 'short' })}</span>
                  </div>
                  <div>
                    <div className={ScheduleStyle['agenda__title']}>{a.title}</div>
                    <div className={ScheduleStyle['agenda__meta']}>{a.time} · {a.doctor}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  )
}

export default Schedule