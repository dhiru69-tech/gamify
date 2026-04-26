import { Component } from 'react'

export default class EditorErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12, background: 'var(--bg-1)', color: 'var(--text-3)',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ fontSize: 13, fontFamily: 'var(--mono)' }}>Editor failed to load.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 20px', borderRadius: 8, background: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13 }}
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
