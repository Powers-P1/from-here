# Release verification

Date: 25 October 2026. The original local-model recording uses source checkpoint `72e5571` (documentation and packaging followed it). The current configuration adds Anthropic / Claude Sonnet 5.5, with a separately verified live workflow below. The earlier recording remains explicitly local-model evidence.

## Anthropic / Claude Sonnet integration

The application was connected to Claude Sonnet 5.5 using a private server-side API key. Authenticated model access was checked, and both the fresh technical proof and the real application workflow passed all five fact groups with zero layout repairs. The actual UI run included author confirmation of `Child pickup`, fresh image readback, comparison, and a downloaded PDF. The reopened PDF has one page of exactly 297 × 420 mm; the expected action, entrance, qualified time and accessible-pickup instruction are present. The SVG artifact hash matches the check report.

- [Actual Sonnet application workflow and receipts](evidence/sonnet-school/job.json), [interface](evidence/sonnet-school/application.jpg).
- [Actual generated sign](evidence/sonnet-school/sign.png), [editable SVG](evidence/sonnet-school/sign.svg), [downloaded PDF](evidence/sonnet-school/sign-A3.pdf), [PDF validation](evidence/sonnet-school/pdf-validation.json).
- Two additional fresh Sonnet source probes passed: an obscured time remains empty and unreadable and blocks design; genuinely absent library-notice audience/time/exception remain not stated.
- The 28 offline tests pass, including authenticated image requests, fresh-message isolation, original geometry bounds, cancellation, missing credentials, refusal/truncation, official-endpoint restriction and error redaction. The production build passes. These automated tests use doubles; live Sonnet behavior is established by the separate retained real receipts above.

No local inference service is needed for this cloud profile. The original local configuration and its evidence remain below. No human comprehension study or physical print-distance test is claimed.

| Evidence | Result | Boundary |
| --- | --- | --- |
| Fresh `npm ci` | PASS, 152 packages installed | Model weights and Chromium are separate prerequisites |
| `npm test` | 20 tests passed | Deterministic contracts, HTTP/provider/orchestration doubles, plus an actual Chromium literal-preservation render |
| `npm run build` | PASS after fresh install | TypeScript check and production Vite build |
| `npm run test:browser` against production | 8 passed, 45.3 seconds; no unexpected runtime/console errors | API intercepted; recorded fixture data, no model calls |
| Responsive interface | 320, 390, 768, 1024, 1440 CSS pixels; no horizontal page overflow in tested upload/facts/result flows | Logical viewports, not physical mobile keyboard tests |
| Real school workflow | Actual upload, OCR, action edit, plan, render, fresh readback, comparison and PDF download; 5/5 matched, zero repairs | Local Qwen3-VL + text-only Gemma; synthetic input, agent-operated UI |
| Real source boundaries | Obscured time stays empty/unreadable; library notice has genuinely absent audience/time/exception | Actual local inference, separately retained source probes |
| Reopened PDF | One page, exactly 297 × 420 mm; action, destination, FROM time and accessible entrance retained | Programmatic reopen and visual inspection, no physical print test |
| Demo recording | H.264 MP4, 87.58 seconds; full stream decoded successfully | CUA capture at approximately 2 fps, encoded at 12 fps; gaps between capture segments removed and visibly disclosed |
| Approved visual references | All 32 original SHA-256 values retained | Reference/render comparisons cover representative families, not an exhaustive native-pixel diff |

## Reproduce the checks

Follow `README.md` for local services and installation. Run `npm test` and `npm run build`. With `npm start` running, use `npm run test:browser`. It uses repository-local fixtures, so no AI service is needed for the browser suite. `FROM_HERE_BASE_URL` and `FROM_HERE_QA_DIR` can select another local server and separate evidence directory.

`npm run prove:kernel` performs actual inference by default. Leave `USE_RECORDED_EXTRACTION` unset for a fresh source reading. The fixture under `tests/fixtures/checked-workshop` preserves its explicit reused-extraction provenance and is only mock data during browser tests.

## Selected real artifacts

- [School workflow and actual model receipts](evidence/school/job.json)
- [Original synthetic source](evidence/school/source.png), [actual generated preview](evidence/school/sign.png)
- [Actual A3 PDF](evidence/school/sign-A3.pdf), [reopen validation](evidence/school/pdf-validation.json)
- [Actual production interface](evidence/school/application.jpg)
- [Rendered mobile interface](evidence/mobile-interface.png) — intercepted API with recorded workshop output; this image does not establish live inference.

The school SVG hash is `c185e73f0f655a359d8776bbfd1023dfcd761455cbf618de86932e6a16ec92f3`. The report and exported SVG agree. Raw QA files, capture frames and local personal context are excluded from the repository; only selected synthetic evidence is included.

## Remaining human and external steps

No participant hands-on feedback, physical A3 distance test, native 200% text-zoom test or human comprehension study is claimed. The app presents its automated-check limitation beside the result. The optional scripted memory exercise in the recording demonstrates behavior, not a study or outcome metric.

The offline app-map file was inspected and its source paths checked. Its browser preview was blocked by the browser URL policy, which permits HTTP/HTTPS and rejected the local file protocol; no browser rendering of that guide is claimed. This did not affect the tested HTTP application.

An all-2B CPU profile was tested once and rejected after an honest 2/5 readback stop and two repairs. The verified default remains the separate local Qwen vision / GPU-backed Gemma text setup; see `model-services.md`.

Publishing a repository or video does not submit an entry. The participant supplies their own Devpost answers and exit survey and confirms the final submission. See `devpost/submission-status.md` for the actual external-link status.

The public repository is https://github.com/Powers-P1/from-here . Anonymous repository metadata and raw README both returned HTTP 200. Its review recording is included under `demo/`; that does not replace the required YouTube/Vimeo publication. Personal learner context, local env files and raw user uploads are excluded.
