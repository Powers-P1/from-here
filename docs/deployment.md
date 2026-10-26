# Public deployment

[Open FROM HERE](https://from-here.onrender.com/). The service is live on Render Free in Frankfurt, independent of the developer's computer. Visitors do not need an account or an API key.

The separate [product website](https://powers-p1.github.io/from-here/) is published through GitHub Pages. Its organisation, reader, guide, jury and privacy pages do not depend on the Render server. The jury and guide pages explain the cold start before launching the app in a new tab. See [public site and walkthrough](public-site.md).

FROM HERE needs a Node server and Chromium for real rendering and PDF export. GitHub Pages only hosts static files, so publishing `dist/` there would leave the AI and export routes unavailable. Other projects do not occupy this repository's separate Pages slot; the runtime is the reason for using a full web-service host.

## Render package

`Dockerfile` installs Node 24, production dependencies and the matching Playwright Chromium. It builds the existing UI, omits local environment files and runs the server as the unprivileged `node` user. Both UI and API are served from one origin, with the API key held only in the service environment. `render.yaml` provides a Free web-service Blueprint in Frankfurt; set `ANTHROPIC_API_KEY` through Render's private environment controls, never in Git or a Docker build argument.

The same configuration can be deployed manually using the public Git repository URL, the Docker runtime, the Free instance type and `/api/health`. A public-repository deployment does not require granting access to private repositories. Set `TRUST_PROXY=1` for Render's reverse proxy. With manual public-repository setup, deploy updated commits manually if no Git provider integration is configured.

## Public demo boundaries

- No visitor login, installation or visitor API key.
- Signed, HttpOnly, Secure, SameSite=Lax browser-session cookies protect each visitor's job routes, including original images, preview, SVG, PDF, edits and cancellation.
- Twenty uploads and sixty mutating actions per network address per hour; polling does not consume this allowance. Cross-origin browser mutations are rejected.
- The deployed configuration retains at most eight transient jobs and runs at most two AI workflows concurrently. A busy response preserves the uploaded notice for retry.
- A process-local limit of 200 Anthropic requests per UTC day is a best-effort demo brake. It resets when the process restarts, including after a cold start, and is not a provider billing limit.
- Jobs are in memory, not a saved-project database. Restarting the service loses them. Download results to keep them. Photos and facts are processed by the configured Anthropic service.

The Free instance can sleep after fifteen minutes without traffic; its next start can take about a minute. It uses ephemeral storage. This is a hackathon demo, not an always-on production service. See [Render Free service limits](https://render.com/docs/free) and [GitHub Pages hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

## Verification

The initial hosting package passed 34 automated tests; the product-site and walkthrough update passed 36; the mentor fixes pass 38. The actual Docker image built successfully and rendered/exported the synthetic school sign under Linux with a 512 MB memory limit and 0.1 CPU. It ran as UID 1000 and did not contain `.env.local`. The PDF reopened as one exact 297 × 420 mm page. This container render did not make an AI call; live cloud behavior has separate evidence in `release-verification.md`.

On 25 October 2026, Render deployed application commit `72c2509bc7b589e9b86ddaf57e49b85f8881f383` and reported **Live**. The public health endpoint returned the configured Anthropic provider and Claude Sonnet 5.5 model.

An anonymous browser session completed the public workflow with a real file upload of the synthetic school notice, actual extraction, human confirmation and editing, redesign, fresh readback, and PDF/SVG downloads. All five Anthropic requests completed; the report matched **5 of 5** facts with zero repairs and the checked artifact hash matched the exported SVG. The downloaded PDF reopened as one exact 297 × 420 mm page and retained the audience, action, destination, date/time and wheelchair-accessible exception. PDF text extraction joins the two display lines of “East entrance”; comparison ignores whitespace when checking this phrase.

The rendered interface was inspected at desktop 1440 × 1000 and mobile 390 × 844. The mobile editor and result worked without horizontal overflow; the preview image loaded and the browser recorded no warning or error messages. These are browser viewport checks, not tests on physical iOS or Android devices. A separate request without the visitor cookie could not retrieve the private source image (404).

The deployment evidence, including the actual job report, exports, PDF validation and screenshots, is retained outside the public repository. Documentation-only updates after the deployed application commit do not require a service redeploy. Auto-deploy is disabled for this manual public-repository deployment.

## Checklist follow-up, 26 October 2026

Render reported commit `7366480a7a775017e86178c149360d82011054e8` **Live**, deployment `dep-dbfb33qvcj2c73ffn44g`. The app change is the visible English PNG/JPG / 10 MB sentence before file selection; AI/render/export behavior is unchanged. The new release has 43 passing automated tests, including five targeted readback/export regressions, and a passing production build. A fresh public browser upload of the sample reached Find key details without an AI call.

GitHub Pages run `40255921829` successfully published the same follow-up. Six public pages and the film resources returned HTTP 200 without cookies/authorization. The final narrated MP4 supports HTTP 206 byte ranges. Public CUA playback, pause and seek were verified with audio unmuted, no media error and one burned caption layer; the page contained no YouTube iframe. Desktop 1440 × 1000 and mobile 390 × 844 checks showed no page overflow in inspected states, and the checked browser logs had no warnings/errors. These checks do not claim subjective listening or physical-phone testing. See [judging and handoff](operating-plan.md).
