# Project Instructions

## Objective

This project is an AI-powered job advertisement analyzer. It receives a job advertisement and a resume, sends them to a selected model, and returns structured data and a compatibility assessment.

## Documentation

- Follow `docs/REQUIREMENTS.md`.
- Do not invent requirements that are not documented.
- Implement the project in small phases and validate each phase before proceeding.

## Stack

- Node.js 20+
- Strict TypeScript
- Express
- Zod
- Vitest
- pdf-parse and Multer for PDF uploads
- React and Vite
- Groq and, later, Gemini

## Structure

- `backend/src/index.ts`: server startup
- `backend/src/config/providers.ts`: central provider configuration
- `backend/src/routes/analyze.ts`: HTTP routes
- `backend/src/services/model.ts`: all model communication
- `backend/src/services/prompt.ts`: prompt construction and versioning
- `backend/src/schemas/result.ts`: Zod response schema
- `backend/tests/`: backend tests
- `frontend/src/`: React application
- `docs/REQUIREMENTS.md`: requirements and API contract
- `examples/`: fictional advertisements and evaluation data

## Mandatory Rules

- Use strict TypeScript.
- Validate external inputs and responses.
- Never send API keys to the frontend.
- Store keys only in `.env` files.
- Never store or log resumes in the backend.
- Never log keys, resumes, or advertisements.
- Remove email addresses, phone numbers, and postal addresses from resumes before sending them to a model.
- Use `null` for values absent from the source; never invent values.
- Allow only providers and models defined in the central configuration.
- Every model call must pass through `callModel()`.
- Apply a 30-second timeout and handle rate limits and errors according to the requirements.
- Write Vitest tests for critical logic before or during implementation.
- Do not change requirements outside the planned phases without explanation.
- Confirm official model names and APIs, as they change frequently.
- Use English for code, files, identifiers, UI text, comments, documentation, logs, and commits.
