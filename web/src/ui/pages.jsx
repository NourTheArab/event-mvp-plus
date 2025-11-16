import React, { useEffect, useState } from 'react'


async function safeJSON(url, opts) {
  try {
    const res = await fetch(url, opts)
    const ct = res.headers.get('content-type') || ''
    if (!res.ok || !ct.includes('application/json')) return null
    return await res.json()
  } catch {
    return null
  }
}


export function Login({ onLogin }) {
  const [email, setEmail] = useState('student@example.edu')
  const [token, setToken] = useState('')
  const [step, setStep] = useState(1)

  return (
    <span>
      {step === 1 && (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            try {
              await fetch('/auth/magic/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
              })
              alert(
                'Magic link sent (dev mode: check server logs for the token).'
              )
              setStep(2)
            } catch {
              alert('Could not contact server. Is the API running on :3000?')
            }
          }}
        >
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@earlham.edu"
          />
          <button className="btn primary" style={{ marginLeft: 8 }}>
            Get Link
          </button>
        </form>
      )}

      {step === 2 && (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            try {
              const res = await fetch('/auth/magic/consume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ token }),
              })
              const ct = res.headers.get('content-type') || ''
              const j = ct.includes('application/json') ? await res.json() : null
              if (j?.user) {
                onLogin(j.user)
              } else {
                alert('Bad/expired token or server error.')
              }
            } catch {
              alert('Could not contact server. Is the API running on :3000?')
            }
          }}
        >
          <input
            className="input"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste token from link"
          />
          <button className="btn primary" style={{ marginLeft: 8 }}>
            Sign in
          </button>
        </form>
      )}
    </span>
  )
}

export function CreateEvent() {
  const [groups, setGroups] = useState([])
  const [venues, setVenues] = useState([])

  const [title, setTitle] = useState('')
  const [groupId, setGroupId] = useState('')
  const [venueId, setVenueId] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [attendance, setAttendance] = useState(0)
  const [description, setDescription] = useState('')
  const [wantAV, setWantAV] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    ;(async () => {
      setGroups((await safeJSON('/ref/groups', { credentials: 'include' })) || [])
      setVenues((await safeJSON('/ref/venues', { credentials: 'include' })) || [])
    })()
  }, [])

  async function getServiceId(key) {
    const svc = (await safeJSON('/ref/services', { credentials: 'include' })) || []
    const m = Array.isArray(svc) ? svc.find((s) => s.key === key) : null
    return m?.id
  }

  async function create(e) {
    e.preventDefault()
    const avId = await getServiceId('av')
    const services = wantAV && avId ? [{ serviceId: avId, notes }] : []

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description,
          groupId,
          venueId,
          startsAt,
          endsAt,
          expectedAttendance: Number(attendance),
          services,
        }),
      })
      const ct = res.headers.get('content-type') || ''
      const ev = ct.includes('application/json') ? await res.json() : null

      if (res.ok && ev?.id) {
        const submitRes = await fetch(`/api/events/${ev.id}/submit`, {
          method: 'POST',
          credentials: 'include',
        })
        if (submitRes.ok) {
          alert('Event created and submitted for approval.')
          // quick reset
          setTitle('')
          setGroupId('')
          setVenueId('')
          setStartsAt('')
          setEndsAt('')
          setAttendance(0)
          setDescription('')
          setWantAV(false)
          setNotes('')
        } else {
          alert('Event created, but submit step failed.')
        }
      } else {
        alert('Create failed. Are you signed in?')
      }
    } catch {
      alert('Could not contact server. Is the API running on :3000?')
    }
  }

  return (
    <section className="panel pad" style={{ maxWidth: 820 }}>
      <h2 className="h1">Create Event</h2>

      <form className="grid" style={{ gap: 14 }} onSubmit={create}>
        <label>
          Title
          <input
            className="input"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
          />
        </label>

        <div className="row" style={{ gap: 10 }}>
          <label style={{ flex: 1 }}>
            Group
            <select
              className="select"
              required
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            >
              <option value="">Select Group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ flex: 1 }}>
            Venue
            <select
              className="select"
              required
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
            >
              <option value="">Select Venue</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} (cap {v.capacity})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <label style={{ flex: 1 }}>
            Starts <span className="hint">(local time)</span>
            <input
              className="datetime"
              required
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>
          <label style={{ flex: 1 }}>
            Ends
            <input
              className="datetime"
              required
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </label>
        </div>

        <label>
          Expected Attendance
          <input
            className="input"
            type="number"
            min="0"
            value={attendance}
            onChange={(e) => setAttendance(e.target.value)}
            placeholder="e.g., 120"
          />
        </label>

        <label>
          Description <span className="hint">(optional)</span>
          <textarea
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this event about?"
          />
        </label>

        <label className="row" style={{ gap: 10 }}>
          <input
            type="checkbox"
            checked={wantAV}
            onChange={(e) => setWantAV(e.target.checked)}
          />
          Request AV support
        </label>

        {wantAV && (
          <label>
            AV details
            <input
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mics, projector, stage riser, etc."
            />
          </label>
        )}

        <div className="row right">
          <button className="btn primary">Create &amp; Submit</button>
        </div>
      </form>
    </section>
  )
}


