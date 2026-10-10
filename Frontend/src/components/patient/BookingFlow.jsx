import { useState, useEffect } from 'react'
import { patientApi } from '../../api/client'
import { ChevronRightIcon, ChevronLeftIcon, ShieldCheckIcon } from '../common/Icons'
import ScheduleStyle from '../../assets/styles/schedule.module.css'
import ProfileStyle from '../../assets/styles/profile.module.css'
import HomeStyle from '../../assets/styles/home.module.css'
import HistoryStyle from '../../assets/styles/history.module.css'

const BookingFlow = ({ token, triage, onClose }) => {
  const [step, setStep] = useState(1) // 1: Select Doctor, 2: Select Schedule, 3: Confirm, 4: Success
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [mode, setMode] = useState('In-person')
  const [bookingRef, setBookingRef] = useState('')

  useEffect(() => {
    patientApi.doctors(token)
      .then(res => {
        setDoctors(res.doctors || res)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [token])

  const recommendedSpecialties = triage?.specialties || []
  const urgency = triage?.urgency || 'routine'

  const filteredDoctors = doctors.filter(d => {
    const q = search.toLowerCase()
    return d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q)
  }).sort((a, b) => {
    const aRec = recommendedSpecialties.some(s => a.specialty.toLowerCase().includes(s.toLowerCase()))
    const bRec = recommendedSpecialties.some(s => b.specialty.toLowerCase().includes(s.toLowerCase()))
    if (aRec && !bRec) return -1
    if (!aRec && bRec) return 1
    return 0
  })

  const getAvailableSlots = () => {
    if (urgency === 'urgent' || urgency === 'emergency') return ['08:00', '09:00', '10:00', '11:00']
    return ['09:00', '10:30', '13:00', '14:30', '16:00']
  }

  const handleBook = async () => {
    setError('')
    try {
      const scheduledAt = new Date(`${date}T${time}:00`)
      const res = await patientApi.bookAppointment(token, {
        doctorId: selectedDoctor.id,
        reason: 'Consultation requested via AI',
        type: 'consult',
        mode: mode,
        scheduledAt: scheduledAt.toISOString()
      })
      setBookingRef(res.appointment.ref)
      setStep(4)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return (
    <div className={HomeStyle['msg']} style={{ width: '100%', marginTop: '16px' }}>
      <div className={HomeStyle['bubble']}>Loading available doctors...</div>
    </div>
  )

  return (
    <div className={HomeStyle['msg']} style={{ width: '100%', marginTop: '16px' }}>
      <div className={ProfileStyle['panel']} style={{ width: '100%' }}>
        <header className={ProfileStyle['panel__head']} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px' }}>
          <div>
            <h2 className={ProfileStyle['panel__title']}>Book an Appointment</h2>
            <p className={ProfileStyle['panel__sub']}>Select a specialist and secure your visit.</p>
          </div>
          {step < 4 && (
            <button type="button" onClick={onClose} className={ScheduleStyle['tool-btn']}>
              Cancel
            </button>
          )}
        </header>

        <div className={ProfileStyle['panel__body']}>
          {error && <p className={ProfileStyle['form-error']} role="alert" style={{ marginBottom: '16px' }}>{error}</p>}

          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={ProfileStyle['field']}>
                <input 
                  type="search" 
                  placeholder="Search by name or specialty..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  className={ProfileStyle['input']}
                />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredDoctors.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--muted)' }}>No doctors found.</p>
                ) : (
                  filteredDoctors.slice(0, 5).map((d, i) => {
                    const isRecommended = recommendedSpecialties.some(s => d.specialty.toLowerCase().includes(s.toLowerCase()))
                    return (
                      <button 
                        key={d.id} 
                        type="button"
                        onClick={() => { setSelectedDoctor(d); setStep(2); }} 
                        className={ScheduleStyle['agenda__row']}
                        style={{
                          width: '100%', textAlign: 'left', background: isRecommended ? 'var(--primary-soft)' : 'none', 
                          border: 'none', borderTop: i > 0 ? '1px solid var(--border)' : '0',
                          padding: '16px', borderRadius: isRecommended ? '8px' : '0', cursor: 'pointer'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <strong style={{ display: 'block', fontSize: '15px', color: 'var(--text)' }}>{d.name}</strong>
                          <span style={{ color: 'var(--muted)', fontSize: '13px' }}>
                            {d.specialty} 
                            {isRecommended && <span style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 'bold', marginLeft: '8px' }}>✨ Recommended</span>}
                          </span>
                        </div>
                        <ChevronRightIcon width={16} height={16} style={{ color: 'var(--muted)' }} />
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <button 
                type="button" 
                onClick={() => setStep(1)} 
                className={ScheduleStyle['seg__btn']} 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start', padding: 0 }}
              >
                <ChevronLeftIcon width={14} height={14} /> Back to doctors
              </button>
              
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>Schedule with {selectedDoctor?.name}</h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>{selectedDoctor?.specialty}</p>
              </div>
              
              <div className={ProfileStyle['form-grid']}>
                <div className={ProfileStyle['field']}>
                  <label>Date</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => { setDate(e.target.value); setTime(''); }} 
                    className={ProfileStyle['input']}
                    min={new Date().toISOString().split('T')[0]} 
                  />
                </div>
                
                <div className={ProfileStyle['field']}>
                  <label>Mode</label>
                  <select value={mode} onChange={e => setMode(e.target.value)} className={ProfileStyle['input']}>
                    <option value="In-person">In-person</option>
                    <option value="Online">Online Video Consult</option>
                  </select>
                </div>
              </div>

              {date && (
                <div className={ProfileStyle['field']}>
                  <label>Available Time</label>
                  <div className={HomeStyle['choices']} style={{ marginLeft: 0, maxWidth: '100%' }}>
                    {getAvailableSlots().map(t => (
                      <button 
                        key={t} 
                        type="button"
                        onClick={() => setTime(t)} 
                        className={`${HomeStyle['choice']} ${time === t ? HomeStyle['choice--picked'] : ''}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button 
                type="button"
                onClick={() => setStep(3)} 
                disabled={!date || !time} 
                className={ScheduleStyle['btn-primary']} 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Continue to confirmation
              </button>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <button 
                type="button" 
                onClick={() => setStep(2)} 
                className={ScheduleStyle['seg__btn']} 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start', padding: 0 }}
              >
                <ChevronLeftIcon width={14} height={14} /> Back to schedule
              </button>
              
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>Confirm your appointment</h3>
              
              <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--surface-hover)', fontSize: '13px', lineHeight: '1.6', color: 'var(--text)' }}>
                <p style={{ margin: '0 0 8px 0' }}><strong>Doctor:</strong> {selectedDoctor?.name} ({selectedDoctor?.specialty})</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>Date:</strong> {new Date(`${date}T${time}:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>Time:</strong> {new Date(`${date}T${time}:00`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</p>
                <p style={{ margin: '0 0 8px 0' }}><strong>Mode:</strong> {mode}</p>
                <p style={{ margin: '0' }}><strong>Reason:</strong> Consultation based on AI triage ({urgency})</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: 'var(--muted)' }}>
                <ShieldCheckIcon width={16} height={16} style={{ color: 'var(--primary)' }} />
                Your appointment details are handled securely.
              </div>
              
              <button 
                type="button"
                onClick={handleBook} 
                className={ScheduleStyle['btn-primary']} 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Confirm and book
              </button>
            </div>
          )}

          {step === 4 && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <span className={HistoryStyle['pill']} style={{ background: 'var(--ok-bg)', color: 'var(--ok-text)', padding: '6px 12px', fontSize: '14px', borderRadius: '999px', display: 'inline-block', marginBottom: '16px' }}>
                ✓ Appointment Confirmed
              </span>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600' }}>You're all set!</h3>
              <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'var(--muted)' }}>
                Your reference number is <strong style={{ color: 'var(--text)' }}>{bookingRef}</strong>
              </p>
              
              <button 
                type="button"
                onClick={onClose} 
                className={ScheduleStyle['btn-primary']} 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Return to chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookingFlow
