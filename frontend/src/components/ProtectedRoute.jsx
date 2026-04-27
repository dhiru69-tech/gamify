import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useStore from '../store/useStore'

const LoadingSkeleton = () => (
  <div style={{
    height: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexDirection: 'column', gap: 16,
    background: 'var(--bg-0)',
  }}>
    <div style={{
      width: 40, height: 40,
      border: '3px solid var(--bg-4)',
      borderTop: '3px solid var(--purple)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    <span style={{ fontSize: 13, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
      Loading...
    </span>
  </div>
)

export default function ProtectedRoute({ children }) {
  const { isLoggedIn, fetchMe } = useStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('g_access')
    if (!token) { setChecking(false); return }
    // If we have a token but aren't logged in yet, wait for fetchMe
    if (isLoggedIn) { setChecking(false); return }
    // Retry fetchMe in case App.jsx's call hasn't resolved yet
    fetchMe().finally(() => setChecking(false))
  }, [])

  if (checking && localStorage.getItem('g_access')) return <LoadingSkeleton />
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return children
}
