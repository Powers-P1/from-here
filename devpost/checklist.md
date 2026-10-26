---
doc: checklist
status: approved
approval_basis: same kernel-first build order in the participant-approved implementation plan
---

# Build Checklist

Build mode: fast — participant explicitly requested autonomous execution of the
displayed plan. Mechanical verification and honest evidence remain mandatory.

## Slices

- [x] **1. A new notice becomes a real checked A3 artifact**
  Becomes usable: A runnable core proof takes a new notice image through real model extraction, confirmed facts, AI layout, actual render, isolated image read and reopened PDF.
  Why now: Proves the kernel and local vision/export uncertainty before the complete UI.
  PRD ref: `prd.md > Design, check and repair`, `Compare and export`
  Spec ref: `spec.md > Model adapter and bounded agent`, `Renderer and checks`, `Export and temporary job storage`
  Build: Bootstrap dependencies in this slice; implement schemas, renderer, model adapter and bounded pipeline, synthetic test input and a runnable proof command.
  Verify (mechanical): Contract tests plus real local-model run with retained evidence; reopen the PDF, confirm one A3 page and preserved conditions.
  Learner check: Open the generated image and PDF; compare audience, location, FROM time and accessible entrance with the source.
  Commit: `Prove real vision to checked A3 export`

- [x] **2. The author completes the core journey in the actual interface**
  Becomes usable: Upload, read, edit/confirm, design, compare and download on mobile and desktop.
  Why now: Makes the proven kernel usable in the approved visual system.
  PRD ref: `prd.md > The Core Journey`, `Look and Feel`
  Spec ref: `spec.md > Workflow and UI families`
  Build: Implement reusable feature views, real API calls and controls, exact design tokens and the six approved UX refinements.
  Verify (mechanical): Type/build checks; browser upload-to-download path on 390 and 1440 widths; view_image concept versus browser screenshots and copy comparison.
  Learner check: Add another notice, confirm details and download it; report unclear actions or mismatches.
  Commit: `Build clear responsive notice workflow`

- [x] **3. Errors, returns and the optional memory exercise work**
  Becomes usable: Unknown data, stop quality, service retry, export error, source zoom, reset and memory exercise behave honestly.
  Why now: Completes the approved states without turning them into extra mandatory steps.
  PRD ref: `prd.md > States and Boundaries`, `Details and optional memory exercise`, `Cancel, retry and start again`
  Spec ref: `spec.md > Data Model`, `Important Failure Modes`, `Memory exercise`
  Build: Context-preserving overlays and guards, cancellation/stale-result protection, bounded retries and complete focus states.
  Verify (mechanical): Meaningful state/renderer/browser tests, invalid input and unknown-time tests; no leaked expected answer or stale checked export.
  Learner check: Try a bad file, cancel and retry a task, start another notice and run the memory exercise.
  Commit: `Complete recovery and optional memory flow`

