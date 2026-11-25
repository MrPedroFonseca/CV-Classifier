# Job Advertisement Analyzer with AI

Full-stack project for analyzing job advertisements, comparing requirements with a resume, and evaluating fit with work preferences.

## Current Status

The backend and the first complete frontend flow are implemented. The frontend keeps the reviewed resume and work preferences in browser storage.

## Structure

- `backend/`: Node.js, Express, and TypeScript API
- `frontend/`: React and Vite interface
- `docs/REQUIREMENTS.md`: requirements, API contract, and development plan
- `examples/`: fictional job advertisements and evaluation data
- `.github/copilot-instructions.md`: project development rules

## Planned Stack

- Node.js 20+
- Strict TypeScript
- Express and Zod
- Vitest
- React and Vite
- Groq and/or Gemini

## Local Setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Configure a personal provider API key. Never commit the key to the repository.
3. Never add real resumes to the repository.

## Run the Backend

```powershell
cd backend
npm install
npm run dev
```

The server listens on `http://localhost:3001` by default. Configure `GROQ_API_KEY`, `GEMINI_API_KEY`, or both in `backend/.env`.

## Backend Endpoints

- `GET /health`: reports server health.
- `GET /models`: returns providers and models with configured API keys.
- `POST /analyze`: validates a resume and advertisement, calls the selected model, and returns structured JSON.
- `POST /resume/extract`: extracts PDF text and removes detectable contact details.

Example:

```powershell
$body = @{
  advertisement = "We are hiring a TypeScript and React developer."
  resume = "TypeScript and React developer."
  preferences = @{
    models = @("remote", "hybrid")
    locations = @(@{ city = "Coimbra"; maxDays = 1 })
  }
  provider = "gemini"
  model = "gemini-3.6-flash"
} | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post -Uri "http://localhost:3001/analyze" -ContentType "application/json" -Body $body
```

## Backend Validation

```powershell
cd backend
npm test
npm run lint
npm run build
```

## Run the Frontend

Start the backend in one terminal, then run the frontend in another:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The development server proxies API requests to `http://localhost:3001`.

Build and lint the frontend:

```powershell
cd frontend
npm run build
npm run lint
```

## Next Phase

Evaluate analysis quality with fictional resumes and job advertisements, then refine the prompt and result presentation.