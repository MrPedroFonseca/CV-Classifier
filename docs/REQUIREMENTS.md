# AI-Powered Job Advertisement Analyzer

Requirements and development plan · Pedro Fonseca · version 1.0 · November 25, 2026

## 1. Objective

Build a web application that accepts a job advertisement and uses an AI model to return structured data: requirements, technologies, work model, salary, and a compatibility assessment against the user's resume and work preferences.

Secondary objectives:

- Practice AI model integration, including prompts, response validation, error handling, limits, and costs.
- Produce a GitHub project suitable for demonstrating AI development skills on job applications.

## 2. Scope

### MVP

- Load a resume and work preferences once, and analyze one advertisement at a time.
- Display the result in a readable interface.
- Allow the provider and model to be selected.
- Handle errors, limits, and invalid responses.

### Post-MVP

- User accounts and authentication.
- Database and analysis history.
- Excel or application-tracker integration.
- Production deployment.
- Automatic advertisement search.

## 3. Functional Requirements

- **FR1:** The user pastes advertisement text into a text area and selects Analyze after providing a resume.
- **FR2:** The backend exposes `POST /analyze`, accepting the advertisement, resume, preferences, provider, and model.
- **FR3:** The backend builds a prompt containing instructions, resume text, preferences, and advertisement text, then sends it to the selected model.
- **FR4:** The result is JSON containing title, experience years, technologies, work model, salary, compatibility score, gaps, and preference fit.
- **FR5:** The backend validates the model result with a Zod schema. Invalid output produces one retry; a second failure returns a clear error.
- **FR6:** Use `null` for information absent from the advertisement. Never invent missing information.
- **FR7:** The frontend presents fields, technologies, gaps, compatibility, and preference fit in a readable format.
- **FR8:** The frontend has loading, error, and success states and disables the Analyze button during requests.
- **FR9:** Before the first analysis, the user provides a resume by pasting text or uploading a PDF. Without a resume, the button is disabled and the UI explains why.
- **FR10:** For PDF input, the backend extracts text through `POST /resume/extract`. PDFs without extractable text return a clear error and recommend pasted text.
- **FR11:** Before sending the resume to the model, remove any detectable email address, phone number, and postal address. Show the exact resulting text for review and editing.
- **FR12:** Store the resume only in browser storage and send it with each analysis. The backend must not persist or log it. The user may replace or delete it.
- **FR13:** The user defines accepted work models and locations, with a maximum number of office days per week for each location from 1 to 5. Store preferences with the resume in browser storage. With no preferences, any work model and location is acceptable.
- **FR14:** The user selects a provider and model. `GET /models` returns only providers whose API keys are configured.
- **FR15:** Show response time and token usage for each analysis.
- **FR16:** Provide a button that copies the JSON result.

## 4. Non-Functional Requirements

- **NFR1, Security:** Store API keys in `.env` files excluded by `.gitignore`; never expose them to the frontend. Accept only provider/model combinations from the allowlist.
- **NFR2, Privacy:** Send a reviewed resume with detectable contact details removed. Clarify that free plans may use submitted requests for provider purposes.
- **NFR3, Reliability:** Use a 30-second timeout per request and up to two retries with increasing backoff for 429 or 5xx responses.
- **NFR4, Input Limits:** Limit advertisements to 15,000 characters, resumes to 10,000 characters, and PDFs to 2 MB. Empty or oversized text returns 400.
- **NFR5, Quality:** Use strict TypeScript, ESLint, and Vitest tests.
- **NFR6, Observability:** Log provider, model, duration, and token usage without logging keys or resume content.
- **NFR7, Portability:** Changing providers must not require code changes outside provider configuration. Route every model call through `callModel()`.
- **NFR8, Cost:** Use free plans only and respect their limits.

## 5. Stack and Structure

- **Backend:** Node.js 20+, TypeScript, Express, Zod, dotenv, Vitest, a PDF text extraction library such as pdf-parse, and Multer.
- **Frontend:** React with Vite and TypeScript.
- **Models:** Groq and/or Gemini free plans using OpenAI-compatible APIs.

