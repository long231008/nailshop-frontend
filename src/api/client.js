const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail || `Request failed with status ${status}`)
    this.status = status
    this.detail = detail
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let detail = null
    try {
      const data = await res.json()
      detail = data.detail
    } catch {
      // response had no JSON body
    }
    throw new ApiError(res.status, detail)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  listBranches: () => request('/app/branches'),
  listServices: (branchId) => request(`/app/services?branch_id=${branchId}`),
  register: (payload) => request('/app/auth/register', { method: 'POST', body: payload }),
  verifyOtp: (payload) => request('/app/auth/verify', { method: 'POST', body: payload }),
  googleLoginUrl: () => `${API_BASE_URL}/app/auth/google/login`,
  getAvailability: (params, token) =>
    request(`/app/availability?${new URLSearchParams(params).toString()}`, { token }),
  createBooking: (payload, token) =>
    request('/app/bookings', { method: 'POST', body: payload, token }),
  myBookings: (token) => request('/app/me/bookings', { token }),
  myProfile: (token) => request('/app/me', { token }),
  updateMyProfile: (payload, token) =>
    request('/app/me', { method: 'PATCH', body: payload, token }),
}
