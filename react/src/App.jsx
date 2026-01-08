import React, { useState } from 'react'
import { CANDIDATES, BASE_URL } from './constants'

export default function App() {
  const [section, setSection] = useState('login-section')
  const [voterToken, setVoterToken] = useState(null)
  const [adminToken, setAdminToken] = useState(null)

  // inputs
  const [regName, setRegName] = useState('')
  const [regVoterId, setRegVoterId] = useState('')
  const [regAadhar, setRegAadhar] = useState('')
  const [regPassword, setRegPassword] = useState('')

  const [loginVoterId, setLoginVoterId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [adminUser, setAdminUser] = useState('')
  const [adminPass, setAdminPass] = useState('')

  // messages
  const [voterIdError, setVoterIdError] = useState('')
  const [aadharError, setAadharError] = useState('')
  const [registerMessage, setRegisterMessage] = useState('')
  const [registerMessageType, setRegisterMessageType] = useState('success')
  const [loginVoterIdError, setLoginVoterIdError] = useState('')
  const [loginPasswordError, setLoginPasswordError] = useState('')
  const [adminError, setAdminError] = useState('')

  const [pending, setPending] = useState([])
  const [results, setResults] = useState([])
  const [leaderText, setLeaderText] = useState('')

  function navigate(id, doLogout = false) {
    if (doLogout) {
      setVoterToken(null)
      setAdminToken(null)
    }
    // clear messages except vote-status
    setVoterIdError('')
    setAadharError('')
    setRegisterMessage('')
    setLoginVoterIdError('')
    setLoginPasswordError('')
    setAdminError('')
    // reset all input fields to mimic previous app behavior
    setRegName('')
    setRegVoterId('')
    setRegAadhar('')
    setRegPassword('')
    setLoginVoterId('')
    setLoginPassword('')
    setAdminUser('')
    setAdminPass('')

    setSection(id)
  }

  async function registerVoter() {
    setVoterIdError('')
    setAadharError('')
    setRegisterMessage('')
    setRegisterMessageType('success')

    if (!/^[A-Za-z0-9]{10}$/.test(regVoterId.trim())) {
      setVoterIdError('Please enter Valid Voter ID (10 alphanumeric characters)')
      return
    }

    if (!/^[0-9]{12}$/.test(regAadhar.trim())) {
      setAadharError('Please enter Valid Aadhar number (12 digits)')
      return
    }

    if (!regPassword.trim()) {
      setRegisterMessage('Create a Password to Proceed')
      setRegisterMessageType('error')
      return
    }

    const res = await fetch(`${BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: regName.trim(), voter_id: regVoterId.trim(), aadhar: regAadhar.trim(), password: regPassword })
    })
    const data = await res.json()
    setRegisterMessage(data.message || '')
    // Map server responses to appropriate styles
    if (res.ok) {
      setRegisterMessageType('success')
      setRegName('')
      setRegVoterId('')
      setRegAadhar('')
      setRegPassword('')
    } else {
      // if voter already exists, show info (blue)
      if ((data.message || '').toLowerCase().includes('voter already exists')) {
        setRegisterMessageType('info')
      } else {
        setRegisterMessageType('error')
      }
    }
  }

  async function voterLogin() {
    setLoginVoterIdError('')
    setLoginPasswordError('')

    if (!/^[A-Za-z0-9]{10}$/.test(loginVoterId.trim())) {
      setLoginVoterIdError('Please enter Valid Voter ID')
      return
    }

    if (!loginPassword.trim()) {
      setLoginPasswordError('Enter your password')
      return
    }

    const res = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voter_id: loginVoterId.trim(), password: loginPassword })
    })
    const data = await res.json()

    if (data.voted === true) {
      navigate('already-voted-section')
      return
    }

    if (!data.token) {
      setLoginPasswordError(data.message || '')
      return
    }

    setVoterToken(data.token)
    setLoginVoterId('')
    setLoginPassword('')
    navigate('vote-section')
  }

  function loadCandidates() {
    // nothing to do; candidates are rendered from CANDIDATES
  }

  async function castVote(candidate_name) {
    const res = await fetch(`${BASE_URL}/api/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${voterToken}` },
      body: JSON.stringify({ candidate_name })
    })
    const data = await res.json()
    if (data.message === 'Vote cast successfully') {
      navigate('vote-success-section')
    }
  }

  async function adminLoginFn() {
    setAdminError('')
    if (!adminUser.trim() || !adminPass.trim()) {
      setAdminError('Enter Username and Password.')
      return
    }

    const res = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: adminUser.trim(), password: adminPass })
    })
    const data = await res.json()
    if (!data.token) {
      setAdminError(data.message || 'Invalid Admin credentials!')
      return
    }

    setAdminToken(data.token)
    setAdminUser('')
    setAdminPass('')
    // load pending
    loadPending(data.token)
    navigate('admin-section')
  }

  async function loadPending(token = adminToken) {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/pending`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setPending(data.pending || [])
    } catch (err) {
      setPending([])
    }
  }

  async function approveVoter(voter_id, idx) {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ voter_id })
      })
      const data = await res.json()
      if (!res.ok) {
        // replace that pending item message
        const copy = [...pending]
        copy[idx] = { ...copy[idx], _msg: data.message || 'Approval failed', _cls: 'msg-error' }
        setPending(copy)
        return
      }
      const copy = [...pending]
      copy[idx] = { ...copy[idx], _msg: data.message || 'Approved successfully', _cls: 'msg-success' }
      setPending(copy)
      setTimeout(() => loadPending(), 2500)
    } catch (err) {
      const copy = [...pending]
      copy[idx] = { ...copy[idx], _msg: 'Server error. Try again.', _cls: 'msg-error' }
      setPending(copy)
    }
  }

  async function rejectVoter(voter_id, idx) {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ voter_id })
      })
      const data = await res.json()
      if (!res.ok) {
        const copy = [...pending]
        copy[idx] = { ...copy[idx], _msg: data.message || 'Rejection failed', _cls: 'msg-error' }
        setPending(copy)
        return
      }
      const copy = [...pending]
      copy[idx] = { ...copy[idx], _msg: data.message || 'Rejected successfully', _cls: 'msg-error' }
      setPending(copy)
      setTimeout(() => loadPending(), 2500)
    } catch (err) {
      const copy = [...pending]
      copy[idx] = { ...copy[idx], _msg: 'Server error. Try again.', _cls: 'msg-error' }
      setPending(copy)
    }
  }

  async function showResults() {
    navigate('results-section')
    const res = await fetch(`${BASE_URL}/api/admin/results`, { headers: { Authorization: `Bearer ${adminToken}` } })
    const data = await res.json()
    const voteMap = {}
    CANDIDATES.forEach(name => (voteMap[name] = 0))
    if (data.results) {
      data.results.forEach(r => {
        if (voteMap.hasOwnProperty(r.candidate_name)) voteMap[r.candidate_name] = r.vote_count
      })
    }
    // set results as objects for nicer rendering
    const resultsArr = Object.entries(voteMap).map(([name, votes]) => ({ name, votes }))
    setResults(resultsArr)
    if (!data.leading || data.leading.length === 0) {
      setLeaderText('No Votes Casted Yet')
    } else {
      const uniqueLeaders = [...new Set(data.leading)]
      const maxVotes = Math.max(...uniqueLeaders.map(l => voteMap[l]))
      setLeaderText(`Leading Member(s): ${uniqueLeaders.join(', ')} (${maxVotes} votes)`)
    }
  }

  function backToAdmin() {
    navigate('admin-section')
  }

  function togglePasswordField(e) {
    const input = e.target.previousElementSibling
    if (!input) return
    if (input.type === 'password') {
      input.type = 'text'
      e.target.textContent = 'Hide'
    } else {
      input.type = 'password'
      e.target.textContent = 'Show'
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo-container">
          <img src="/eci-logo.png" alt="Election Commission Logo" />
          <h1>State Assembly Election</h1>
        </div>

        <nav>
          <button type="button" onClick={() => navigate('login-section', true)}>Login</button>
          <button type="button" onClick={() => navigate('register-section', true)}>Register</button>
          <button type="button" id="adminBtn" onClick={() => navigate('admin-section', true)}>Admin</button>
        </nav>
      </header>

      <main>
        {/* LOGIN */}
        <section id="login-section" className={section === 'login-section' ? '' : 'hidden'}>
          <h2>Voter Login</h2>
          <form id="loginForm" onSubmit={e => e.preventDefault()}>
            <input id="loginVoterId" value={loginVoterId} onChange={e => setLoginVoterId(e.target.value)} placeholder="Voter ID" />
            <p id="login-voterid-error" className="msg-error">{loginVoterIdError}</p>

            <div className="password-wrapper">
              <input id="loginPassword" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Password" />
              <button type="button" className="toggle-btn" onClick={togglePasswordField}>Show</button>
            </div>

            <p id="login-password-error" className="msg-error">{loginPasswordError}</p>

            <button type="button" onClick={voterLogin}>Login</button>
          </form>
        </section>

        {/* REGISTER */}
        <section id="register-section" className={section === 'register-section' ? '' : 'hidden'}>
          <h2>New Voter Registration</h2>
          <form id="registerForm" onSubmit={e => e.preventDefault()}>
            <input id="regName" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Full Name" />
            <input id="regVoterId" value={regVoterId} onChange={e => setRegVoterId(e.target.value)} placeholder="Voter ID" />
            <p id="voterid-error" className="msg-error">{voterIdError}</p>

            <input id="regAadhar" value={regAadhar} onChange={e => setRegAadhar(e.target.value)} placeholder="Aadhar Number" />
            <p id="aadhar-error" className="msg-error">{aadharError}</p>

            <div className="password-wrapper">
              <input id="regPassword" type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Create Password" />
              <button type="button" className="toggle-btn" onClick={togglePasswordField}>Show</button>
            </div>

            <button type="button" onClick={registerVoter}>Submit Registration</button>
          </form>
          <p id="register-message" className={registerMessageType === 'success' ? 'msg-success' : registerMessageType === 'error' ? 'msg-error' : 'text-info'}>{registerMessage}</p>
        </section>

        {/* ADMIN */}
        <section id="admin-section" className={section === 'admin-section' ? '' : 'hidden'}>
          <h2>Admin Panel</h2>
          <input id="adminUser" value={adminUser} onChange={e => setAdminUser(e.target.value)} placeholder="Admin Username" />
          <input id="adminPass" type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="Admin Password" />

          <button type="button" onClick={adminLoginFn}>Login</button>

          <p id="admin-error" className="msg-error">{adminError}</p>

          <div id="admin-panel" className={adminToken ? '' : 'hidden'}>
            <h3>Pending Voter Requests</h3>
            <p id="no-requests" className={`text-info ${pending.length === 0 ? '' : 'hidden'}`}>No Requests Currently</p>
            <ul id="pending-list">
              {pending.map((u, idx) => (
                <li key={u.voter_id + idx}>
                  {u.name} ({u.voter_id})
                  {u._msg ? <p className={u._cls}>{u._msg}</p> : (
                    <>
                      <button onClick={() => approveVoter(u.voter_id, idx)}>Accept</button>
                      <button onClick={() => rejectVoter(u.voter_id, idx)}>Reject</button>
                    </>
                  )}
                </li>
              ))}
            </ul>

            <button type="button" id="resultsBtn" onClick={showResults}>Results</button>
          </div>
        </section>

        {/* VOTING */}
        <section id="vote-section" className={section === 'vote-section' ? '' : 'hidden'}>
          <h2>Vote For Your Candidate</h2>
          <ul id="candidate-list">
            {CANDIDATES.map((name, i) => (
              <li key={i}>
                {name}
                <button onClick={() => castVote(name)}>Vote</button>
              </li>
            ))}
          </ul>
        </section>

        {/* VOTE SUCCESS */}
        <section id="vote-success-section" className={`${section === 'vote-success-section' ? '' : 'hidden'} vote-status`}>
          <h2 className="msg-success">Vote Casted Successfully..!</h2>
          <p className="text-info">Your Vote has been Recorded.</p>
          <p className="thanks-yellow italic">Thanks for your Valuable Participation.</p>
        </section>

        {/* ALREADY VOTED */}
        <section id="already-voted-section" className={`${section === 'already-voted-section' ? '' : 'hidden'} vote-status`}>
          <h2 className="msg-error">You have Already Casted Your Vote!</h2>
          <p className="text-info">You are not allowed to Vote again.</p>
          <p className="thanks-yellow italic">Thank You for Participating.</p>
        </section>

        {/* RESULTS */}
        <section id="results-section" className={section === 'results-section' ? '' : 'hidden'}>
          <h2 className="text-info">Results</h2>
          <ul id="results-list">
            {results.map((r, i) => (
              <li key={i}>
                <span className="result-name">{r.name}</span>
                <span className="result-votes">{r.votes} votes</span>
              </li>
            ))}
          </ul>
          <p id="leading-member" className="text-info">{leaderText}</p>
          <button onClick={backToAdmin}>Back to Admin Panel</button>
        </section>

      </main>

      <footer className="app-footer">© 2025 Online Voting System. All rights reserved.</footer>
    </div>
  )
}
