import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

// Web version of the v3.2 intake template (price list + capability matrix).
// The menu shows the *listed* duration customers read; the scheduler runs on
// the *real minutes* per technician entered here. An empty cell means the
// technician cannot do that service and is never assigned it.

const SKILL_GROUPS = ['MANI', 'PEDI', 'GEL', 'DAP_BOT', 'DESIGN', 'WAX', 'KHAC']
const ZONES = ['HANDS', 'FEET', 'OTHER']
// A service claims one physical spot; the branch holds a fixed count of each
// (set under "Branch capacity"). TABLE / PEDI_CHAIR / MASSAGE_BED are the
// tracked ones. Leave blank for a service that needs no limited resource.
const RESOURCES = ['', 'TABLE', 'PEDI_CHAIR', 'MASSAGE_BED', 'WAX_ROOM']
const CATEGORIES = [
  'polish',
  'gel',
  'full_set',
  'infill',
  'removal',
  'biab',
  'addon',
  'hydro_head_massage',
]
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function cellState(value, menuMinutes) {
  if (value === '' || value === null || value === undefined) return 'empty'
  const minutes = Number(value)
  if (Number.isNaN(minutes) || minutes < 5 || minutes > 240) return 'error'
  if (menuMinutes && minutes > 3 * menuMinutes) return 'suspicious'
  return 'ok'
}

function newService() {
  return {
    id: null,
    branch_id: null,
    name: '',
    category: 'gel',
    description: null,
    duration_min: 30,
    base_price: 0,
    skill_group: 'GEL',
    body_zone: 'HANDS',
    resource: null,
    turn_weight: 1,
    buffer_after_min: 5,
    _key: `new-${Math.random().toString(36).slice(2)}`,
  }
}

