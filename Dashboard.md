# 🎛️ Macro Intel Dashboard & Navigation Map

This is the central navigation hub for the **Macroeconomic Intelligence Platform (Macro Intel)** workspace.

---

## 🗺️ Project Modules & Documentation

* **Macro Intel Core Engine:** 
  * [[macro-economy/README|🟢 Macroeconomic Intelligence Platform (README.md)]] — The core intelligence service that ingests RSS news and Finnhub calendar events, runs sentiment analysis via Groq AI, and exposes bias and calendar APIs.
  * [[READMEf1|📘 Macro Intel Architecture Blueprint (READMEf1.md)]] — Technical data contracts, Pydantic schemas, and processing pipeline specification for the macro bias engine.
* **Frontend Interfaces:**
  * [[MacroIntel|🟣 Macro Intel Web Platform]] — The React + Vite frontend hub housing the `/macro-intel` sentiment dashboard and `/calendar` economic event tracker.
* **Authentication & Gateway:**
  * [[authentication & landing page|🔐 Authentication & Landing Page Architecture]] — The UI specification, landing page wireframes, Google OAuth 2.0 (1-Click SSO), Supabase auth flows, and audit/access logging roadmap.

---

## ⚙️ Quick Reference

### System Services

| Component | Language / Stack | URL / Route | Launch Command |
| :--- | :--- | :--- | :--- |
| **Macro Intel API** | Python (FastAPI, Groq, Finnhub) | `http://localhost:8000` | `uvicorn app.main:app --port 8000` |
| **Macro Intel Dashboard** | React + Vite | `http://localhost:3000/macro-intel` | `npm run dev` (inside `supernova-ai-trading-system`) |
| **Economic Calendar** | React + Vite | `http://localhost:3000/calendar` | `npm run dev` (inside `supernova-ai-trading-system`) |

---

*Tip: In Obsidian, you can open the Graph View and look for **Dashboard** to see how all the documentation links connect.*
