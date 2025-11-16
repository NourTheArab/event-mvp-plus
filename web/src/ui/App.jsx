import React, { useEffect, useState } from 'react'
import { Login, CreateEvent, MyEvents, Inbox, Approved } from './pages.jsx'
import Admin from './Admin.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [tab, setTab] = useState('approved')

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/me', { credentials: 'include' })
        const ok =
          res.ok &&
          (res.headers.get('content-type') || '').includes('application/json')
        const data = ok ? await res.json() : { user: null }
        setUser(data?.user ?? null)
      } catch {
        setUser(null)
      }
    })()
  }, [])

  const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin')
  const isSuperAdmin = user && user.role === 'superadmin'

  return (
    <>
      {/* Top bar */}
      <header className="header">
        <div className="bar container">
          <h1 className="title">
            SE <span className="subtle">Events</span>
          </h1>

          {/* Nav tabs */}
          <nav className="tabs">
            <button className="btn" onClick={() => setTab('approved')}>
              All Approved
            </button>
            {user && (
              <button className="btn" onClick={() => setTab('create')}>
                Create Event
              </button>
            )}
            {user && (
              <button className="btn" onClick={() => setTab('mine')}>
                My Events
              </button>
            )}
            {isAdmin && (
              <button className="btn" onClick={() => setTab('inbox')}>
                Needs Approval
              </button>
            )}
            {isSuperAdmin && (
              <button className="btn" onClick={() => setTab('admin')}>
                Admin
              </button>
            )}
            <a className="btn link" href="/cal/approved.ics">
              iCal
            </a>
          </nav>

          {/* User / login */}
          <div className="user">
            {!user ? (
              <Login onLogin={setUser} />
            ) : (
              <>
                Signed in as <b>{user.email}</b>{' '}
                <span className="subtle">({user.role})</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container grid">
        {tab === 'approved' &&
          (user ? (
            <Approved />
          ) : (
            <div className="panel pad">
              <p className="empty">Please sign in to view approved events.</p>
            </div>
          ))}

        {tab === 'create' && user && <CreateEvent />}
        {tab === 'mine' && user && <MyEvents />}
        {tab === 'inbox' && isAdmin && <Inbox />}
        {tab === 'admin' && isSuperAdmin && <Admin />}
      </main>
    </>
  )
}
