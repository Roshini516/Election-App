*** State Assembly Election App:- ***


A full-stack web application that simulates a State Assembly Election system, built in phases to demonstrate real-world development workflow.
The project includes voter registration, admin approval, secure voting, and result calculation, with a frontend migrated from vanilla JavaScript to React.

* Project Architecture:-

Backend: Node.js, Express.js

Database: MySQL

Frontend (Phase 2): HTML, CSS, JavaScript

Frontend (Phase 3): React (Vite)

API Communication: REST APIs using JSON

Authentication: Token-based (JWT)


* Development Phases:-
#Phase 1 – Backend Foundation

Database schema design

API endpoints for voters, admin, voting, and results

Secure request handling

#Phase 2 – Frontend with HTML/CSS/JS

Voter registration and login

Admin login with approve/reject flow

One-time vote casting

Vote status handling (Already Voted / Success)

Result calculation and display

Input validation and error messaging

#Phase 3 – React Migration

Frontend migrated to React without changing backend logic

UI behavior and flow preserved from Phase 2

Code modularized using React components

Improved maintainability and scalability


* Core Features:-

Voter registration with validation

Secure voter login

Admin authentication

Admin approval/rejection of voters

One-time voting enforcement

Vote status handling

Real-time election results

Responsive UI

Clear user feedback via inline messages


*  Security Measures Implemented:-

#Input Validation:-

Voter ID format validation (alphanumeric, fixed length)

Aadhaar number validation (numeric, fixed length)

Mandatory password checks during registration and login

Form-level error messages to block invalid submissions

#Authentication & Authorization

Token-based authentication for voters and admin

Admin-protected routes for approval and management actions

Unauthorized access attempts are blocked at API level

#Vote Integrity Protection

A voter is allowed to vote only once

Backend verifies vote status before allowing vote submission

Already-voted users are redirected to a status page

Error Handling as a Security Layer

Detailed internal errors are not exposed

User-facing messages are generic and safe

Prevents information leakage through UI or API responses

#Backend Safeguards

Server-side validation even if frontend checks are bypassed

Environment variables used for sensitive configuration

Controlled API responses for all edge cases


Note: Security is implemented at a learning / academic level, not production-grade.


* Known Limitations:-

No advanced encryption mechanisms

No role-based dashboards

No deployment configuration included

Intended for academic and demo purposes only


* Why React Migration?

Better code organization

Component-based architecture

Easier UI updates and scalability

Industry-standard frontend approach

▶ How to Run the Project
Backend
cd backend
npm install
node server.js

Frontend (React)
cd react
npm install
npm run dev

* Project Structure (Simplified)
ELECTION-APP/
├── backend/
│   ├── server.js
│   ├── db.js
│   ├── package.json
│   └── .env
│
├── react/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── styles.css
│   │   └── constants.js
│   ├── public/
│   │   └── eci-logo.png
│   ├── package.json
│   └── vite.config.js
│
└── README.md


* Future Enhancements:-

Role-based dashboards

Refresh token handling

Deployment using Docker

Improved UI accessibility

Real candidate management from backend


* Author:-

Roshini.K
Final Year B.Tech Student
Full-Stack Web Development Project


* Final Note:-

This project was developed step by step, preserving functionality during migration and focusing on clarity, correctness, and real-world practices rather than unnecessary complexity..
