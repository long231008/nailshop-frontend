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
  getBranch: (branchId) => request(`/app/branches/${branchId}`),
  listServices: (branchId) => request(`/app/services?branch_id=${branchId}`),
  requestOtp: (payload) => request('/app/auth/request-otp', { method: 'POST', body: payload }),
  verifyOtp: (payload) => request('/app/auth/verify', { method: 'POST', body: payload }),
  googleLoginUrl: () => `${API_BASE_URL}/app/auth/google/login`,
  facebookLoginUrl: () => `${API_BASE_URL}/app/auth/facebook/login`,
  getAvailability: (params, token) =>
    request(`/app/availability?${new URLSearchParams(params).toString()}`, { token }),
  createBooking: (payload, token) =>
    request('/app/bookings', { method: 'POST', body: payload, token }),
  cancelBooking: (bookingId, token) =>
    request(`/app/bookings/${bookingId}/cancel`, { method: 'POST', token }),
  myBookings: (token) => request('/app/me/bookings', { token }),
  myProfile: (token) => request('/app/me', { token }),
  updateMyProfile: (payload, token) =>
    request('/app/me', { method: 'PATCH', body: payload, token }),
  giftPreview: (branchId, total) =>
    request(`/app/discounts/gift-preview?branch_id=${branchId}&total=${total}`),
  listStaff: (branchId, token) => request(`/app/staff?branch_id=${branchId}`, { token }),
  listUsers: (params, token) =>
    request(`/app/admin/users?${new URLSearchParams(params).toString()}`, { token }),
  grantStaff: (userId, payload, token) =>
    request(`/app/admin/users/${userId}/grant-staff`, { method: 'POST', body: payload, token }),
  revokeStaff: (userId, token) =>
    request(`/app/admin/users/${userId}/revoke-staff`, { method: 'POST', token }),
  setSlotLockPermission: (staffId, enabled, token) =>
    request(`/app/admin/staff/${staffId}/slot-lock-permission`, {
      method: 'POST',
      body: { enabled },
      token,
    }),
  listSlotLocks: (branchId, token) =>
    request(`/app/slot-locks?branch_id=${branchId}`, { token }),
  createSlotLock: (payload, token) =>
    request('/app/slot-locks', { method: 'POST', body: payload, token }),
  deleteSlotLock: (lockId, token) =>
    request(`/app/slot-locks/${lockId}`, { method: 'DELETE', token }),
  dashboardSummary: (branchId, token) =>
    request(`/app/dashboard/summary${branchId ? `?branch_id=${branchId}` : ''}`, { token }),
  dashboardRevenue: (branchId, token) =>
    request(`/app/dashboard/revenue${branchId ? `?branch_id=${branchId}` : ''}`, { token }),
}
