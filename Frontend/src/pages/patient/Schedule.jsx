import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PngIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../../components/common/Icons'

import searchIcon from '../../assets/icons/search.png'
import scheduleIcon from '../../assets/icons/schedule.png'

import '../../assets/styles/schedule.css'

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

// Mock data, placed relative to today so the calendar always shows something.
// Replace with a call to your backend later.
const APPOINTMENTS = [
  { id: 1, date: addDays(TODAY, -6), time: '9:00 AM', title: 'Headache consultation', doctor: 'Dr. Reyes', type: 'consult' },
  { id: 2, date: addDays(TODAY, 3), time: '2:00 PM', title: 'Follow-up', doctor: 'Dr. Santos', type: 'follow-up' },
  { id: 3, date: addDays(TODAY, 10), time: '10:30 AM', title: 'General checkup', doctor: 'Dr. Lim', type: 'checkup' },
]

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
  const [view, setView] = useState('month')
  const [cursor, setCursor] = useState(TODAY)
  const [search, setSearch] = useState('')

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return APPOINTMENTS.filter(
      (a) => !q || a.title.toLowerCase().includes(q) || a.doctor.toLowerCase().includes(q)
    )
  }, [search])

  const upcoming = visible.filter((a) => a.date >= TODAY).sort((a, b) => a.date - b.date)
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
    .sort((a, b) => a.date - b.date)

  const shift = (dir) => {
    if (view === 'week') setCursor(addDays(cursor, 7 * dir))
    else setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1))
  }

  const eventsOn = (day) => visible.filter((a) => sameDay(a.date, day))

  return (
    <div className="schedule">
      <header className="schedule__header">
        <div>
          <p className="schedule__eyebrow">Patient schedule</p>
          <h1 className="schedule__title">Your appointments</h1>
          <p className="schedule__sub">Manage upcoming visits and keep track of your care.</p>
        </div>
        <button className="btn-primary" onClick={() => navigate('/patient')}>
          <PlusIcon width={15} height={15} />
          Book appointment
        </button>
      </header>

      <div className="toolbar">
        <div className="seg" role="tablist" aria-label="Calendar view">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={view === v.id}
              className={`seg__btn ${view === v.id ? 'seg__btn--active' : ''}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <button className="tool-btn" onClick={() => shift(-1)} aria-label="Previous">
          <ChevronLeftIcon width={15} height={15} />
        </button>
        <button className="tool-btn tool-btn--today" onClick={() => setCursor(TODAY)}>
          Today
        </button>
        <button className="tool-btn" onClick={() => shift(1)} aria-label="Next">
          <ChevronRightIcon width={15} height={15} />
        </button>
        <span className="toolbar__title">{title}</span>

        <label className="toolbar__search">
          <PngIcon src={searchIcon} size={14} className="icon-muted" />
          <input
            type="search"
            placeholder="Search appointments"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      <div className="schedule__body">
        {view === 'agenda' ? (
          <section className="agenda">
            {agendaItems.length === 0 ? (
              <p className="agenda__empty">No appointments in {fmt(cursor, { month: 'long', year: 'numeric' })}.</p>
            ) : (
              agendaItems.map((a) => (
                <div key={a.id} className="agenda__row">
                  <div className="agenda__date">
                    <strong>{a.date.getDate()}</strong>
                    <span>{fmt(a.date, { month: 'short' })}</span>
                  </div>
                  <div>
                    <div className="agenda__title">{a.title}</div>
                    <div className="agenda__meta">{a.time} · {a.doctor}</div>
                  </div>
                </div>
              ))
            )}
          </section>
        ) : (
          <section className="cal">
            <div className="cal__head">
              {WEEKDAYS.map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            {weeks.map((week) => (
              <div key={week[0].toISOString()} className="cal__row">
                {week.map((day) => {
                  const outside = view === 'month' && day.getMonth() !== cursor.getMonth()
                  return (
                    <div key={day.toISOString()} className={`cal__cell ${outside ? 'cal__cell--outside' : ''}`}>
                      <span className={`cal__day ${sameDay(day, TODAY) ? 'cal__day--today' : ''}`}>
                        {day.getDate()}
                      </span>
                      {eventsOn(day).map((a) => (
                        <div
                          key={a.id}
                          className={`cal__event ${a.type === 'follow-up' ? 'cal__event--blue' : 'cal__event--teal'}`}
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

        <aside className="upcoming">
          <div className="upcoming__head">
            <div>
              <p className="upcoming__eyebrow">Next up</p>
              <h2 className="upcoming__title">Upcoming</h2>
            </div>
            <span className="count">{upcoming.length}</span>
          </div>

          {upcoming.length === 0 ? (
            <div className="upcoming__empty">
              <PngIcon src={scheduleIcon} size={16} className="icon-muted" />
              <p className="upcoming__empty-title">No matching appointments</p>
              <p className="upcoming__empty-sub">Start a new AI conversation to book care.</p>
            </div>
          ) : (
            <ul className="upcoming__list">
              {upcoming.map((a) => (
                <li key={a.id} className="upcoming__item">
                  <div className="agenda__date">
                    <strong>{a.date.getDate()}</strong>
                    <span>{fmt(a.date, { month: 'short' })}</span>
                  </div>
                  <div>
                    <div className="agenda__title">{a.title}</div>
                    <div className="agenda__meta">{a.time} · {a.doctor}</div>
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