- [x] **4. The release can be reproduced and shown for submission**
  Becomes usable: Clean build, tested instructions, license/assets, genuine demo recording and complete technical handoff.
  Why now: Publishes evidence of the actual product after release QA.
  PRD ref: `prd.md > What We're Building`, `Non-Goals`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`
  Build: Verify actual production UI at 320/390/768/1024/1440, keyboard/zoom, fresh data and A3 files; create code-grounded app map and factual technical docs; prepare recording and repository.
  Verify (mechanical): Tests, production startup, actual-model evidence separated from mocked tests, public-material audit and video playback/link checks where published.
  Learner check: Explore the production app and check the real recording and public material before submitting.
  Commit: `Prepare reproducible hackathon release`

## Hands-on Checkpoints
- [ ] Early usable behavior explored — participant feedback after slice 2, if supplied; not inferred from agent tests.
- [ ] Final kick-the-tires exploration and feedback completed.

## Final Review
- [ ] All mechanical release checks and visual fidelity comparison passed.
- [x] Final review complete — feedback resolved and learner confirms ready to ship.

## Code Tour and App Map
- [ ] Learning activity complete — actual route/recap or connected practice, with evidence.
- [ ] Optional edit and transfer reflection addressed honestly.
- [ ] `devpost/app-map.html` generated from finished code, checked and shown.

Activity and evidence: Code-grounded reference map prepared and opened in the Codex file panel (queued). Its browser preview was blocked by URL policy; source paths were checked statically. No participant learning or completed guided activity is claimed.
Route and stops: useWorkflow saveFacts/act → designAndCheck/readSign → download/exportPdf. Reference route, not participant-led practice.
Edit outcome: Not performed.
Reflection: Not supplied.
Activity mode: Autonomous execution requested; reference route and concise explanation will accompany the product.

## Revisions
- The existing local vLLM Gemma endpoint returned an actual HTTP 400 saying the model is not multimodal. The adapter therefore defaults to the installed Ollama Qwen3-VL model. CPU execution is the conservative default while the shared GPU is occupied; no other model or process was stopped.
- The small vision model transcribed the new notice correctly but misclassified a readable exception in a complex nested response. Split image transcription (existing Qwen3-VL) from structured interpretation and layout (existing text-only Gemma service). Readback still begins from the actual sign image with no source, answers or prior feedback. This is live local inference, not a seeded answer.
- Slice 1 verified on 25 October 2026: actual workshop extraction/design/readback passed; actual school UI journey passed 5/5 with zero repairs. Both exported PDFs reopen as one exact 297 × 420 mm page. Evidence is retained separately from mocked browser tests. Twenty offline contract/API/pipeline/provider/real-renderer tests pass.
- A real Gemma JSON whitespace loop interrupted school readback. A discriminator-first exception schema and compact-JSON instruction resolved that observed failure without accepting incomplete data. Actual unclear-time and absent-field source probes passed again after this change.
- Independent review exposed numeric-range/date-range/time normalization errors; regression tests now retain complete ranges and never infer AM/PM. Identified codes, URLs and marked literals also retain case instead of receiving the ordinary heading-capital style.
- Real glyph ink bounds replaced SVG em-cell bounds; the original measurement produced false margin failures. PDF page dimensions are normalized after Chromium rounding, then checked by reopening the resulting file.
- Slice 2 verified: live development and built-production UI both completed the actual school workflow, including editing the extracted action, 5/5 isolated readback, comparison and PDF download. The 32 accepted visual states are implemented as eight responsive families. Actual screenshots were compared with representative approved references; this is not a claim of an exhaustive pixel diff or participant hands-on approval.
- The shared UI families include recovery and Glance. Their distinct slice-3 checkpoint records adversarial interaction verification, rather than pretending these components were built as independent pages after the core.
- Slice 3 verified: eight browser regressions pass against the production build after npm ci (45.3 seconds). They cover unknown-time blocking, invalid replacement retention, all fact editors, a delayed save, cancellation versus a late poll, consumed repair budgets, service retry, exhausted quality stop, draft labeling, Original-tab exports, export failure and recovery, reset and the complete memory exercise. These responses are intercepted test data; separate actual-source probes establish local AI behavior.
- Independent review found that an unreadable exception retained old values and that a delayed Save could close a newer editor. Both were fixed and are covered by the browser regressions: non-known exceptions clear both values; the editor cannot close while saving.
- Browser fixture outputs now live under tests/fixtures/checked-workshop with provenance, so a fresh clone can run interaction tests without external QA files or a model. Their reused source extraction remains labeled. QA output paths/base URL can be overridden for a separate production run.
- Release mechanics verified: the production build and all 38 current automated tests pass. The mentor independently completed the live public AI workflow, 5/5 checks and an actual A3 PDF download. The narrated 93-second film v3 is public at https://www.youtube.com/watch?v=x2jaGNFlA4I after explicit publication and upload-terms approval; English captions were published and browser playback checked. Participant form answers, hands-on exploration and submission are not invented.
- One all-2B CPU experiment completed but correctly stopped at 2/5 readback after two repairs. It is rejected as a supported minimum. The default verified Qwen/Gemma setup is retained and its external model-host requirements are documented.
- Release and submission completed on 26 October 2026: the participant supplied/corrected personal questionnaire answers and explicitly approved the final eligibility statements, terms and sending. Devpost displayed “Project submitted!” for https://devpost.com/software/from-here . The release includes the public repository, planning documents, live app, narrated film, dedicated cover and three captioned evidence images. Unperformed participant hands-on and learning activities above remain unchecked.
