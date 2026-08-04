import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

// The salon's fixed physical capacity: how many services of each kind can run
// at the same instant, whatever the technician headcount. 0 = not tracked.
const FIELDS = [
  ['pedicure_chairs', 'Pedicure chairs'],
  ['manicure_tables', 'Manicure tables'],
  ['massage_beds', 'Head-massage beds'],
]

export default function BranchResources({ branchId, token }) {
  const [values, setValues] = useState(null)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    setError(null)
    setSaved(false)
    api
      .getBranch(branchId)
      .then((b) =>
        setValues({
          pedicure_chairs: b.pedicure_chairs ?? 0,
          manicure_tables: b.manicure_tables ?? 0,
          massage_beds: b.massage_beds ?? 0,
        })
      )
      .catch((err) => setError(err.message))
  }, [branchId])

  useEffect(() => {
    setValues(null)
    load()
  }, [load])

  const handleSave = async () => {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const payload = Object.fromEntries(
        FIELDS.map(([key]) => [key, Math.max(0, Number(values[key]) || 0)])
      )
      const updated = await api.updateBranch(branchId, payload, token)
      setValues({
        pedicure_chairs: updated.pedicure_chairs,
        manicure_tables: updated.manicure_tables,
        massage_beds: updated.massage_beds,
      })
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="matrix-section">
      <h2 className="dash-heading">Branch capacity</h2>
      <p className="muted">
        Fixed number of chairs, tables and beds at this branch. A service uses one of these
        through its <strong>Chair/room</strong> setting in the price list. Leave a number at 0 to
        stop tracking it (unlimited). This never changes, so the scheduler will never sell more
        pedicures than you have chairs.
      </p>
      {error && <p className="error-text">{error}</p>}
      {!values && !error && <p className="muted">Loading...</p>}
      {values && (
        <div className="card matrix-card">
          <div className="lock-controls">
            {FIELDS.map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  className="input matrix-num"
                  type="number"
                  min="0"
                  value={values[key]}
                  onChange={(e) => {
                    setSaved(false)
                    setValues((prev) => ({ ...prev, [key]: e.target.value }))
                  }}
                />
              </label>
            ))}
          </div>
          <div className="matrix-actions">
            <button className="btn btn-gold" disabled={busy} onClick={handleSave}>
              {busy ? 'Saving...' : 'Save capacity'}
            </button>
            {saved && <span className="matrix-ok">✓ Saved</span>}
          </div>
        </div>
      )}
    </section>
  )
}
