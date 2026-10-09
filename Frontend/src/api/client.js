const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  // FormData (file uploads) sets its own multipart Content-Type with the boundary.
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    })
  } catch {
    throw new ApiError('Cannot reach the server. Please try again later.', 0)
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    let message = data.error || data.message || 'Something went wrong. Please try again.'
    if (res.status === 429) message = 'Too many attempts. Please wait a minute and try again.'
    if (data.code === 'FST_ERR_VALIDATION') message = friendlyValidationMessage(data.message)
    throw new ApiError(message, res.status)
  }

  return data
}

function friendlyValidationMessage(raw = '') {
  if (raw.includes('email')) return 'Please enter a valid email address.'
  if (raw.includes('password') && raw.includes('fewer than')) return 'Password must be at least 8 characters.'
  if (raw.includes('password') && raw.includes('more than')) return 'Password must be at most 128 characters.'
  if (raw.includes('firstname') || raw.includes('lastname')) return 'Please enter your first and last name.'
  if (raw.includes('mobile') || raw.includes('Phone')) return 'Phone numbers may only contain digits, spaces, +, - and parentheses.'
  if (raw.includes('dob')) return 'Please enter a valid date of birth.'
  return 'Please check the form and try again.'
}

export const authApi = {
  login: (email, password) =>
    apiRequest('/auth/login', { method: 'POST', body: { email, password } }),
  register: ({ firstname, lastname, email, password }) =>
    apiRequest('/auth/register', { method: 'POST', body: { firstname, lastname, email, password } }),
  me: (token) => apiRequest('/auth/me', { token }),
  logout: (token) => apiRequest('/auth/logout', { method: 'POST', token }),
  changePassword: (token, currentPassword, newPassword) =>
    apiRequest('/auth/password', { method: 'PUT', token, body: { currentPassword, newPassword } }),
  sessions: (token) => apiRequest('/auth/sessions', { token }),
  signOutOtherSessions: (token) => apiRequest('/auth/sessions/others', { method: 'DELETE', token }),
  // theme: 'light' | 'dark'
  updateTheme: (token, theme) => apiRequest('/auth/theme', { method: 'PUT', token, body: { theme } }),
}

const toQuery = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ).toString()
  return qs ? `?${qs}` : ''
}

// All endpoints are scoped to the signed-in patient by the token.
export const patientApi = {
  profile: (token) => apiRequest('/patient/profile', { token }),
  updateProfile: (token, changes) => apiRequest('/patient/profile', { method: 'PUT', token, body: changes }),

  doctors: (token) => apiRequest('/patient/doctors', { token }),
  appointments: (token, filters) => apiRequest(`/patient/appointments${toQuery(filters)}`, { token }),
  appointment: (token, id) => apiRequest(`/patient/appointments/${id}`, { token }),
  bookAppointment: (token, data) => apiRequest('/patient/appointments', { method: 'POST', token, body: data }),
  cancelAppointment: (token, id) => apiRequest(`/patient/appointments/${id}/cancel`, { method: 'POST', token }),

  notifications: (token) => apiRequest('/patient/notifications', { token }),
  markNotificationRead: (token, id) => apiRequest(`/patient/notifications/${id}/read`, { method: 'POST', token }),
  markAllNotificationsRead: (token) => apiRequest('/patient/notifications/read-all', { method: 'POST', token }),

  conversations: (token) => apiRequest('/patient/conversations', { token }),
  conversation: (token, id) => apiRequest(`/patient/conversations/${id}`, { token }),
  startConversation: (token, message) =>
    apiRequest('/patient/conversations', { method: 'POST', token, body: { message } }),
  sendMessage: (token, id, message) =>
    apiRequest(`/patient/conversations/${id}/messages`, { method: 'POST', token, body: { message } }),
  requestReply: (token, id, image, progressId) => {
    let body
    if (image) {
      body = new FormData()
      body.append('image', image, image.name)
    }
    const query = progressId ? `?progress=${encodeURIComponent(progressId)}` : ''
    return apiRequest(`/patient/conversations/${id}/reply${query}`, { method: 'POST', token, body })
  },
  replyProgress: (token, progressId) =>
    apiRequest(`/patient/ai-progress/${encodeURIComponent(progressId)}`, { token }),
  transcribe: (token, audio, language = 'auto') => {
    const body = new FormData()
    body.append('audio', audio, audio.name)
    body.append('language', language)
    return apiRequest('/patient/transcribe', { method: 'POST', token, body })
  },
  renameConversation: (token, id, title) =>
    apiRequest(`/patient/conversations/${id}`, { method: 'PATCH', token, body: { title } }),
  updateConversation: (token, id, changes) =>
    apiRequest(`/patient/conversations/${id}`, { method: 'PATCH', token, body: changes }),
  deleteConversation: (token, id) => apiRequest(`/patient/conversations/${id}`, { method: 'DELETE', token }),

  consents: (token) => apiRequest('/patient/consents', { token }),
  updateConsents: (token, consents) => apiRequest('/patient/consents', { method: 'PUT', token, body: consents }),
  dataRequests: (token) => apiRequest('/patient/data-requests', { token }),
  createDataRequest: (token, type, note) =>
    apiRequest('/patient/data-requests', { method: 'POST', token, body: { type, note } }),
}

// Staff portal. All endpoints require a staff token.
export const staffApi = {
  dashboard: (token, filters) => apiRequest(`/staff/dashboard${toQuery(filters)}`, { token }),

  appointments: (token, filters) => apiRequest(`/staff/appointments${toQuery(filters)}`, { token }),
  appointment: (token, id) => apiRequest(`/staff/appointments/${id}`, { token }),
  createAppointment: (token, data) => apiRequest('/staff/appointments', { method: 'POST', token, body: data }),
  updateAppointment: (token, id, changes) =>
    apiRequest(`/staff/appointments/${id}`, { method: 'PATCH', token, body: changes }),

  patients: (token, filters) => apiRequest(`/staff/patients${toQuery(filters)}`, { token }),
  patientOptions: (token, search) => apiRequest(`/staff/patients/options${toQuery({ search })}`, { token }),
  patient: (token, id) => apiRequest(`/staff/patients/${id}`, { token }),
  createPatient: (token, data) => apiRequest('/staff/patients', { method: 'POST', token, body: data }),
  updatePatient: (token, id, changes) =>
    apiRequest(`/staff/patients/${id}`, { method: 'PATCH', token, body: changes }),

  doctors: (token, filters) => apiRequest(`/staff/doctors${toQuery(filters)}`, { token }),
  createDoctor: (token, data) => apiRequest('/staff/doctors', { method: 'POST', token, body: data }),
  updateDoctor: (token, id, changes) =>
    apiRequest(`/staff/doctors/${id}`, { method: 'PATCH', token, body: changes }),

  schedule: (token, filters) => apiRequest(`/staff/schedule${toQuery(filters)}`, { token }),
  setSchedule: (token, data) => apiRequest('/staff/schedule', { method: 'PUT', token, body: data }),

  departments: (token, filters) => apiRequest(`/staff/departments${toQuery(filters)}`, { token }),
  createDepartment: (token, data) => apiRequest('/staff/departments', { method: 'POST', token, body: data }),
  updateDepartment: (token, id, changes) =>
    apiRequest(`/staff/departments/${id}`, { method: 'PATCH', token, body: changes }),

  reports: (token, filters) => apiRequest(`/staff/reports${toQuery(filters)}`, { token }),
  activity: (token, filters) => apiRequest(`/staff/activity${toQuery(filters)}`, { token }),
}
