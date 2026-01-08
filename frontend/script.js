
// ================= GLOBAL =================
console.log("SCRIPT LOADED");

const BASE_URL = "http://localhost:5001";
const sections = document.querySelectorAll("section");

let voterToken = null;
let adminToken = null;


// ----------------- NAVIGATION -----------------
function navigate(id, logout = false) {
  // Hide all sections
  sections.forEach(sec => sec.classList.add("hidden"));

  // Explicit logout resets tokens
  if (logout) forceLogout();

  // Reset all inputs and messages in ALL sections
  resetAllInputs();
  clearMessages();

  // Remove any temporary messages from admin panel
  const adminMsg = document.getElementById("no-requests");
  if (adminMsg) adminMsg.classList.add("hidden");
  if (adminMsg) adminMsg.textContent = "";

  // Show requested section
  const section = document.getElementById(id);
  if (section) section.classList.remove("hidden");
}


function logoutAndNavigate(id) {
  navigate(id, true);
}


function resetAllInputs() {
  document.querySelectorAll("input").forEach(input => input.value = "");
}

function clearMessages() {
  document.querySelectorAll(".msg-error, .msg-success, .msg-info").forEach(e => {
    // Only clear messages NOT inside vote-status sections
    if (!e.closest(".vote-status")) {
      e.textContent = "";
    }
  });

  // Reset individual messages like registration
  const regMsg = document.getElementById("register-message");
  if (regMsg) regMsg.textContent = "";
}


function forceLogout() {
  voterToken = null;
  adminToken = null;

  // Reset UI elements
  const adminBtn = document.getElementById("adminBtn");
  if (adminBtn) adminBtn.style.display = "inline-block";

  const adminPanel = document.getElementById("admin-panel");
  if (adminPanel) adminPanel.classList.add("hidden");

  const resultsBtn = document.getElementById("resultsBtn");
  if (resultsBtn) resultsBtn.classList.add("hidden");
}