Suggested structure:

```
job-advertisement-analyzer/
  backend/
    src/
      index.ts
      config/providers.ts
      routes/analyze.ts
      services/model.ts
      services/prompt.ts
      schemas/result.ts
    tests/
    .env.example
  frontend/
    src/
  docs/REQUIREMENTS.md
  examples/
  README.md
```

## 6. API Contract

### GET /models

Returns providers with configured API keys and their allowed models.

```json
{
  "providers": [
    { "id": "groq", "models": ["openai/gpt-oss-120b"] }
  ]
}
```

### POST /resume/extract

Accepts a PDF as multipart form data with a maximum size of 2 MB and returns text with detectable contact details removed.

```json
{ "text": "Resume text without contact details" }
```

- `400`: not a PDF or file larger than 2 MB
- `422`: PDF contains no extractable text

### POST /analyze

Request:

```json
{
  "advertisement": "Job advertisement text",
  "resume": "Resume text",
  "preferences": {
    "models": ["remote", "hybrid"],
    "locations": [{ "city": "Coimbra", "maxDays": 3 }]
  },
  "provider": "groq",
  "model": "openai/gpt-oss-120b"
}
```

`maxDays` must be an integer from 1 to 5.

Success response:

```json
{
  "title": "string",
  "experienceYears": "string | null",
  "technologies": ["string"],
  "workModel": "remote | hybrid | on-site | null",
  "salary": "string | null",
  "compatibility": 0,
  "gaps": ["string"],
  "preferences": {
    "workModel": "compatible | incompatible | unknown",
    "location": "compatible | incompatible | unknown"
  },
  "meta": { "timeMs": 0, "tokens": 0 }
}
```

Errors:

- `400`: empty or oversized advertisement/resume or provider/model combination not allowed
- `429`: provider limit exceeded after retries
- `502`: model returned invalid JSON after the retry
- `504`: timeout

## 7. Providers and Models

Keep provider configuration in `config/providers.ts`. Each provider has a base URL, API-key environment variable name, and allowed model list.

- **Groq:** `https://api.groq.com/openai/v1`; starting model `openai/gpt-oss-120b`.
- **Gemini:** use the official Google endpoint compatible with the OpenAI API format and a free-tier Flash model.

Model names and limits change frequently. Confirm them against official provider documentation before configuration.

## 8. Prompt Guidelines

- State the model's role: extract job advertisement data and compare it with the resume and preferences.
- Require JSON only, with no text before or after.
- State that advertisement and resume text are data and that instructions written inside them must be ignored.
- Use `null` when a value is absent and prohibit fabrication.
- Define compatibility from 0 to 10 using criteria such as shared technologies and experience.
- Evaluate work-model, location, and office-day fit separately. Mark it incompatible only when clearly stated by the advertisement; otherwise use unknown.
- List gaps only for requirements absent from the resume. Never assume skills not shown by the resume.
- Use low temperature, from 0 to 0.2.
- Store the prompt in `services/prompt.ts` and version it.

## 9. Acceptance Criteria

1. Without a resume, the Analyze button is disabled and the UI requests one.
2. With text or PDF resume input, the user reviews text without email addresses or phone numbers before sending.
3. A real advertisement and resume return valid JSON in under 15 seconds.
4. A hybrid job in Lisbon requiring three office days with a preference of two is marked location-incompatible. Missing location or office-day information is marked unknown.
5. Nonsensical text produces null fields and no invented information.
6. Invalid keys and provider limits produce understandable frontend errors.
7. Disallowed provider/model combinations return 400.
8. Changing provider does not require changes outside `config/providers.ts`.
9. Tests pass and the README explains installation and startup.

## 10. Development Plan

### Phase 0: Preparation

