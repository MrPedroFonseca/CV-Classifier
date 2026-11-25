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

## Next Phase

Create the minimum backend with TypeScript and Express, plus a `POST /analyze` endpoint that calls the configured Groq model.