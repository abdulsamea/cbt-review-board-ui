
# CBT Review Board UI

This is the **React (Vite) frontend** for the CBT Review Board system.
It connects to the **FastAPI backend** running locally and uses CBT session APIs.

---

## Prerequisites

Make sure you have the following installed:

* **Node.js** (v18+ recommended)
* **npm** (comes with Node)
---

## Environment Configuration

Create a `.env` file in the project root:

```env
VITE_API_BASE_URL=http://localhost:8000
```

This tells the frontend where the FastAPI backend is running.

---

## Install Frontend Dependencies

From the frontend project directory:

```bash
npm install
```

---

## Start the Frontend (React + Vite)

```bash
npm run dev
```

The UI will be available at:

```
http://localhost:4000
```

(Vite may show a slightly different port in the terminal.)

---


## API Connectivity

The frontend communicates with the backend using Axios.

Example endpoints used:

* `POST /start_session`
* `POST /resume_session`
* `GET /stream_session_info`

Ensure the backend is running **before** starting the frontend.

---

## Project Scripts

Available npm scripts:

| Script            | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start development server |
| `npm run build`   | Build production bundle  |
| `npm run preview` | Preview production build |

---


## Summary

1. Start FastAPI backend on `http://localhost:8000`
2. Start React frontend with `npm run dev`
3. Open UI in browser
4. Begin CBT session workflows