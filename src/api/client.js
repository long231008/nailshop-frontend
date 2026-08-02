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
    if (res.status === 401 && token) {
      // Session expired: let AuthContext clear it and bounce to the login page.
      window.dispatchEvent(new Event('nailshop:session-expired'))
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
  requestEmailChange: (email, token) =>
    request('/app/me/email', { method: 'POST', body: { email }, token }),
  confirmEmailChange: (code, token) =>
    request('/app/me/email/confirm', { method: 'POST', body: { code }, token }),
  giftPreview: (branchId, total) =>
    request(`/app/discounts/gift-preview?branch_id=${branchId}&total=${total}`),
  listStaff: (branchId, token) => request(`/app/staff?branch_id=${branchId}`, { token }),
  listUsers: (params, token) =>
    request(`/app/admin/users?${new URLSearchParams(params).toString()}`, { token }),
  grantStaff: (userId, payload, token) =>
    request(`/app/admin/users/${userId}/grant-staff`, { method: 'POST', body: payload, token }),
  revokeStaff: (userId, token) =>
    request(`/app/admin/users/${userId}/revoke-staff`, { method: 'POST', token }),
  deleteUser: (userId, token) =>
    request(`/app/admin/users/${userId}`, { method: 'DELETE', token }),
  adminUserBookings: (userId, token) =>
    request(`/app/admin/users/${userId}/bookings`, { token }),
  dailySchedule: (params, token) =>
    request(`/app/schedule?${new URLSearchParams(params).toString()}`, { token }),
  approveBooking: (bookingId, token) =>
    request(`/app/bookings/${bookingId}/approve`, { method: 'POST', token }),
  pendingBookings: (branchId, token) =>
    request(`/app/schedule/pending${branchId ? `?branch_id=${branchId}` : ''}`, { token }),
  publicLockedRanges: (branchId, date) =>
    request(`/app/slot-locks/public?branch_id=${branchId}&date=${date}`),
  myCustomDesigns: (token) => request('/app/me/custom-designs', { token }),
  uploadCustomDesign: async (file, description, token) => {
    // Multipart upload - the JSON helper above doesn't fit here.
    const form = new FormData()
    if (file) form.append('file', file)
    if (description) form.append('description', description)
    const res = await fetch(`${API_BASE_URL}/app/custom-designs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    if (!res.ok) {
      let detail = null
      try {
        detail = (await res.json()).detail
      } catch {
        // no JSON body
      }
      throw new ApiError(res.status, detail)
    }
    return res.json()
  },
  listUnpricedDesigns: (token) => request('/app/custom-designs?priced=false', { token }),
  priceCustomDesign: (designId, price, token) =>
    request(`/app/custom-designs/${designId}/price`, {
      method: 'POST',
      body: { estimated_price: price },
      token,
    }),
  acceptCustomDesign: (designId, payload, token) =>
    request(`/app/custom-designs/${designId}/accept`, { method: 'POST', body: payload, token }),
  rejectCustomDesign: (designId, token) =>
    request(`/app/custom-designs/${designId}/reject`, { method: 'POST', token }),
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
  // Capability matrix (price list + per-tech real minutes) - the scheduler's
  // single source of truth.
  capabilityMatrix: (token) => request('/app/capability/matrix', { token }),
  saveCapabilityMatrix: (payload, token) =>
    request('/app/capability/matrix', { method: 'PUT', body: payload, token }),
  // Nightly allocation (21:00 close): status, manual re-run, and the manual
  // reassignment a manager uses to grant a customer's technician wish.
  allocationStatus: (targetDate, branchId, token) =>
    request(
      `/app/allocation/status?target_date=${targetDate}${branchId ? `&branch_id=${branchId}` : ''}`,
      { token }
    ),
  runAllocation: (payload, token) =>
    request('/app/allocation/run', { method: 'POST', body: payload, token }),
  reassignLeg: (bookingDetailId, staffId, token) =>
    request('/app/allocation/reassign', {
      method: 'POST',
      body: { booking_detail_id: bookingDetailId, staff_id: staffId },
      token,
    }),
  // Public: who a customer may wish for. With a date the list drops techs on
  // their weekly day off.
  listBranchTechnicians: (branchId, date) =>
    request(`/app/branches/${branchId}/technicians${date ? `?date=${date}` : ''}`),
  salonCancelBooking: (bookingId, token) =>
    request(`/app/bookings/${bookingId}/salon-cancel`, { method: 'POST', token }),
}
