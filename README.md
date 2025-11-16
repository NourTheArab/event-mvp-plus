# Student Engagement Event Manager

*A small-scale event request, approval, and publishing system built for Earlham Student Engagement.*

---

## Overview

This application is a full-stack Node.js project that allows campus groups and students to submit events, while admins can review, approve, and publish them.

It includes a simple authentication flow (magic-link), persistent storage, conflict detection, and an interface for viewing approved events with an iCal feed.

---

## Features

### **Core Requirements (Base Project Criteria)**

-  Node.js + Express backend
-  HTML/JS frontend served via Vite
-  Persistent storage using Prisma + SQLite
-  CRUD operations for events
-  Multiple routes (`/api/events/*`, `/auth/*`, `/admin/*`, etc.)
-  Server maintains data across restarts
-  Clean full-stack project structure

### **Additional Functional Features**

-  Magic-link login (no password needed)
-  Roles: **student**, **admin**, **superadmin**
-  Event creation, submission, and approval workflow
-  Groups & venues (admin-managed)
-  Export approved events via **approved.ics**
-  File uploads (JPG, JPEG, PNG)
-  Venue conflict detection

---

## Tech Stack

**Backend**
- Node.js (Express)
- Prisma ORM
- SQLite database
- Multer (file uploads)
- ical-generator (calendar export)

**Frontend**
- React (via Vite)
- Custom CSS UI
- Fetch API

---

## Project Structure

```
event-mvp-plus/
├─ prisma/
│  ├─ schema.prisma
│  ├─ seed.js
├─ uploads/                # attachments are here, this is for the future if I continue building it.
├─ server.js               # main Express server
├─ package.json
├─ .env
└─ web/
   ├─ index.html
   ├─ vite.config.js
   └─ src/
      └─ ui/
         ├─ main.jsx
         ├─ App.jsx
         ├─ pages.jsx
         ├─ Admin.jsx
         ├─ styles.css
```

---

## Setup Instructions

### **1. Clone the repo**

```bash
git clone <thisrepourl>
cd event-mvp-plus
```

### **2. Install backend dependencies**

```bash
npm install
```

### **3. Configure database**

Use SQLite (default):

`.env`:
```ini
DATABASE_URL="file:./dev.db"
SESSION_SECRET="dev-secret"
APP_ORIGIN="http://localhost:5173"
```

Generate Prisma client + migrate:

```bash
npx prisma generate
npx prisma migrate deploy
node prisma/seed.js      # optional
```

### **4. Start backend**

```bash
npm run dev
```

Runs on → http://localhost:3000

### **5. Start frontend**

```bash
cd web
npm install
npm run dev
```

Runs on → http://localhost:5173

---

## Default Testing Users

Use Prisma Studio to modify roles:

```bash
npx prisma studio
```

Update users to:
- `njalshe23@earlham.edu` → superadmin
- `pelibby16@earlham.edu` → superadmin # yay!

Or add more users as needed.

---

## Future Enhancements

- Push notifications (Firebase)
- Department routing logic (AV, Facilities)
- Event recurrence
- Public-facing schedule page
- Rich media previews
