import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
}

const PERIOD_LABELS = {
  today: 'Today',
  this_week: 'This week',
  this_month: 'This month',
  this_year: 'This year',
}

export default function DashboardPage() {
  const { auth } = useAuth()
  const [branches, setBranches] = useState([])
  const [branchId, setBranchId] = useState('')
  const [summary, setSummary] = useState(null)
  const [revenue, setRevenue] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!auth || auth.role !== 'admin') return
    api.listBranches().then(setBranches).catch(() => {})
  }, [auth])

  useEffect(() => {
    if (!auth || auth.role !== 'admin') return
    setSummary(null)
    setRevenue(null)
    Promise.all([
      api.dashboardSummary(branchId || null, auth.token),
      api.dashboardRevenue(branchId || null, auth.token),
    ])
      .then(([summaryData, revenueData]) => {
        setSummary(summaryData)
        setRevenue(revenueData)
      })
      .catch((err) => setError(err.message))
  }, [auth, branchId])

  if (!auth) return <Navigate to="/login" replace />
  if (auth.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div className="container">
      <h1>Dashboard</h1>

      <label className="branch-filter">
        Branch
        <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="error-text">{error}</p>}
      {!summary && !error && <p className="muted">Loading...</p>}

      {revenue && (
        <>
          <h2 className="dash-heading">Bank revenue</h2>
          <div className="revenue-grid">
            <div className="card">
              <h3>Deposits collected</h3>
              <div className="stat-row">
                {Object.entries(revenue.deposit_revenue).map(([period, value]) => (
                  <div key={period} className="stat-tile">
                    <span className="muted">{PERIOD_LABELS[period]}</span>
                    <strong>£{value.toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <h3>Total revenue (deposit + final payment)</h3>
              <div className="stat-row">
                {Object.entries(revenue.total_revenue).map(([period, value]) => (
                  <div key={period} className="stat-tile">
                    <span className="muted">{PERIOD_LABELS[period]}</span>
                    <strong>£{value.toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {summary && (
        <>
          <h2 className="dash-heading">Today ({summary.date})</h2>
          <div className="stat-row">
            {Object.entries(summary.bookings_today).map(([status, count]) => (
              <div key={status} className="stat-tile">
                <span className="muted">{STATUS_LABELS[status]}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>

          <div className="stat-row" style={{ marginTop: '0.6rem' }}>
            <div className="stat-tile">
              <span className="muted">Queue waiting</span>
              <strong>{summary.queue_waiting_count}</strong>
            </div>
            <div className="stat-tile">
              <span className="muted">Pending custom designs</span>
              <strong>{summary.pending_custom_designs}</strong>
            </div>
            <div className="stat-tile">
              <span className="muted">Active staff</span>
              <strong>{summary.active_staff_count}</strong>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
