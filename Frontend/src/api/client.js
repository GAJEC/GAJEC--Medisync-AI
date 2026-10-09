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
  return 'Please check the form and try again.'
}

export const authApi = {
  login: (email, password) =>
    apiRequest('/auth/login', { method: 'POST', body: { email, password } }),
  register: ({ firstname, lastname, email, password }) =>
    apiRequest('/auth/register', { method: 'POST', body: { firstname, lastname, email, password } }),
  me: (token) => apiRequest('/auth/me', { token }),
}