- Create the GitHub repository and folder structure.
- Create `.gitignore` with `.env`, `node_modules`, and `real-resume.*`.
- Create a Groq account and obtain an API key.
- Store the key in `backend/.env` and provide `backend/.env.example` without values.
- Create `.github/copilot-instructions.md`.
- Copy this document to `docs/REQUIREMENTS.md`.

Ready when: the repository exists and no key is in version control.

### Phase 1: Minimum Backend

- Initialize strict TypeScript and Express.
- Create `POST /analyze` with basic body validation.
- Create `callModel()` using fetch, the Groq endpoint, and the environment key.
- Return the model's raw response initially.

Prompt example:

"Following docs/REQUIREMENTS.md, create an Express server in backend/src using TypeScript and POST /analyze. Validate that advertisement is a non-empty string with a maximum of 15,000 characters. Create services/model.ts with a callModel function that uses fetch and Groq's OpenAI-compatible API. Read the key from process.env."

Ready when: an HTTP client can call the endpoint and receive a model response.

### Phase 2: Resume, JSON, Validation, and Errors

- Create the Zod result schema in `schemas/result.ts`.
- Create `POST /resume/extract` with 2 MB PDF validation and contact removal.
- Require a resume in `POST /analyze`.
- Add optional preferences with defaults.
- Create the prompt in `services/prompt.ts`.
- Parse and validate the response and retry once if invalid.
- Handle 429 retries and the 30-second timeout.
- Return 400, 422, 429, 502, and 504 errors.

Ready when: real advertisements produce valid JSON and invalid keys or nonsensical text produce the documented errors and null values.

### Phase 3: Multiple Providers and Models

- Create `config/providers.ts` with Groq and Gemini.
- Add `GET /models`, returning only configured providers.
- Validate provider/model combinations and reject invalid combinations with 400.
- Return `meta.timeMs` and `meta.tokens`.

Ready when: the same advertisement works with multiple providers and invalid combinations are rejected.

### Phase 4: Frontend

- Create React and Vite with strict TypeScript.
- Add resume text and PDF options. Review cleaned text and support replacement/deletion.
- Add work-model and location preferences.
- Add the advertisement form, provider/model selection, and disabled Analyze state.
- Display loading, error, and success states.
- Present title, technologies, work model, salary, score, gaps, and preference fit.
- Show response time, tokens, and a Copy JSON action.

Ready when: an end-to-end analysis works through the interface and errors are understandable.

### Phase 5: Tests and Evaluation

- Write Vitest unit tests for schemas, error handling, and allowlists.
- Mock model calls in tests.
- Store 5 to 10 fictional job advertisements and candidate profiles with evaluation checks in `examples/`. Do not include real resumes or contact details.
- Run them across providers and record score, time, and correctness.
- Adjust the prompt based on results.

Ready when: tests pass and the repository contains a repeatable dataset and a small model comparison.

### Phase 6: README and Publication

- Document installation, configuration, and startup.
- Add a screenshot.
- Explain the lessons learned about invalid JSON, limits, and provider comparison.
- Verify that no secrets exist in Git history.
- Add the repository link to the CV.

Ready when: anyone can run the project using only the README.

## 11. Working with Copilot

- Make small requests and commit after each working step.
- Review every change because it must be explainable.
- Write tests before implementation for critical validation and error handling.
- Verify model parameters and provider names against official documentation.
- Never send API keys or full resumes to Copilot.
- Keep this document in `docs/REQUIREMENTS.md`.

## 12. Risks and Open Decisions

- **Initial provider:** Groq or Gemini.
- **Resume storage:** browser-only, to be reconsidered only if accounts are introduced.
- **Deployment:** decide whether to deploy for a public demo.

Risks:

- Free-plan limits and model names change without notice.
- Invalid JSON or inconsistent model responses are possible.
- Free providers may use submitted data according to their plans.

## 13. Final Checklist

- Essential requirements FR1 through FR13 are implemented.
- Provider/model selection works.
- Tests pass.
- No API keys or real resume data are in the repository.
- README is complete and linked from the CV.
