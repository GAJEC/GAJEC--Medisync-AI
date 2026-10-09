const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
  renameConversation: (token, id, title) =>
    apiRequest(`/patient/conversations/${id}`, { method: 'PATCH', token, body: { title } }),
  deleteConversation: (token, id) => apiRequest(`/patient/conversations/${id}`, { method: 'DELETE', token }),

  consents: (token) => apiRequest('/patient/consents', { token }),
  updateConsents: (token, consents) => apiRequest('/patient/consents', { method: 'PUT', token, body: consents }),
  dataRequests: (token) => apiRequest('/patient/data-requests', { token }),
  createDataRequest: (token, type, note) =>
    apiRequest('/patient/data-requests', { method: 'POST', token, body: { type, note } }),
}
