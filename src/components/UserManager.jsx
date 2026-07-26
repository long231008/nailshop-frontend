import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

// Admin tool: browse accounts, promote a customer to staff at a branch, or
// revoke staff rights again.
export default function UserManager({ branches, token }) {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [users, setUsers] = useState(null)
  const [error, setError] = useState(null)

  // Grant form state, keyed to the user being promoted.
  const [grantingId, setGrantingId] = useState(null)
  const [grantBranchId, setGrantBranchId] = useState('')
  const [grantName, setGrantName] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => {
    const params = { limit: 50 }
    if (query.trim()) params.q = query.trim()
    if (roleFilter) params.role = roleFilter
    api
      .listUsers(params, token)
      .then(setUsers)
      .catch((err) => setError(err.message))
  }, [query, roleFilter, token])

  useEffect(() => {
    setError(null)
    const timer = setTimeout(reload, 300)
    return () => clearTimeout(timer)
  }, [reload])

  const startGrant = (user) => {
    setGrantingId(user.id)
    setGrantBranchId(user.staff_branch_id || branches[0]?.id || '')
    setGrantName(user.staff_display_name || '')
  }

  const submitGrant = async (userId) => {
    setError(null)
    setBusy(true)
    try {
      await api.grantStaff(
        userId,
        { branch_id: grantBranchId, display_name: grantName },
        token
      )
      setGrantingId(null)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const submitRevoke = async (userId) => {
    setError(null)
    setBusy(true)
    try {
      await api.revokeStaff(userId, token)
      reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const branchName = (id) => branches.find((b) => b.id === id)?.name || 'Unknown branch'

  return (
    <>
      <h2 className="dash-heading">User accounts</h2>
      <div className="user-filters">
        <input
          className="input"
          type="search"
          placeholder="Search by phone or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="input"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All roles</option>
          <option value="customer">Customers</option>
          <option value="staff">Staff</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {error && <p className="error-text">{error}</p>}
      {users === null && <p className="muted">Loading users...</p>}
      {users?.length === 0 && <p className="muted">No accounts match.</p>}

      {users?.length > 0 && (
        <div className="service-list">
          {users.map((user) => (
            <div key={user.id} className="card user-row">
              <div className="service-row-info">
                <strong>{user.phone_number || user.email || user.id.slice(0, 8)}</strong>
                <p className="muted">
                  {user.phone_number && user.email ? `${user.email} · ` : ''}
                  <span className={`badge badge-${user.status}`}>{user.role}</span>
                  {user.staff_display_name && user.staff_status === 'active' && (
                    <>
                      {' '}
                      — {user.staff_display_name} @ {branchName(user.staff_branch_id)}
                    </>
                  )}
                </p>
              </div>

              <div className="service-row-action">
                {user.role === 'customer' && (
                  <button className="btn btn-outline" onClick={() => startGrant(user)}>
                    Grant staff
                  </button>
                )}
                {user.role === 'staff' && (
                  <button
                    className="btn btn-danger-outline"
                    disabled={busy}
                    onClick={() => submitRevoke(user.id)}
                  >
                    Revoke staff
                  </button>
                )}
              </div>

              {grantingId === user.id && (
                <div className="booking-row-extra grant-form">
                  <select
                    className="input"
                    value={grantBranchId}
                    onChange={(e) => setGrantBranchId(e.target.value)}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="text"
                    placeholder="Display name (shown to customers)"
                    maxLength={255}
                    value={grantName}
                    onChange={(e) => setGrantName(e.target.value)}
                  />
                  <div className="grant-form-actions">
                    <button
                      className="btn"
                      disabled={busy || !grantName.trim() || !grantBranchId}
                      onClick={() => submitGrant(user.id)}
                    >
                      {busy ? 'Granting...' : 'Confirm'}
                    </button>
                    <button className="btn btn-outline" onClick={() => setGrantingId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
