import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import toast from 'react-hot-toast'
import api from '../api/client'
import useStore from '../store/useStore'
import LevelUpModal from '../components/LevelUpModal'
import EditorErrorBoundary from '../components/EditorErrorBoundary'

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const BackIcon = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>)
const RunIcon  = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>)
const HintIcon = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>)
const PassIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>)
const FailIcon = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>)
const ClockIcon= () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>)

const Spinner = () => (
  <span style={{ display: 'inline-block', animation: 'spin 0.7s linear infinite', lineHeight: 0 }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  </span>
)

const MODE_LABELS = { puzzle: 'Puzzle', battle: 'Battle', quest: 'Quest', debug: 'Debug', boss: 'Boss' }
const LANG_MAP    = { python: 'python', javascript: 'javascript', cpp: 'cpp', java: 'java' }
const DIFF_COLOR  = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444', boss: '#ec4899' }

export default function GamePlay() {
  const { id }      = useParams()
  const navigate    = useNavigate()
  const { addXP }   = useStore()
  const [ch, setCh] = useState(null)
  const [code, setCode]           = useState('')
  const [timeLeft, setTimeLeft]   = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]       = useState(null)
  const [levelUp, setLevelUp]     = useState(null)
  const [xpFloat, setXpFloat]     = useState(null)
  const [leftTab, setLeftTab]     = useState('problem')
  const [bottomTab, setBottomTab] = useState('testcases')
  const [bottomOpen, setBottomOpen] = useState(true)
  const [editorReady, setEditorReady] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const startTime   = useRef(Date.now())
  const timerRef    = useRef(null)
  const inflightRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    api.get(`/challenges/${id}`)
      .then(r => {
        if (cancelled) return
        setCh(r.data)
        setCode(r.data.starter_code)
        setTimeLeft(r.data.time_limit)
        startTime.current = Date.now()
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Failed to load challenge. Check your connection.')
          setLoadError(true)
        }
      })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (!ch) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); toast.error("Time's up"); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [ch])

  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const timerColor = timeLeft < 60 ? '#ef4444' : timeLeft < 120 ? '#f59e0b' : 'var(--text-1)'
  const timerClass = timeLeft < 60 ? 'danger' : timeLeft < 120 ? 'warning' : 'normal'

  const showHint = () => {
    if (!ch || hintsUsed >= ch.hints.length) return
    setHintsUsed(h => h + 1)
    setLeftTab('hints')
    toast('Hint unlocked — 10 XP deducted on pass', { icon: null, duration: 3000 })
  }

  const submit = async () => {
    if (!ch || inflightRef.current || timeLeft === 0) return
    inflightRef.current = true
    setSubmitting(true)
    clearInterval(timerRef.current)
    setBottomTab('output')
    setBottomOpen(true)
    const timeTaken = (Date.now() - startTime.current) / 1000
    try {
      const { data } = await api.post('/challenges/submit', {
        challenge_id: parseInt(id), code, time_taken: timeTaken, hints_used: hintsUsed,
      })
      setResult(data)
      if (data.passed) {
        setXpFloat(`+${data.xp_earned} XP`)
        setTimeout(() => setXpFloat(null), 2500)
        addXP(data.xp_earned, data.level_up ? data.new_level : null)
        if (data.level_up) setTimeout(() => setLevelUp(data.new_level), 600)
        else toast.success(`Accepted — +${data.xp_earned} XP`)
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Submission failed. Please try again.'
      toast.error(msg)
      setResult({ passed: false, message: msg, error: true })
    } finally {
      setSubmitting(false)
      setTimeout(() => { inflightRef.current = false }, 800)
    }
  }

  // Loading state
  if (loadError) return (
    <div style={{ height: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <FailIcon />
      <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Failed to load challenge.</p>
      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/play')}>Back to Challenges</button>
    </div>
  )

  if (!ch) return (
    <div style={{ height: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--bg-4)', borderTop: '3px solid var(--purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-3)' }}>Loading challenge...</span>
    </div>
  )

  return (
    <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', background: 'var(--bg-0)', overflow: 'hidden' }}>

      {/* ── Top Bar ── */}
      <div style={{
        background: 'var(--bg-1)', borderBottom: '1px solid var(--border)',
        padding: '0 16px', height: 48, display: 'flex', alignItems: 'center',
        gap: 10, flexShrink: 0,
      }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/play')} style={{ gap: 5 }}>
          <BackIcon /> Back
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-1)' }}>
            {ch.title}
          </span>
          <span className={`pill pill-${ch.difficulty}`}>{ch.difficulty}</span>
          <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text-3)', background: 'var(--bg-3)', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {MODE_LABELS[ch.game_mode]}
          </span>
        </div>

        {/* Timer */}
        <div className={`timer ${timerClass}`} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <ClockIcon />{fmt(timeLeft)}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />

        <button
          className="btn btn-secondary btn-sm"
          onClick={showHint}
          disabled={hintsUsed >= ch.hints.length || submitting}
          style={{ gap: 5 }}
          title={`${ch.hints.length - hintsUsed} hints left`}
        >
          <HintIcon />
          Hint {hintsUsed > 0 ? `(${hintsUsed}/${ch.hints.length})` : `(${ch.hints.length})`}
        </button>

        <button
          onClick={submit}
          disabled={submitting || timeLeft === 0}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '7px 20px', borderRadius: 8, border: 'none',
            fontSize: 13, fontWeight: 700,
            cursor: submitting || timeLeft === 0 ? 'not-allowed' : 'pointer',
            background: submitting || timeLeft === 0 ? 'var(--bg-4)' : 'linear-gradient(135deg, var(--purple), #8b5cf6)',
            color: submitting || timeLeft === 0 ? 'var(--text-3)' : '#fff',
            boxShadow: submitting ? 'none' : '0 2px 14px rgba(124,58,237,0.4)',
            transition: 'all 0.2s',
          }}
        >
          {submitting ? <><Spinner /> Running...</> : <><RunIcon /> Submit</>}
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── Left Panel ── */}
        <div style={{ width: 360, flexShrink: 0, background: 'var(--bg-1)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', flexShrink: 0 }}>
            {['problem', 'hints'].map(t => (
              <button key={t} onClick={() => setLeftTab(t)} style={{
                padding: '11px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: 'none', border: 'none',
                color: leftTab === t ? 'var(--purple-light)' : 'var(--text-3)',
                borderBottom: `2px solid ${leftTab === t ? 'var(--purple)' : 'transparent'}`,
                transition: 'all 0.15s',
              }}>
                {t === 'hints' && hintsUsed > 0 ? `Hints (${hintsUsed})` : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px' }}>
            {leftTab === 'problem' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
                  <span style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{ch.language}</span>
                  <span>·</span>
                  <span style={{ color: 'var(--orange)', fontWeight: 700 }}>+{ch.xp_reward} XP</span>
                  <span>·</span>
                  <span>{Math.floor(ch.time_limit / 60)}m limit</span>
                </div>

                {ch.story && (
                  <div style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 8, padding: '10px 13px', marginBottom: 16, fontSize: 12, color: 'var(--purple-light)', lineHeight: 1.7, fontStyle: 'italic' }}>
                    {ch.story}
                  </div>
                )}

                <h3 style={{ fontSize: 15, marginBottom: 10, color: 'var(--text-1)', fontWeight: 700 }}>{ch.title}</h3>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.85, marginBottom: 20 }}>
                  {ch.description}
                </div>

                {ch.test_cases?.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Examples</div>
                    {ch.test_cases.slice(0, 2).map((tc, i) => (
                      <div key={i} style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 12, fontFamily: 'var(--mono)', borderLeft: `3px solid ${DIFF_COLOR[ch.difficulty] || 'var(--purple)'}` }}>
                        <div style={{ color: 'var(--text-3)', marginBottom: 5, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Example {i + 1}</div>
                        {tc.input?.length > 0 && (
                          <div style={{ marginBottom: 3 }}>
                            <span style={{ color: 'var(--text-3)' }}>Input:&nbsp;</span>
                            <span style={{ color: 'var(--text-1)' }}>{JSON.stringify(tc.input)}</span>
                          </div>
                        )}
                        <div>
                          <span style={{ color: 'var(--text-3)' }}>Output:&nbsp;</span>
                          <span style={{ color: 'var(--green)', fontWeight: 600 }}>{tc.expected_output}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, padding: '10px 13px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Constraints</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)', lineHeight: 1.7 }}>
                    Time limit: {Math.floor(ch.time_limit / 60)}m{ch.time_limit % 60 > 0 ? ` ${ch.time_limit % 60}s` : ''}<br/>
                    XP reward: {ch.xp_reward} (−10 per hint)
                  </div>
                </div>
              </>
            )}

            {leftTab === 'hints' && (
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.6 }}>
                  Each hint costs 10 XP from your reward. Use wisely.
                </p>
                {hintsUsed === 0 && (
                  <button className="btn btn-secondary" style={{ width: '100%', gap: 6 }} onClick={showHint}>
                    <HintIcon /> Reveal First Hint
                  </button>
                )}
                {ch.hints.slice(0, hintsUsed).map((h, i) => (
                  <div key={i} style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 8, padding: '10px 13px', marginBottom: 8, fontSize: 12, color: 'var(--amber)', lineHeight: 1.65 }}>
                    <span style={{ fontWeight: 700, display: 'block', marginBottom: 3 }}>Hint {i + 1}</span>
                    {h}
                  </div>
                ))}
                {hintsUsed > 0 && hintsUsed < ch.hints.length && (
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: 8, width: '100%' }} onClick={showHint}>
                    Reveal Hint {hintsUsed + 1}
                  </button>
                )}
                {hintsUsed >= ch.hints.length && hintsUsed > 0 && (
                  <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginTop: 8 }}>All hints used</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Editor + Output ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          <EditorErrorBoundary>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              {!editorReady && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)', zIndex: 1 }}>
                  <div style={{ width: 28, height: 28, border: '2px solid var(--bg-4)', borderTop: '2px solid var(--purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
              )}
              <Editor
                height="100%"
                language={LANG_MAP[ch.language]}
                value={code}
                onChange={val => setCode(val || '')}
                theme="vs-dark"
                onMount={() => setEditorReady(true)}
                loading={null}
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  renderLineHighlight: 'line',
                  cursorBlinking: 'smooth',
                  padding: { top: 16, bottom: 16 },
                  tabSize: 4,
                  wordWrap: 'off',
                  bracketPairColorization: { enabled: true },
                  renderWhitespace: 'none',
                  smoothScrolling: true,
                  scrollbar: { verticalScrollbarSize: 6 },
                  overviewRulerLanes: 0,
                  suggest: { showMethods: true, showFunctions: true, showConstructors: true },
                }}
              />
            </div>
          </EditorErrorBoundary>

          {/* ── Bottom Panel ── */}
          <div style={{ flexShrink: 0, background: 'var(--bg-1)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: bottomOpen ? 180 : 38, transition: 'height 0.2s ease', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: bottomOpen ? '1px solid var(--border)' : 'none', padding: '0 12px', height: 38, flexShrink: 0, gap: 4 }}>
              {['testcases', 'output'].map(t => (
                <button key={t} onClick={() => { setBottomTab(t); setBottomOpen(true) }} style={{
                  padding: '0 12px', height: '100%', fontSize: 12, fontWeight: 600,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: bottomTab === t && bottomOpen ? 'var(--purple-light)' : 'var(--text-3)',
                  borderBottom: `2px solid ${bottomTab === t && bottomOpen ? 'var(--purple)' : 'transparent'}`,
                }}>
                  {t === 'testcases' ? 'Test Cases' : 'Output'}
                  {t === 'output' && result && (
                    <span style={{ marginLeft: 6, width: 6, height: 6, borderRadius: '50%', background: result.passed ? '#10b981' : '#ef4444', display: 'inline-block', verticalAlign: 'middle' }} />
                  )}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <button onClick={() => setBottomOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px 6px', fontSize: 11 }}>
                {bottomOpen ? '▼' : '▲'}
              </button>
            </div>

            {bottomOpen && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
                {bottomTab === 'testcases' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ch.test_cases.map((tc, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--bg-3)', borderRadius: 6, padding: '8px 10px', fontSize: 12, fontFamily: 'var(--mono)' }}>
                        <span style={{ color: 'var(--text-3)', flexShrink: 0, fontWeight: 600 }}>Case {i + 1}</span>
                        {tc.input?.length > 0 && (
                          <span><span style={{ color: 'var(--text-3)' }}>in: </span><span style={{ color: 'var(--text-1)' }}>{JSON.stringify(tc.input)}</span></span>
                        )}
                        <span><span style={{ color: 'var(--text-3)' }}>→ </span><span style={{ color: 'var(--green)', fontWeight: 600 }}>{tc.expected_output}</span></span>
                      </div>
                    ))}
                  </div>
                )}

                {bottomTab === 'output' && (
                  <div>
                    {submitting && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13 }}>
                        <Spinner /> Running code against {ch.test_cases.length} test cases...
                      </div>
                    )}
                    {!submitting && !result && (
                      <div style={{ color: 'var(--text-3)', fontSize: 12, fontFamily: 'var(--mono)' }}>
                        Press Submit to run your code against test cases.
                      </div>
                    )}
                    {!submitting && result && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 14, fontWeight: 700, color: result.passed ? '#10b981' : '#ef4444' }}>
                          {result.passed ? <PassIcon /> : <FailIcon />}
                          {result.passed ? 'Accepted' : 'Wrong Answer'}
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7, background: 'var(--bg-3)', borderRadius: 6, padding: '8px 10px', marginBottom: result.passed ? 10 : 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {result.message}
                        </div>
                        {result.passed && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)', fontFamily: 'var(--mono)' }}>+{result.xp_earned} XP</span>
                            {result.streak_bonus && <span style={{ fontSize: 11, color: 'var(--amber)' }}>Streak bonus applied</span>}
                            <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => navigate('/play')}>
                              Next Challenge
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {xpFloat && (
            <div style={{ position: 'absolute', top: 16, right: 20, background: 'var(--orange)', color: '#fff', fontWeight: 800, fontSize: 18, padding: '8px 18px', borderRadius: 10, fontFamily: 'var(--mono)', animation: 'floatXP 2.5s ease forwards', pointerEvents: 'none', zIndex: 10, boxShadow: '0 4px 20px rgba(249,115,22,0.4)' }}>
              {xpFloat}
            </div>
          )}
        </div>
      </div>

      {levelUp && <LevelUpModal newLevel={levelUp} onClose={() => { setLevelUp(null); navigate('/dashboard') }} />}
    </div>
  )
}
