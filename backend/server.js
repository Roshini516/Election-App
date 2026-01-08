// ----------------- IMPORTS -----------------
const path = require("path");
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// ----------------- DB CONNECTION -----------------
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Roshini2005", // your MySQL password
  database: "election_db"
});

db.connect(err => {
  if (err) throw err;
  console.log("MySQL connected");
});

// ----------------- JWT SECRET -----------------
const JWT_SECRET = "electionSecretKey";

// ----------------- HELPER FUNCTIONS -----------------
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "Access Denied" });

  const token = authHeader.split(" ")[1]; // Bearer <token>
  if (!token) return res.status(401).json({ message: "Access Denied" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid Token" });
    req.user = user;
    next();
  });
}
function authorizeAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
}

// ---------- VOTER REGISTRATION ----------
app.post("/api/register", (req, res) => {
  const { name, voter_id, aadhar, password } = req.body;

  if (!password || password.trim() === "") {
    return res.status(400).json({ message: "Create a password to proceed" });
  }

  const voterIdRegex = /^[A-Za-z0-9]{10}$/;
  if (!voterIdRegex.test(voter_id)) return res.status(400).json({ message: "Invalid Voter ID" });
  if (!/^[0-9]{12}$/.test(aadhar)) return res.status(400).json({ message: "Invalid Aadhar number" });

  // Check approved voters
  db.query("SELECT * FROM voters WHERE voter_id = ?", [voter_id], (err, approvedUsers) => {
    if (err) return res.status(500).json({ message: "DB Error" });

    if (approvedUsers.length > 0) {
      if (approvedUsers[0].name !== name) {
        return res.status(400).json({ message: "Invalid Voter. Name mismatch" });
      }
      return res.status(400).json({ message: "Voter already exists, Just Login directly" });
    }

    // Check pending voters
    db.query("SELECT * FROM pending_voters WHERE voter_id = ? OR aadhar = ?", [voter_id, aadhar], (err, pending) => {
      if (err) return res.status(500).json({ message: "DB Error" });
      if (pending.length > 0) return res.status(400).json({ message: "Already registered, waiting for approval" });

      const hashedPassword = hashPassword(password);
      db.query(
        "INSERT INTO pending_voters (name, voter_id, aadhar, password) VALUES (?, ?, ?, ?)",
        [name, voter_id, aadhar, hashedPassword],
        (err) => {
          if (err) return res.status(500).json({ message: "DB Error" });
          return res.json({ message: "Registration submitted. Await Admin Verification" });
        }
      );
    });
  });
});

// ---------- ADMIN LOGIN ----------
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "admin123") {
    const token = generateToken({ role: "admin" });
    return res.json({ token });
  } else {
    return res.status(401).json({ message: "Invalid admin credentials" });
  }
});

// ---------- ADMIN VIEW PENDING ----------
app.get("/api/admin/pending", authenticateToken, authorizeAdmin, (req, res) => {
  db.query("SELECT * FROM pending_voters", (err, results) => {
    if (err) return res.status(500).json({ message: "DB Error" });
    res.json({ pending: results });
  });
});


// ---------- ADMIN APPROVE ----------
app.post("/api/admin/approve", authenticateToken, authorizeAdmin, (req, res) => {
  const { voter_id } = req.body;

  db.query(
    "SELECT * FROM pending_voters WHERE voter_id = ?",
    [voter_id],
    (err, results) => {
      if (err) {
        console.error('DB select pending error:', err);
        return res.status(500).json({ message: "DB Error (select pending)" });
      }
      if (results.length === 0)
        return res.status(404).json({ message: "Pending voter not found" });

      const voter = results[0];

      db.query(
        "SELECT * FROM voters WHERE voter_id = ? OR aadhar = ?",
        [voter_id, voter.aadhar],
        (err, existing) => {
          if (err) {
            console.error('DB check voters error:', err);
            return res.status(500).json({ message: "DB Error (check voters)" });
          }

          if (existing.length > 0) {
            // If a record exists with same voter_id or aadhar, do not insert duplicate
            return res.status(400).json({ message: "Voter already approved or Aadhar already in use" });
          }

          db.query(
            "INSERT INTO voters (name, voter_id, aadhar, password, has_voted) VALUES (?, ?, ?, ?, 0)",
            [voter.name, voter.voter_id, voter.aadhar, voter.password],
            (err) => {
              if (err) {
                console.error('DB insert voter error:', err);
                return res.status(500).json({ message: "DB Error (insert voter)" });
              }

              db.query(
                "DELETE FROM pending_voters WHERE voter_id = ?",
                [voter_id],
                (err) => {
                  if (err) {
                    console.error('DB delete pending error:', err);
                    return res.status(500).json({ message: "DB Error (delete pending)" });
                  }
                  res.json({ message: "Voter approved successfully" });
                }
              );
            }
          );
        }
      );
    }
  );
});


