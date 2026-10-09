import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { PngIcon, MoreIcon } from '../../components/common/Icons'
import { patientApi } from '../../api/client'

import HistoryStyle from '../../assets/styles/history.module.css'
import SidebarStyle from '../../assets/styles/sidebar.module.css'


import AppointmentModal from '../../components/patient/AppointmentModal'

import searchIcon from '../../assets/icons/search.png'
import scheduleIcon from '../../assets/icons/schedule.png'



const PILL = {
  Completed: HistoryStyle['pill--ok'],
  Cancelled: HistoryStyle['pill--cancel'],
  Scheduled: HistoryStyle['pill--scheduled'],
}

const COLUMNS = ['Appointment', 'Doctor & specialty', 'Date & time', 'Consultation', 'Status']

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

const AppointmentHistory = () => {
  const navigate = useNavigate()
  const { token } = useOutletContext()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [order, setOrder] = useState('newest')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [selected, setSelected] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  // Result of the last finished request, tagged with the filters it was for
  const [result, setResult] = useState({ key: null, rows: [], error: '' })

  // Debounce the search box so we don't query on every keystroke
  useEffect(() => {
    const id = setTimeout(() => setQuery(search.trim()), 300)
    return () => clearTimeout(id)
  }, [search])

  const filters = useMemo(
    () => ({ status: status === 'all' ? undefined : status, search: query, from, to, order }),
    [status, query, from, to, order],
  )
  const requestKey = `${JSON.stringify(filters)}#${reloadKey}`

  useEffect(() => {
    let cancelled = false
    patientApi
      .appointments(token, filters)
      .then(({ appointments }) => !cancelled && setResult({ key: requestKey, rows: appointments, error: '' }))
      .catch((err) => !cancelled && setResult((r) => ({ ...r, key: requestKey, error: err.message })))
    return () => {
      cancelled = true
    }
  }, [token, filters, requestKey])

  const loading = result.key !== requestKey
  const rows = result.rows
  const error = loading ? '' : result.error

  const cancelAppointment = async (appointment) => {
    const { appointment: updated } = await patientApi.cancelAppointment(token, appointment.id)
    setSelected(updated)
    setReloadKey((k) => k + 1)
  }

  const rangeActive = Boolean(from || to)

  const clearRange = () => {
    setFrom('')
    setTo('')
  }

  const bookAgain = () => {
    setSelected(null)
    navigate('/patient/dashboard')
  }

  return (
    <div className={SidebarStyle['page']}>
      <header className={SidebarStyle['page__header']}>
        <div>
          <p className={SidebarStyle['page__eyebrow']}>Care record</p>
          <h1 className={SidebarStyle['page__title']}>Appointment history</h1>
          <p className={SidebarStyle['page__sub']}>Review past and upcoming hospital visits.</p>
        </div>
      </header>

      <div className={HistoryStyle['filters']}>
        <label className={HistoryStyle['filters__search']}>
          <PngIcon src={searchIcon} size={14} className={SidebarStyle['icon-muted']} />
          <input
            type="search"
            placeholder="Search doctor, specialty, or reference"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <select className={HistoryStyle['select']} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select className={HistoryStyle['select']} value={order} onChange={(e) => setOrder(e.target.value)} aria-label="Sort order">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>

        <div className={HistoryStyle['range']}>
          <button
            className={`${SidebarStyle['btn-outline']} ${HistoryStyle['range__btn']} ${rangeActive ? HistoryStyle['range__btn--active'] : ''}`}
            onClick={() => setRangeOpen((o) => !o)}
            aria-expanded={rangeOpen}
          >
            <PngIcon src={scheduleIcon} size={15} className={SidebarStyle['icon-muted']} />
            Date range
          </button>

          {rangeOpen && (
            <div className={HistoryStyle['range__pop']}>
              <label>
                From
                <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label>
                To
                <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
              </label>
              <button className={`${HistoryStyle['btn-text']} ${SidebarStyle['btn-text']}`} onClick={clearRange} disabled={!rangeActive}>
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={HistoryStyle['table-card']}>
        <div className={HistoryStyle['table-scroll']}>
          <div className={HistoryStyle['table']} role="table">
            <div className={`${HistoryStyle['table__row']} ${HistoryStyle['table__row--head']}`} role="row">
              {COLUMNS.map((c) => (
                <span key={c} role="columnheader">{c}</span>
              ))}
              <span />
            </div>

            {error ? (
              <p className={HistoryStyle['table__empty']} role="alert">{error}</p>
            ) : loading && rows.length === 0 ? (
              <p className={HistoryStyle['table__empty']}>Loading appointments…</p>
            ) : rows.length === 0 ? (
              <p className={HistoryStyle['table__empty']}>
                {query || status !== 'all' || rangeActive ? 'No appointments match your filters.' : 'You have no appointments yet.'}
              </p>
            ) : (
              rows.map((a) => (
                <div key={a.id} className={HistoryStyle['table__row']} role="row">
                  <span className={HistoryStyle['cell']}>
                    <strong>{a.ref}</strong>
                    <small>{a.reason}</small>
                  </span>
                  <span className={HistoryStyle['cell']}>
                    <strong>{a.doctor || 'To be assigned'}</strong>
                    <small>{a.specialty || '—'}</small>
                  </span>
                  <span className={HistoryStyle['cell']}>
                    <strong>{formatDate(a.date)}</strong>
                    <small>{formatTime(a.date)}</small>
                  </span>
                  <span className={`${HistoryStyle['cell']} ${HistoryStyle['cell--mode']}`}>{a.mode}</span>
                  <span className={HistoryStyle['cell']}>
                    <span className={`${HistoryStyle['pill']} ${PILL[a.status] || ''}`}>
                      {a.status}
                    </span>
                  </span>
                  <span className={`${HistoryStyle['cell']} ${HistoryStyle['cell--action']}`}>
                    <button
                      className={SidebarStyle['icon-btn']}
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
        key={selected?.id}
        appointment={selected}
        onClose={() => setSelected(null)}
        onBookAgain={bookAgain}
        onCancel={cancelAppointment}
      />
    </div>
  )
}

export default AppointmentHistory