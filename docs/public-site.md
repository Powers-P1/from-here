# Product website and walkthrough

The public entry is https://powers-p1.github.io/from-here/ with separate pages for organisations, readers, the guide, jury evaluation and privacy/limits. GitHub Pages serves these static pages. Render continues to serve the working application at https://from-here.onrender.com/ . The app header links back to the product home before an upload.

The site reuses the approved wordmark, fonts and palette. Its before/after example uses the repository's synthetic school input and the exact SVG/PDF from the verified public Sonnet run. It is labelled as saved example output. It is not presented as a fresh result for the next visitor. Neither the unpublished narrated film nor licensed audio is included in this website.

The organisation page covers schools, shops, venues and public-facing teams publishing notices. The reader page covers their visitors and customers reading the printed output. There is no invented marketplace, retailer connection, account system, checkout or measured commercial ROI.

## Cold start

The jury and guide pages state prominently that the first app launch may take about a minute because Render Free sleeps after fifteen idle minutes. App launch links open a new tab, leaving that explanation available. The static site and its example do not call the backend, automatically wake it or make AI requests. There is no keepalive monitor.

## Outcome-based walkthrough

Opening the application with `?walkthrough=1` enables an optional in-flow coach. It never covers controls, clicks for the visitor or advances on a timer. There is no Next button. Exit removes the query parameter and leaves the current work intact.

Progress requires five actual outcomes: a successful upload; extracted facts; a passed report bound to the current artwork hash; opening the current result's checks; and starting a successful checked-PDF download. Inspection/export proof is bound to both job ID and artifact hash, so an older job or revised artwork cannot satisfy the new walkthrough. Reading, interruption and stopped checks cannot count as success. Browser download initiation is not a claim that the visitor has opened the file or printed it.

`tests/guide-objectives.test.ts` covers failed/interrupted states, mismatched hashes, downloads before inspection, and stale job/artifact proof. The ordinary app remains available without the guide. AI checks still do not certify human readability or accessibility.

## Build and publishing

Run `npm ci` and `npm run build:site`. Output is the ignored `site-dist/` directory, with a `/from-here/` URL base. `SITE_BASE_PATH` can override this for another deployment. Six static HTML pages are emitted with locally hosted fonts and explicit asset copies; there is no client framework, analytics script or embedded secret.

`.github/workflows/pages.yml` publishes this output on relevant main-branch changes. The Render service is updated separately through its manual deploy control. The runtime's Docker image does not need to include the static site source.

The original application references are retained in `design/approved/`; site, jury and walkthrough design concepts are in `design/site/`. Local browser review includes desktop and 390px mobile views, image load checks, navigation, cold-start copy and an exit action that preserves the application.

## Verified public release, 25 October 2026

GitHub Pages workflow run `40233068594` published commit `52c11de8561fdf1208c56a01dbb251b8e328e071` successfully. All six public pages, the stylesheet, font, SVG and saved PDF returned HTTP 200. Render deployed the same application commit and reported the service live.

An anonymous browser clicked the launch link on the public jury page and completed all five live walkthrough steps at a 390 × 844 viewport. The author shortened the action to “Child pickup” and the exception to “Wheelchair-accessible pickup: Main Entrance”, using the original notice as reference. The real AI report recovered 5 of 5 facts. Opening the checks unlocked the final task; a real PDF download completed the guide. Finish removed the coach while preserving the result. The downloaded PDF reopened as a single 297 × 420 mm page with the action, destination, date/time and linked exception intact. No browser warnings or errors were recorded. This does not claim a test on a physical phone.