// ================= REGISTER =================
async function registerVoter() {
  clearMessages();

  const name = regName.value.trim();
  const voter_id = regVoterId.value.trim();
  const aadhar = regAadhar.value.trim();
  const password = regPassword.value.trim();

  if (!/^[A-Za-z0-9]{10}$/.test(voter_id)) {
    document.getElementById("voterid-error").textContent =
      "Please enter Valid Voter ID (10 alphanumeric characters)";
    return;
  }

  if (!/^[0-9]{12}$/.test(aadhar)) {
    document.getElementById("aadhar-error").textContent =
      "Please enter Valid Aadhar number (12 digits)";
    return;
  }

  if (!password) {
    document.getElementById("register-message").textContent =
      "Create a Password to Proceed";
    return;
  }

  const res = await fetch(`${BASE_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, voter_id, aadhar, password })
  });

  const data = await res.json();
  document.getElementById("register-message").textContent = data.message;

  if (res.ok) resetAllInputs();
}


// ================= VOTER LOGIN =================
async function voterLogin() {
  clearMessages();

  const voter_id = loginVoterId.value.trim();
  const password = loginPassword.value.trim();

  if (!/^[A-Za-z0-9]{10}$/.test(voter_id)) {
    document.getElementById("login-voterid-error").textContent =
      "Please enter Valid Voter ID";
    return;
  }

  if (!password) {
    document.getElementById("login-password-error").textContent =
      "Enter your password";
    return;
  }

  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voter_id, password })
  });

  const data = await res.json();

  if (data.voted === true) {
    navigate("already-voted-section");
    return;
  }

  if (!data.token) {
    document.getElementById("login-password-error").textContent = data.message;
    return;
  }

  voterToken = data.token;
  document.getElementById("adminBtn").style.display = "none";
  loadCandidates();
  navigate("vote-section");
  resetAllInputs();
}


// ================= CANDIDATES =================
function loadCandidates() {
  const list = document.getElementById("candidate-list");
  list.innerHTML = "";

  CANDIDATES.forEach(name => {
    const li = document.createElement("li");
    li.innerHTML = `
      ${name}
      <button onclick="castVote('${name}')">Vote</button>
    `;
    list.appendChild(li);
  });
}


// ================= CAST VOTE =================
async function castVote(candidate_name) {
  const res = await fetch(`${BASE_URL}/api/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${voterToken}`
    },
    body: JSON.stringify({ candidate_name })
  });

  const data = await res.json();

  if (data.message === "Vote cast successfully") {
    navigate("vote-success-section");
  }
}

// ================= ADMIN LOGIN =================
async function adminLogin() {
  clearMessages(); // clears messages in inputs, also add below for admin error
  document.getElementById("admin-error").textContent = "";

  const username = adminUser.value.trim();
  const password = adminPass.value.trim();

  if (!username || !password) {
    document.getElementById("admin-error").textContent = "Enter Username and Password.";
    return;
  }

  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (!data.token) {
    document.getElementById("admin-error").textContent = data.message || "Invalid Admin credentials!";
    return;
  }

  adminToken = data.token;
  document.getElementById("admin-panel").classList.remove("hidden");
  document.getElementById("resultsBtn").classList.remove("hidden");

  loadPending();
  resetAllInputs();
}

// ================= ADMIN PENDING =================
async function loadPending() {
  const res = await fetch(`${BASE_URL}/api/admin/pending`, {
    headers: { "Authorization": `Bearer ${adminToken}` }
  });

  const data = await res.json();
  const list = document.getElementById("pending-list");
  const msg = document.getElementById("no-requests");

  list.innerHTML = "";

  if (!data.pending || data.pending.length === 0) {
    msg.textContent = "No Requests Currently";
    msg.classList.remove("hidden");
    return;
  }

  msg.classList.add("hidden");

  data.pending.forEach(u => {
    const li = document.createElement("li");
    li.innerHTML = `
  ${u.name} (${u.voter_id})
  <button onclick="approveVoter('${u.voter_id}', this)">Accept</button>
  <button onclick="rejectVoter('${u.voter_id}', this)">Reject</button>
`;
    list.appendChild(li);
  });
}

async function approveVoter(voter_id, btn) {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ voter_id })
    });

    const data = await res.json();

    if (!res.ok) {
      // backend rejected the action
      showInlineMsg(btn, data.message || "Approval failed", "msg-error");
      return;
    }

    //  backend confirmed success
    showInlineMsg(btn, data.message || "Approved successfully", "msg-success");
    setTimeout(loadPending, 2500);

  } catch (err) {
    //  network / server down
    showInlineMsg(btn, "Server error. Try again.", "msg-error");
  }
}

async function rejectVoter(voter_id, btn) {
  try {
    const res = await fetch(`${BASE_URL}/api/admin/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({ voter_id })
    });

    const data = await res.json();

    if (!res.ok) {
      showInlineMsg(btn, data.message || "Rejection failed", "msg-error");
      return;
    }

    showInlineMsg(btn, data.message || "Rejected successfully", "msg-error");
    setTimeout(loadPending, 2500);

  } catch (err) {
    showInlineMsg(btn, "Server error. Try again.", "msg-error");
  }
}


function showInlineMsg(btn, text, cls) {
  const li = btn.closest("li");

  li.querySelectorAll("button").forEach(b => b.remove());

  const msg = document.createElement("p");
  msg.className = cls;
  msg.textContent = text;

  li.appendChild(msg);
}


// ================= RESULTS =================
async function showResults() {
  navigate("results-section");

  const res = await fetch(`${BASE_URL}/api/admin/results`, {
    headers: { "Authorization": `Bearer ${adminToken}` }
  });

  const data = await res.json();
  const list = document.getElementById("results-list");
  const leader = document.getElementById("leading-member");

  list.innerHTML = "";
  leader.textContent = "";

  // Create vote map using real candidate names
  const voteMap = {};
  CANDIDATES.forEach(name => {
    voteMap[name] = 0;
  });
  // Merge backend votes
  if (data.results) {
    data.results.forEach(r => {
      if (voteMap.hasOwnProperty(r.candidate_name)) {
        voteMap[r.candidate_name] = r.vote_count;
      }
    });
  }

  // Render exactly once
  Object.entries(voteMap).forEach(([name, votes]) => {
    const li = document.createElement("li");
    li.textContent = `${name} : ${votes} votes`;
    list.appendChild(li);
  });

  // Deduplicate leaders
  if (!data.leading || data.leading.length === 0) {
    leader.textContent = "No Votes Casted Yet";
  } else {
    const uniqueLeaders = [...new Set(data.leading)];
    const maxVotes = Math.max(...uniqueLeaders.map(l => voteMap[l]));
    leader.textContent =
      `Leading Member(s): ${uniqueLeaders.join(", ")} (${maxVotes} votes)`;
  }
}
function backToAdmin() {
  navigate("admin-section");
}
// ================= PASSWORD TOGGLE =================
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);

  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "Hide";
  } else {
    input.type = "password";
    btn.textContent = "Show";
  }
}