export default function CapabilityMatrix({ token }) {
  const [services, setServices] = useState(null)
  const [staff, setStaff] = useState([])
  // capability[staffId][serviceKey] = minutes ('' = cannot do)
  const [capability, setCapability] = useState({})
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null)

  useEffect(() => {
    api
      .capabilityMatrix(token)
      .then((data) => {
        setServices(data.services.map((s) => ({ ...s, _key: s.id })))
        setStaff(data.staff)
        setCapability(data.capability)
      })
      .catch((err) => setError(err.message))
  }, [token])

  const updateService = (key, field, value) => {
    setServices((prev) =>
      prev.map((service) => (service._key === key ? { ...service, [field]: value } : service))
    )
  }

  const updateStaff = (staffId, field, value) => {
    setStaff((prev) => prev.map((t) => (t.id === staffId ? { ...t, [field]: value } : t)))
  }

  // Full time means "no hours of your own": the technician follows the shop's
  // opening, so nothing is stored and changing the shop's hours moves them too.
  const setFullTime = (staffId, fullTime) => {
    setStaff((prev) =>
      prev.map((t) =>
        t.id === staffId
          ? {
              ...t,
              work_start_hour: fullTime ? null : 9,
              work_end_hour: fullTime ? null : 13,
            }
          : t
      )
    )
  }

  const toggleDayOff = (staffId, day) => {
    setStaff((prev) =>
      prev.map((t) => {
        if (t.id !== staffId) return t
        const days = new Set(
          t.days_off.split(',').filter((part) => part !== '').map(Number)
        )
        if (days.has(day)) days.delete(day)
        else days.add(day)
        return { ...t, days_off: [...days].sort().join(',') }
      })
    )
  }

  const updateCell = (staffId, serviceKey, value) => {
    setCapability((prev) => ({
      ...prev,
      [staffId]: { ...(prev[staffId] || {}), [serviceKey]: value },
    }))
  }

  const coverage = useMemo(() => {
    if (!services) return {}
    const result = {}
    for (const service of services) {
      result[service._key] = staff.filter((t) => {
        const value = capability[t.id]?.[service._key]
        return value !== '' && value !== null && value !== undefined
      }).length
    }
    return result
  }, [services, staff, capability])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaveResult(null)
    try {
      // New services need real ids first, so save runs in two steps: the rows,
      // then the matrix against the ids the backend handed back.
      const payload = {
        services: services
          .filter((s) => s.name.trim() !== '')
          .map((s) => ({
            id: s.id,
            branch_id: s.branch_id,
            name: s.name,
            category: s.category,
            description: s.description || null,
            duration_min: Number(s.duration_min) || 30,
            base_price: Number(s.base_price) || 0,
            skill_group: s.skill_group,
            body_zone: s.body_zone,
            resource: s.resource || null,
            turn_weight: Number(s.turn_weight) || 1,
            buffer_after_min: Number(s.buffer_after_min) || 0,
          })),
        staff: staff.map((t) => ({
          id: t.id,
          days_off: t.days_off,
          // Null on both is what marks a full-timer, so an empty box must stay
          // null rather than becoming 0 - that would mean "in from midnight".
          work_start_hour: t.work_start_hour == null || t.work_start_hour === ''
            ? null
            : Number(t.work_start_hour),
          work_end_hour: t.work_end_hour == null || t.work_end_hour === ''
            ? null
            : Number(t.work_end_hour),
          max_hours_week: Number(t.max_hours_week) || 40,
        })),
        capability: Object.fromEntries(
          Object.entries(capability).map(([staffId, cells]) => [
            staffId,
            Object.fromEntries(
              Object.entries(cells)
                .filter(
                  ([serviceKey, minutes]) =>
                    minutes !== '' &&
                    minutes !== null &&
                    minutes !== undefined &&
                    // Cells of brand-new (unsaved) services can't be sent yet.
                    !String(serviceKey).startsWith('new-')
                )
                .map(([serviceKey, minutes]) => [serviceKey, Number(minutes)])
            ),
          ])
        ),
      }
      const result = await api.saveCapabilityMatrix(payload, token)
      setSaveResult(result)
      // Reload so new services get their ids and appear as matrix rows.
      const fresh = await api.capabilityMatrix(token)
      setServices(fresh.services.map((s) => ({ ...s, _key: s.id })))
      setStaff(fresh.staff)
      setCapability(fresh.capability)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const exportCsv = () => {
    const header = ['service', 'menu_min', ...staff.map((t) => t.display_name)]
    const lines = [header.join(',')]
    for (const service of services) {
      lines.push(
        [
          `"${service.name.replace(/"/g, '""')}"`,
          service.duration_min,
          ...staff.map((t) => capability[t.id]?.[service._key] ?? ''),
        ].join(',')
      )
    }
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'capability-matrix.csv'
    link.click()
  }

  // The heading stays put even while loading or after a failed load, like every
  // other dashboard panel: a section that vanishes entirely reads as "this
  // feature does not exist" instead of "this feature could not load".
  if (!services)
    return (
      <section className="matrix-section">
        <h2 className="dash-heading">Price list &amp; technician capability</h2>
        {error ? (
          <p className="error-text">{error}</p>
        ) : (
          <p className="muted">Loading price list &amp; capability matrix...</p>
        )}
      </section>
    )

  const sellable = services.filter((s) => coverage[s._key] > 0).length

  return (
    <section className="matrix-section">
      <h2 className="dash-heading">Price list &amp; technician capability</h2>
      <p className="muted">
        The menu duration is what customers see. Scheduling runs on each technician&apos;s{' '}
        <strong>real minutes</strong> below — leave a cell empty if that technician cannot do the
        service. That grid is the whole story: a time is offered when the bookings overlapping it
        can be shared out among technicians who can each do their own service, so filling the
        cells honestly is all that is asked of you. Bookings for a day close at 21:00 the evening
        before; technicians are then assigned automatically.
      </p>

      <div className="card matrix-card">
        <h3>1. Price list (what customers see)</h3>
        <p className="muted">
          <strong>Skill group</strong> decides where technicians are sent when the chain has more
          than one salon; it no longer limits how much can be sold. <strong>Chair/room</strong>{' '}
          ties a service to a physical spot counted under Branch capacity.
        </p>
        <div className="matrix-scroll">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Service name</th>
                <th>Category</th>
                <th>Skill group</th>
                <th>Price (£)</th>
                <th>Menu (min)</th>
                <th>Body zone</th>
                <th>Chair/room</th>
                <th>Clean-up (min)</th>
                <th>Turn weight</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service._key}>
                  <td>
                    <input
                      className="input matrix-input"
                      value={service.name}
                      placeholder="e.g. Gel full set"
                      onChange={(e) => updateService(service._key, 'name', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="input matrix-input"
                      value={service.category}
                      onChange={(e) => updateService(service._key, 'category', e.target.value)}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="input matrix-input"
                      value={service.skill_group}
                      onChange={(e) => updateService(service._key, 'skill_group', e.target.value)}
                    >
                      {SKILL_GROUPS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="input matrix-input matrix-num"
                      type="number"
                      min="0"
                      value={service.base_price}
                      onChange={(e) => updateService(service._key, 'base_price', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="input matrix-input matrix-num"
                      type="number"
                      min="5"
                      value={service.duration_min}
                      onChange={(e) => updateService(service._key, 'duration_min', e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      className="input matrix-input"
                      value={service.body_zone}
                      onChange={(e) => updateService(service._key, 'body_zone', e.target.value)}
                    >
                      {ZONES.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="input matrix-input"
                      value={service.resource || ''}
                      onChange={(e) => updateService(service._key, 'resource', e.target.value)}
                    >
                      {RESOURCES.map((r) => (
                        <option key={r} value={r}>
                          {r === '' ? '(regular table)' : r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="input matrix-input matrix-num"
                      type="number"
                      min="0"
                      max="60"
                      value={service.buffer_after_min}
                      onChange={(e) =>
                        updateService(service._key, 'buffer_after_min', e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="input matrix-input matrix-num"
                      type="number"
                      min="0"
                      max="5"
                      step="0.5"
                      value={service.turn_weight}
                      onChange={(e) => updateService(service._key, 'turn_weight', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setServices((prev) => [...prev, newService()])}
        >
          + Add service
        </button>
      </div>

      <div className="card matrix-card">
        <h3>2. Technicians — weekly days off &amp; hours cap</h3>
        <div className="matrix-scroll">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Technician</th>
                <th>Status</th>
                <th>Days off (weekly)</th>
                <th>Hours</th>
                <th>Max hours/week</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((t) => (
                <tr key={t.id}>
                  <td><strong>{t.display_name}</strong></td>
                  <td className="muted">{t.status}</td>
                  <td>
                    <div className="dayoff-row">
                      {DAY_LABELS.map((label, day) => {
                        const active = t.days_off.split(',').includes(String(day))
                        return (
                          <button
                            key={day}
                            type="button"
                            className={'btn btn-outline day-chip' + (active ? ' day-chip-on' : '')}
                            title={active ? `${label}: day off` : `${label}: working`}
                            onClick={() => toggleDayOff(t.id, day)}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                  <td>
                    <div className="hours-cell">
                      <label className="hours-toggle">
                        <input
                          type="checkbox"
                          checked={t.work_start_hour == null && t.work_end_hour == null}
                          onChange={(e) => setFullTime(t.id, e.target.checked)}
                        />
                        Full time
                      </label>
                      {(t.work_start_hour != null || t.work_end_hour != null) && (
                        <span className="hours-range">
                          <input
                            className="input matrix-input matrix-num"
                            type="number"
                            min="0"
                            max="23"
                            value={t.work_start_hour ?? ''}
                            onChange={(e) => updateStaff(t.id, 'work_start_hour', e.target.value)}
                          />
                          <span className="muted">to</span>
                          <input
                            className="input matrix-input matrix-num"
                            type="number"
                            min="1"
                            max="24"
                            value={t.work_end_hour ?? ''}
                            onChange={(e) => updateStaff(t.id, 'work_end_hour', e.target.value)}
                          />
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <input
                      className="input matrix-input matrix-num"
                      type="number"
                      min="0"
                      max="80"
                      value={t.max_hours_week}
                      onChange={(e) => updateStaff(t.id, 'max_hours_week', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {staff.length === 0 && (
          <p className="muted">
            No staff yet — grant staff access to a user in the section below first.
          </p>
        )}
      </div>

      <div className="card matrix-card">
        <h3>3. Capability matrix — real minutes per technician</h3>
        <p className="muted">
          Enter the minutes that technician actually needs (5–240). Empty = cannot do. Orange
          outline = more than 3× the menu duration, check for a typo. Every filled cell widens
          what the salon can sell at once — an all-rounder counts wherever they are needed, and a
          service only one technician can do is never sold twice at the same time.
        </p>
        <div className="matrix-scroll">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Service \ Technician</th>
                <th>Menu</th>
                {staff.map((t) => (
                  <th key={t.id} className="matrix-center">
                    {t.display_name}
                  </th>
                ))}
                <th>Coverage</th>
              </tr>
            </thead>
            <tbody>
              {services
                .filter((s) => s.id !== null)
                .map((service) => (
                  <tr key={service._key}>
                    <td><strong>{service.name}</strong></td>
                    <td className="muted">{service.duration_min}&apos;</td>
                    {staff.map((t) => {
                      const value = capability[t.id]?.[service._key] ?? ''
                      const state = cellState(value, Number(service.duration_min))
                      return (
                        <td key={t.id}>
                          <input
                            className={
                              'input matrix-input matrix-num matrix-cell' +
                              (state === 'error' ? ' matrix-cell-error' : '') +
                              (state === 'suspicious' ? ' matrix-cell-hint' : '')
                            }
                            type="number"
                            min="5"
                            max="240"
                            value={value}
                            onChange={(e) => updateCell(t.id, service._key, e.target.value)}
                          />
                        </td>
                      )
                    })}
                    <td
                      className={coverage[service._key] > 0 ? 'matrix-ok' : 'matrix-bad'}
                    >
                      {coverage[service._key] > 0
                        ? `✓ ${coverage[service._key]} can do it`
                        : '⚠ nobody can do it'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="muted">
          {services.filter((s) => s.id !== null).length} services · {staff.length} technicians ·{' '}
          {sellable}/{services.length} sellable
        </p>
        {services.some((s) => s.id === null && s.name.trim() !== '') && (
          <p className="muted">
            New services appear as matrix rows after the first save.
          </p>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}
      {saveResult && (
        <div className="card matrix-card">
          <p>✅ Saved.</p>
          {saveResult.warnings.map((w, i) => (
            <p key={i} className="error-text">⚠ {w}</p>
          ))}
          {saveResult.affected_bookings.length > 0 && (
            <>
              <p className="error-text">
                {saveResult.affected_bookings.length} future booking(s) are assigned to a
                technician who can no longer do that service — reassign them in the allocation
                panel or call the customer:
              </p>
              <ul>
                {saveResult.affected_bookings.map((b, i) => (
                  <li key={i} className="muted">
                    Booking {b.booking_id.slice(0, 8)} at{' '}
                    {new Date(b.start_time).toLocaleString()}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="matrix-actions">
        <button type="button" className="btn btn-gold" disabled={saving} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save price list & matrix'}
        </button>
        <button type="button" className="btn btn-outline" onClick={exportCsv}>
          ⬇ Export matrix (CSV)
        </button>
      </div>
    </section>
  )
}
