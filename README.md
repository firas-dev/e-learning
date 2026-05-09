# 🎓 EduVerse AI — Intelligent E-Learning Platform

> An AI-powered e-learning platform that analyzes learner emotions through facial expression recognition to enhance engagement and personalize the learning experience.

---

## 📖 Overview

EduVerse AI is a full-stack web application that combines modern online education features with an integrated **AI Emotion Detection** module. During lessons, the platform uses the learner's camera (with explicit consent) to identify emotional states such as engagement, confusion, boredom, or excitement — enabling instructors and the system to adapt content delivery accordingly.

The platform supports three distinct roles — **Students**, **Teachers**, and **Admins** — each with a dedicated dashboard and feature set.

---

## ✨ Features

### 🧠 AI Emotion Detection
- Real-time facial expression analysis during recorded lessons
- Detects 6 emotional states: `engaged`, `excited`, `neutral`, `confused`, `bored`, `frustrated`
- All processing runs locally in the browser — no video is stored or uploaded
- Privacy-first: camera access and emotion detection are opt-in via a consent flow

### 🎒 For Students
- Browse and enroll in published courses (live and recorded)
- Track lesson-by-lesson progress and overall completion percentage
- View emotion analytics from past learning sessions
- Participate in **Private Rooms** with challenges, leaderboards, and achievements
- Comment on and rate lessons; send direct messages to instructors
- Receive in-app and email notifications for upcoming live sessions

### 👩‍🏫 For Teachers
- Create and manage **recorded** courses with multi-file lessons (PDF, video)
- Schedule and host **live sessions** with real-time attachments and Q&A
- Create **Private Rooms** and invite students
- Build timed challenges (quiz, coding, assignment, mini-project) with scoring, hints, and speed bonuses
- View per-student submissions, manually grade work, and publish announcements
- Monitor course enrollment and engagement metrics

### 🛡️ For Admins
- Unified dashboard with platform-wide analytics (users, courses, enrollments, learning hours)
- User management: create, edit, ban/unban, and delete accounts across all roles
- Content moderation: publish/unpublish courses and view platform activity

### 🏆 Gamification (Private Rooms)
- Point system with streak multipliers and level progression
- Automated badge awards (First Blood, Perfect Score, Top 3, Speed Runner, and more)
- Real-time room leaderboard and per-challenge leaderboard
- Socket.IO-powered live events: challenge activation, timer sync, badge notifications

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript, Vite, Tailwind CSS, Axios |
| **Backend** | Node.js, Express 5, TypeScript |
| **Database** | MongoDB (Mongoose ODM) |
| **Real-time** | Socket.IO |
| **File Storage** | Cloudinary (images, PDFs, videos — up to 500 MB per file) |
| **Auth** | JWT (jsonwebtoken) + bcryptjs |
| **Email** | Nodemailer |
| **Scheduling** | node-cron (live session reminders, challenge status jobs) |

---

## 📁 Project Structure

```
├── frontend/          # React + Vite application
│   └── src/
│       ├── pages/     # Route-level page components
│       ├── components/# Reusable UI components (competition, admin, etc.)
│       └── hooks/     # Custom React hooks (data fetching, sockets)
│
└── backend/           # Express + TypeScript REST API
    └── src/
        ├── controllers/
        ├── models/
        ├── routes/
        ├── middleware/
        ├── config/
        ├── jobs/       # Cron jobs (reminders, challenge status)
        └── utils/      # Gamification engine, helpers
```

---
## 🚀 Getting Started
### Prerequisites

- Node.js `>= 20.19.0`
- MongoDB instance (local or Atlas)
- Cloudinary account

### 1. Clone the repository

```bash
git clone https://github.com/your-username/e-learning.git
cd e-learning
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
```

Start the development server:

```bash
npm run dev
```

Backend runs on: `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

---

## 🔌 API Overview

The backend exposes the following route groups:

| Prefix | Description |
|---|---|
| `/api/auth` | Registration, login, JWT issuance |
| `/api/student` | Student dashboard, lesson progress, completions |
| `/api/teacher` | Teacher dashboard, course and lesson management |
| `/api/courses` | Lessons, comments, ratings, feedback |
| `/api/live` | Live session lifecycle and attachments |
| `/api/enrollments` | Enrollment creation and management |
| `/api/notifications` | In-app notifications |
| `/api/messages` | Direct messaging between users |
| `/api/preferences` | Privacy and AI settings per user |
| `/api/rooms` | Private rooms, challenges, leaderboards, submissions |
| `/api/admin` | Platform analytics and user/content management |
| `/api/reports` | Reporting and content moderation |
| `/api/profile` | User profile read/update |

---

## 🔐 Privacy & Data

- Emotion detection is **disabled by default** and requires explicit user opt-in.
- Facial analysis runs entirely in the browser — no frames or video are sent to any server.
- Usage data sharing is separately configurable and anonymised.

---

## 📄 License

This project was developed as an academic capstone project By Firas Elhaj.  
© 2026 — All rights reserved.