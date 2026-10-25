---
doc: spec
status: approved
approval_basis: transcription of the displayed implementation plan explicitly accepted for execution on 2026-10-25
---

# FROM HERE — Technical Spec

## How This Works, In Plain Language
The browser keeps the current notice and lets its author check what it says.
A small local server asks a vision model to read it, then asks the agent to arrange
the confirmed details. The same generated sign is shown, independently read by
the model and exported. If a check finds a problem, the agent can adjust the
layout twice. The server keeps secrets and model requests away from the page.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
Image upload → local model extraction → author confirmation → locked fact version
→ AI layout plan → SVG render and geometry checks → fresh image read → compare
fields and conditions → repair or final result → A3 PDF/SVG.

## Stack
React/TypeScript/Vite: responsive UI and eight reusable view families.
Node/Express: local API and transient jobs. No database or authentication.
Ajv: validate model JSON against shared schemas.
Sharp: decode/normalize images and reject malformed files.
Playwright/Chromium: measure actual font geometry, rasterize SVG and create PDF.
Vitest and Playwright tests: deterministic contracts and actual browser behavior.
Pin installed versions in package-lock.json; Node 24 is available here.
Docs: https://vite.dev/guide/ | https://react.dev/ |
https://ajv.js.org/ | https://sharp.pixelplumbing.com/ |
https://playwright.dev/docs/api/class-page#page-pdf

## Where It Runs and How Someone Tries It
Local Node 24+, a modern browser, local vision and text-model endpoints.
Commands: npm ci; npx playwright install chromium; npm run dev.
Open http://127.0.0.1:4176. Production: npm run build then npm start, same origin.
The model is configurable; the initial implementation uses a previously allowed
local provider, not a cloud credential. Ollama Qwen3-VL transcribes images and an
existing text-only vLLM Gemma interprets the transcript and plans the layout.
Both paths have been exercised with actual local inference and retained receipts.
Required sharing: a real public repository and a short public recording.
Optional hosting does not replace those. Final instructions must match tested commands.

## Look and Feel
PRD ref: `prd.md > Look and Feel`. Keep the approved PNG hierarchy and all six
explicit UX refinements. Shared tokens, open rows and true white. Self-host UI
and condensed sign fonts with their licenses. Essential controls remain usable
at 320 px and 200% text size; keyboard, focus and touch areas are part of QA.
Inspect each accepted reference against a browser screenshot, not only a montage.

## Components

### Workflow and UI families
Implements `prd.md > Screens and Layout` and `Cancel, retry and start again`.
Use a typed reducer for source, facts, phase, artifacts and overlays. Eight feature
families own their markup; App composes them. Overlays record their opener.
Every server request has an ID and a cancellable controller. Ignore stale results.

### Model adapter and bounded agent
Implements `prd.md > Design, check and repair`.
Expose extraction, layout planning and isolated readback functions. Call the local
provider by fetch. Ollama POST /api/chat takes model, fresh messages, optional
base64 images, JSON schema format, stream false and temperature zero. An OpenAI-
compatible local vLLM adapter may use /v1/chat/completions; it is not OpenAI API.
Never execute model-provided code or instructions embedded in a source image.
Validate every response. Image transcription uses a small simple JSON schema;
structured interpretation uses a schema distinguishing unreadable from absent.
Gemma is asked for compact complete JSON after a real whitespace-loop failure.
Store safe evidence and real durations, no secrets.

### Renderer and checks
Implements `prd.md > Design, check and repair` and `Compare and export`.
Layout JSON chooses emphasis, bounded scale, exception scale and margin, never a
new free-form replacement of confirmed content. One SVG, physical dimensions
297 mm × 420 mm, common viewBox.
Wait for fonts; inspect glyph bounds, overlap, margins, contrast and type minimums.
Rasterize that exact artifact for the fresh readback at a documented resolution.
Readback begins from only the rendered image. A fresh parser receives only that
image transcription, without the original, fact values, earlier answers or
repair feedback. Normalize ordinary heading case,
punctuation and time notation conservatively, retaining date, qualifier, audience
and exception relation. Case-sensitive codes, URLs and marked literals retain
their spelling and are checked case-sensitively. Unknown/omitted fields never
become guessed facts. Actual canvas glyph ink bounds avoid treating unpainted
font em-space as a margin failure.

