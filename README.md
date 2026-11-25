# Job Advertisement Analyzer with AI

Full-stack project for analyzing job advertisements, comparing requirements with a resume, and evaluating fit with work preferences.

## Current Status

Initial preparation is complete. The backend and frontend are separated, and the project requirements are documented.

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

The server listens on `http://localhost:3001` by default. Configure `GROQ_API_KEY` in `backend/.env`.

## Backend Endpoints

- `GET /health`: reports server health.
- `POST /analyze`: validates a resume and advertisement, calls Groq, and returns structured JSON.
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

## Next Phase

Add the Zod result schema, resume extraction, preference handling, retry behavior, and structured model errors.