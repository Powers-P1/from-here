# Public deployment

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

## Verification before publication

The 34 automated tests pass. The actual Docker image built successfully and rendered/exported the synthetic school sign under Linux with a 512 MB memory limit and 0.1 CPU. It ran as UID 1000 and did not contain `.env.local`. The PDF reopened as one exact 297 × 420 mm page. This container render did not make an AI call; live cloud behavior has separate evidence in `release-verification.md`.

Public URL, deployment status and browser workflow checks must be verified separately after creating the hosting service. The deployment package by itself is not evidence of a live website.