export function MyEvents() {
  const [items, setItems] = useState([])

  useEffect(() => {
    ;(async () => {
      const data = await safeJSON('/api/my/events', { credentials: 'include' })
      setItems(Array.isArray(data) ? data : [])
    })()
  }, [])

  return <List items={items} title="My Events" />
}


export function Inbox() {
  const [items, setItems] = useState([])

  async function load() {
    const data = await safeJSON('/api/inbox/submissions', {
      credentials: 'include',
    })
    setItems(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    load()
  }, [])

  async function decide(id, decision) {
    try {
      const r = await fetch(`/api/events/${id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ decision }),
      })
      if (r.ok) load()
    } catch {
      // ignore
    }
  }

  return (
    <section className="panel pad">
      <h2 className="h1">Needs Approval</h2>
      {!items.length && (
        <div className="empty">No pending submissions right now.</div>
      )}
      <div className="grid cards">
        {items.map((e) => (
          <article key={e.id} className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{e.title}</div>
                <div className="subtle">
                  {e.group?.name} — {e.venue?.name}
                </div>
              </div>
              {e.conflict && <span className="badge warn">⚠ conflict</span>}
            </div>
            <div className="subtle" style={{ marginTop: 8 }}>
              {new Date(e.startsAt).toLocaleString()} →{' '}
              {new Date(e.endsAt).toLocaleString()}
            </div>
            {e.description && (
              <div style={{ marginTop: 8 }}>{e.description}</div>
            )}
            <div className="row right" style={{ marginTop: 12 }}>
              <button className="btn" onClick={() => decide(e.id, 'declined')}>
                Decline
              </button>
              <button
                className="btn primary"
                onClick={() => decide(e.id, 'approved')}
              >
                Approve
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function Approved() {
  const [items, setItems] = useState([])

  useEffect(() => {
    ;(async () => {
      const data = await safeJSON('/api/events/approved', {
        credentials: 'include',
      })
      setItems(Array.isArray(data) ? data : [])
    })()
  }, [])

  return <List items={items} title="All Approved" />
}

function List({ items, title }) {
  const safe = Array.isArray(items) ? items : []

  return (
    <section className="panel pad">
      <h2 className="h1">{title}</h2>
      {!safe.length && <div className="empty">Nothing yet.</div>}
      <div className="grid cards">
        {safe.map((e) => (
          <article key={e.id} className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{e.title}</div>
                <div className="subtle">
                  {e.group?.name} — {e.venue?.name}
                </div>
              </div>
              {e.status === 'approved' && (
                <span className="badge ok">Approved</span>
              )}
              {e.conflict && <span className="badge warn">⚠ conflict</span>}
            </div>
            <div className="subtle" style={{ marginTop: 8 }}>
              {e.startsAt ? new Date(e.startsAt).toLocaleString() : ''} →{' '}
              {e.endsAt ? new Date(e.endsAt).toLocaleString() : ''}
            </div>
            {e.description && (
              <div style={{ marginTop: 8 }}>{e.description}</div>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