// ---------- ADMIN REJECT ----------
app.post("/api/admin/reject", authenticateToken, authorizeAdmin, (req, res) => {
  const { voter_id } = req.body;
  db.query("DELETE FROM pending_voters WHERE voter_id = ?", [voter_id], (err) => {
    if (err) return res.status(500).json({ message: "DB Error" });
    res.json({ message: "Voter rejected successfully" });
  });
});

// ---------- VOTER LOGIN ----------
app.post("/api/login", (req, res) => {
  const { voter_id, password } = req.body;

  if (!password || password.trim() === "") {
    return res.status(400).json({ message: "Enter your password" });
  }
  db.query("SELECT * FROM voters WHERE voter_id = ?", [voter_id], (err, users) => {
    if (err) return res.status(500).json({ message: "DB Error" });
    if (users.length === 0) {
      db.query("SELECT * FROM pending_voters WHERE voter_id = ?", [voter_id], (err, pending) => {
        if (err) return res.status(500).json({ message: "DB Error" });
        if (pending.length > 0) return res.status(400).json({ message: "Please wait for admin verification" });
        return res.status(400).json({ message: "Voter not found, please register first" });
      });
      return;
    }

    const voter = users[0];
    if (!verifyPassword(password, voter.password)) return res.status(400).json({ message: "Invalid password" });
    if (voter.has_voted) return res.json({ token: null, voted: true, message: "Already voted" });

    const token = generateToken({ voter_id: voter.voter_id }); // ✅ include voter_id
    res.json({ token, voted: false });
  });
});

// ---------- CAST VOTE ----------
app.post("/api/vote", authenticateToken, (req, res) => {
  const { candidate_name } = req.body;
  const voter_id = req.user.voter_id; // ✅ get voter_id from token

  if (!voter_id) return res.status(400).json({ message: "Invalid token data" });

  db.query("SELECT * FROM voters WHERE voter_id = ?", [voter_id], (err, results) => {
    if (err) return res.status(500).json({ message: "DB Error" });
    if (results.length === 0) return res.status(404).json({ message: "Voter not found" });

    const voter = results[0];
    if (voter.has_voted) return res.status(400).json({ message: "Voter already voted" });

    // Increment vote
    db.query(
        "SELECT * FROM votes WHERE candidate_name = ?",
        [candidate_name],
        (err, voteRows) => {
          if (err) {
            console.error('DB select votes error:', err);
            return res.status(500).json({ message: 'DB Error' });
          }

          if (voteRows.length > 0) {
            // update existing count
            db.query(
              "UPDATE votes SET vote_count = vote_count + 1 WHERE candidate_name = ?",
              [candidate_name],
              (err) => {
                if (err) {
                  console.error('DB update votes error:', err);
                  return res.status(500).json({ message: 'DB Error' });
                }

                db.query("UPDATE voters SET has_voted = 1 WHERE voter_id = ?", [voter_id], (err) => {
                  if (err) {
                    console.error('DB update voter voted error:', err);
                    return res.status(500).json({ message: 'DB Error' });
                  }
                  res.json({ message: 'Vote cast successfully' });
                });
              }
            );
          } else {
            // insert new vote row
            db.query(
              "INSERT INTO votes (candidate_name, vote_count) VALUES (?, 1)",
              [candidate_name],
              (err) => {
                if (err) {
                  console.error('DB insert votes error:', err);
                  return res.status(500).json({ message: 'DB Error' });
                }

                db.query("UPDATE voters SET has_voted = 1 WHERE voter_id = ?", [voter_id], (err) => {
                  if (err) {
                    console.error('DB update voter voted error:', err);
                    return res.status(500).json({ message: 'DB Error' });
                  }
                  res.json({ message: 'Vote cast successfully' });
                });
              }
            );
          }
        }
    );
  });
});

// ---------- ADMIN RESULTS ----------
app.get("/api/admin/results", authenticateToken, authorizeAdmin, (req, res) => {

  db.query("SELECT * FROM votes", (err, results) => {
    if (err) return res.status(500).json({ message: "DB Error" });

    let maxVotes = 0;
    let leaders = [];
    results.forEach(v => {
      if (v.vote_count > maxVotes) {
        maxVotes = v.vote_count;
        leaders = [v.candidate_name];
      } else if (v.vote_count === maxVotes && v.vote_count > 0) {
        leaders.push(v.candidate_name);
      }
    });

    res.json({ results, leading: leaders });
  });
});

// ----------------- SERVER LISTEN -----------------
app.listen(5001, () => {
  console.log("Server running on port 5001");
});



