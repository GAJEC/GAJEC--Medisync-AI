import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PngIcon, MoreIcon } from '../../components/common/Icons'
import AppointmentModal from '../../components/patient/AppointmentModal'

import searchIcon from '../../assets/icons/search.png'
import scheduleIcon from '../../assets/icons/schedule.png'

import '../../assets/styles/history.css'

// Mock data. Replace with your backend later.
const HISTORY = [
  {
    id: 1, ref: 'HL-250318-0842', reason: 'Annual wellness check',
    doctor: 'Dr. Maria Santos', specialty: 'Internal Medicine',
    date: '2025-03-18T10:30:00', mode: 'In-person', status: 'Completed',
  },
  {
    id: 2, ref: 'HL-241122-2190', reason: 'Seasonal cough',
    doctor: 'Dr. Daniel Reyes', specialty: 'Family Medicine',
    date: '2024-11-22T14:00:00', mode: 'Online', status: 'Completed',
  },
  {
    id: 3, ref: 'HL-240908-1171', reason: 'Follow-up consultation',
    doctor: 'Dr. Maria Santos', specialty: 'Internal Medicine',
    date: '2024-09-08T09:00:00', mode: 'In-person', status: 'Cancelled',
  },
]

const COLUMNS = ['Appointment', 'Doctor & specialty', 'Date & time', 'Consultation', 'Status']

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

const AppointmentHistory = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [order, setOrder] = useState('newest')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState(null)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return HISTORY.filter((a) => {
      const d = new Date(a.date)
      if (status !== 'all' && a.status !== status) return false
      if (from && d < new Date(`${from}T00:00:00`)) return false
      if (to && d > new Date(`${to}T23:59:59`)) return false
      if (!q) return true
      return [a.ref, a.doctor, a.specialty, a.reason].some((v) => v.toLowerCase().includes(q))
    }).sort((a, b) =>
      order === 'newest' ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date)
    )
  }, [search, status, order, from, to])

  const rangeActive = Boolean(from || to)

  const clearRange = () => {
    setFrom('')
    setTo('')
  }

  const bookAgain = () => {
    setSelected(null)
    navigate('/patient')
  }

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <p className="page__eyebrow">Care record</p>
          <h1 className="page__title">Appointment history</h1>
          <p className="page__sub">Review past and upcoming hospital visits.</p>
        </div>
      </header>

      <div className="filters">
        <label className="filters__search">
          <PngIcon src={searchIcon} size={14} className="icon-muted" />
          <input
            type="search"
            placeholder="Search doctor, specialty, or reference"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select className="select" value={order} onChange={(e) => setOrder(e.target.value)} aria-label="Sort order">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>

        <div className="range">
          <button
            className={`btn-outline range__btn ${rangeActive ? 'range__btn--active' : ''}`}
            onClick={() => setRangeOpen((o) => !o)}
            aria-expanded={rangeOpen}
          >
            <PngIcon src={scheduleIcon} size={15} className="icon-muted" />
            Date range
          </button>

          {rangeOpen && (
            <div className="range__pop">
              <label>
                From
                <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label>
                To
                <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
              </label>
              <button className="btn-text" onClick={clearRange} disabled={!rangeActive}>
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <div className="table" role="table">
            <div className="table__row table__row--head" role="row">
              {COLUMNS.map((c) => (
                <span key={c} role="columnheader">{c}</span>
              ))}
              <span />
            </div>

            {rows.length === 0 ? (
              <p className="table__empty">No appointments match your filters.</p>
            ) : (
              rows.map((a) => (
                <div key={a.id} className="table__row" role="row">
                  <span className="cell">
                    <strong>{a.ref}</strong>
                    <small>{a.reason}</small>
                  </span>
                  <span className="cell">
                    <strong>{a.doctor}</strong>
                    <small>{a.specialty}</small>
                  </span>
                  <span className="cell">
                    <strong>{formatDate(a.date)}</strong>
                    <small>{formatTime(a.date)}</small>
                  </span>
                  <span className="cell cell--mode">{a.mode}</span>
                  <span className="cell">
                    <span className={`pill ${a.status === 'Completed' ? 'pill--ok' : 'pill--cancel'}`}>
                      {a.status}
                    </span>
                  </span>
                  <span className="cell cell--action">
                    <button
                      className="icon-btn"
                      aria-label={`View details for ${a.ref}`}
                      onClick={() => setSelected(a)}
                    >
                      <MoreIcon width={18} height={18} />
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AppointmentModal
        appointment={selected}
        onClose={() => setSelected(null)}
        onBookAgain={bookAgain}
      />
    </div>
  )
}

export default AppointmentHistory