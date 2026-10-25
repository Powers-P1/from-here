---
doc: prd
status: approved
approval_basis: participant accepted the visual review, six UX amendments and execution plan on 2026-10-25
---

# FROM HERE — Product Requirements

For the office worker in `scope.md > Who It's For`, a short path from an English
notice photo to a clearer sign. Implements `scope.md > The Core Loop`.

## The Core Journey
1. Choose a PNG/JPG or the clearly identified sample; A3 is fixed, 3 m is default.
2. Inspect the chosen source and use Find key details.
3. Confirm audience, action, destination, date/time and any conditional exception.
   Unknown critical information blocks design; a fact not stated is different.
4. The agent plans, renders and checks. Real activity is shown without a fake
   percentage. Pass directly, repair up to twice, or stop with a reason.
5. Compare original/redesigned. Download the redesigned PDF or editable SVG.
6. Optionally inspect checks or run a short memory exercise. Start another notice
   from the result header through the existing discard guard.

## Screens and Layout
Eight responsive families cover 24 mobile and 8 desktop references:
upload; fact review/edit; progress/recovery; comparison; check details;
download/error/reset dialogs; source viewer; memory exercise.
The source sits beside facts on desktop. Mobile uses a source thumbnail with
View original. Mobile comparison uses tabs, desktop shows both papers at equal
preview scale. Copies of approved references and explicit UX amendments belong
under `design/`; they are evidence, never the actual application UI.

## Look and Feel
True white, ink #17282B, signal yellow #F1E36A, blue underlined links, thin rules,
small corners. Readable sans UI, condensed heavy sign typography. Keep the brand
focus-corner. Body/input at least 16 px, secondary text at least 14 px, touch
targets preferably 44 px. Scroll rather than shrink. No account wall, sidebar,
AI sparkle, score dial or decorative illustration. One yellow action per state.

## Features and Behavior

### Add and inspect a source
Source: `scope.md > The Core Loop`. Accept PNG/JPG, detect corrupt/unsupported
files and explain recovery. Replacing an existing notice requires its discard
guard; a bad replacement must not erase valid work. Viewing original preserves
the real image, including obscured parts, with zoom and return to the opener.

### Confirm facts and conditions
Source: `scope.md > The Unique Kernel`. Each known value is editable. A date and
time remain separate, and FROM/AT/UNTIL is preserved. The exception ties a
specific condition to an instruction/location. Do not invent an audience, time
or exception when not stated. Unreadable is not the same as absent. On unknown
time, show an empty input, a clear explanation and a route to a better photo.
Changing a confirmed value invalidates the checked artifact.

### Design, check and repair
Source: `scope.md > What "Working" Looks Like`. Agent decisions must affect an
actual layout. The renderer uses locked facts; the readback sees only a new
render and neutral field questions. A report checks meaning, fit and typography.
Two repairs is a maximum, not a scripted sequence. Explain failures in ordinary
language: e.g. AI could not read the wheelchair pickup note. History uses real
events. Stop-quality and service-interruption states are distinct.

### Compare and export
Source: `scope.md > The POC Boundary`. PDF is primary. SVG is described as editable;
an unchecked draft is explicitly named. Original-tab download still exports the
redesigned artifact. A file error preserves the result and retries export only.
Download started does not mean a known saved path. The file is truly A3 portrait.

### Details and optional memory exercise
Keep technical evidence secondary. Use Your details / AI read from the sign /
Changes made. State that the check concerns AI reading, not human comprehension.
Optional exercise: intro, 3–2–1 preparation, 2-second exposure, hide sign, free-text
question, feedback. Do not reveal the answer on the question screen. Repeating
the exercise is practice; it never upgrades the automatic result status.

### Cancel, retry and start again
Cancel stops the current action and ignores late responses. Retry resumes the
interrupted phase with its consumed repair budget. Source viewer, edit cancel,
download dismiss and reset cancel return to the actual opener. New notice is
available from the result, not hidden inside the check report.

## States and Boundaries
All visual states in `design/manifest.json` must be reachable through real
behavior or an explicitly test-only fixture. A first-pass success is valid.
No fabricated pass and no automatic restart after exhausted repairs. Transient
work does not imply an account, library or a durable saved project. Unsupported
input gives a clear explanation and source replacement. External services can
fail without losing facts. The file picker and keyboard are operating-system UI.

## Product Decisions
The participant selected FROM HERE after concept review, approved its visual
sample and full view coverage, accepted the UX review and implementation plan,
and then requested execution. Preserve that selection. Real AI is an explicit
participant requirement, beyond the hackathon's general tool-use requirement.
Local models were expressly allowed while cloud keys were unavailable.

## What We're Building
The complete core journey, all described error/recovery branches, responsive
layout and genuine AI/render/export behavior in the bounded scope.

## Deferred From the POC
Accounts, collaboration, translations and printer services as already cut in
`scope.md > Explicitly Cut`. A public hosted demo is optional after local QA.

## Non-Goals
Human-readability certification, a full design editor, made-up outcome metrics,
or static screenshots substituted for application controls.

## Open Questions
Local vision-model quality and latency will be tested in the first slice.
Actual user sessions and physical A3 testing are not yet performed; record
their availability and actual outcomes rather than infer them from agent review.