### Export and temporary job storage
Implements `prd.md > Compare and export`.
Bind exports/checks to a fact-version and SVG hash. PDF uses the same SVG and
fonts, page A3, zero outer margin, preferCSSPageSize and printBackground. pdf-lib
normalizes Chromium's rounded page dimensions to exactly 297 × 420 mm.
Successful export is file preparation/download-started, not device-save evidence.
Transient jobs and images live in server memory. Jobs more than 60 minutes old
expire during a cleanup sweep when no task is running. Restarting the server
clears them. Original uploaded data is never committed.

### Memory exercise
Implements `prd.md > Details and optional memory exercise`.
Separate timed presentation state from the question. Clear timers on close,
cancel or unmount. Expose skip/end controls. The correct answer is derived from
confirmed facts only after submission. Repeated attempts are labeled practice.

## Data Model
NoticeFacts has audience/action/location fields, date, time and relation, and a
conditional exception. Fields distinguish known, unreadable and not_stated.
Source has filename, dimensions and content hash. Confirmed facts have a version.
Job has phase, repair count, event history, current layout, artifact hash, program
checks and readback results. Client stores one transient job; server owns artifacts.
Editing invalidates checked status. No result can be exported as checked after
its facts or artifact changed. No persistence promise across server restarts.

## File Structure
```
src/features/        upload, facts, progress/recovery, result, checks, dialogs, source, glance
src/ui/              shared tokens, controls and matching icons
src/workflow/        reducer, API, request lifecycle
server/agent/        provider adapter, prompts, bounded repair orchestration
server/render/       SVG, actual font measurements, raster and A3 PDF
server/              API routes and transient jobs
shared/              facts/layout/report schemas and types
public/              self-hosted assets and synthetic sample notice
tests/               fixtures, contract tests and browser flows
design/              approved reference inventory and explicit UX refinements
devpost/             process documents and final app map
```

## External Services and Dependencies
Ollama: http://127.0.0.1:11434/api/chat, installed qwen3-vl:2b-instruct; local
execution consumes compute. Existing vLLM: http://127.0.0.1:8000/v1, Gemma4 model.
Neither requires a new cloud key here. The existing Gemma endpoint rejected an
actual vision request; only Ollama receives images. Real extraction/readback
and a reopened A3 PDF have passed. Do not unload or kill models/processes
owned by other active tasks.
Docs: https://docs.ollama.com/capabilities/vision and
https://docs.ollama.com/capabilities/structured-outputs .
New cloud-provider setup requires the applicable credential workflow and user
authorization. No hidden API use or silent paid fallback.

## Important Failure Modes
- Unreadable/unsupported source: explain the fact or format and allow replacement.
- Network/model interruption: keep source/facts, resume phase and repair budget.
- Invalid model data/failed checks: explicit failure after bounded repairs.
- PDF failure: retain the same sign, retry file creation or offer labeled SVG.
- Reset/source change during a request: invalidate the request; late output ignored.

## What Was Simplified and Why
Eight UI families rather than a separate implementation for each PNG. One current
notice rather than accounts. A bounded sign layout rather than a full graphics
editor. A local model rather than waiting for a cloud key. These preserve the
participant-approved kernel and are not simulations of it.

## Decisions and Open Issues
This transcribes the accepted execution plan and UX amendments. The participant
explicitly approved proceeding and delegated routine implementation decisions.
The local-model pass gate was a new image through actual AI, real SVG,
independent image read and reopened A3 PDF. It passed for a synthetic community
workshop; the actual interface also passed the school-pickup journey with a
human-style correction of the action, followed by 5/5 readback and a real A3 PDF.
No personal learning uncertainty is invented. Physical reading tests, participant
hands-on review and public video access must be recorded from actual evidence.
