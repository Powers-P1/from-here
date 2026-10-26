# Product website and walkthrough

The public entry is https://powers-p1.github.io/from-here/ with separate pages for organisations, readers, the guide, jury evaluation and privacy/limits. GitHub Pages serves these static pages. Render continues to serve the working application at https://from-here.onrender.com/ . The app header links back to the product home before an upload.

The site reuses the approved wordmark, fonts and palette. Its before/after example uses the repository's synthetic school input and the exact SVG/PDF from the verified public Sonnet run. It is labelled as saved example output. It is not presented as a fresh result for the next visitor. The home and jury pages link to the narrated film on YouTube. Raw licensed audio and private production files are not included in this website.

The organisation page covers schools, shops, venues and public-facing teams publishing notices. The reader page covers their visitors and customers reading the printed output. There is no invented marketplace, retailer connection, account system, checkout or measured commercial ROI.

## Cold start

The jury and guide pages state prominently that the first app launch may take about a minute because Render Free sleeps after fifteen idle minutes. App launch links open a new tab, leaving that explanation available. The static site and its example do not call the backend, automatically wake it or make AI requests. There is no keepalive monitor.

## Outcome-based walkthrough

Opening the application with `?walkthrough=1` enables an optional in-flow coach. It never covers controls, clicks for the visitor or advances on a timer. There is no Next button. Show me where focuses the actual highlighted control, including the correct mobile or desktop version. Exit or Esc removes the query parameter and leaves the current work intact; an open dialog handles Esc first. Exit restores focus to a useful control or the current heading. The app also has a keyboard skip-link and an Anthropic/privacy notice beside upload and reading.

Progress requires five actual outcomes: a successful upload; extracted facts; a passed report bound to the current artwork hash; opening the current result's checks; and starting a successful checked-PDF download. Inspection/export proof is bound to both job ID and artifact hash, so an older job or revised artwork cannot satisfy the new walkthrough. Reading, interruption and stopped checks cannot count as success. Browser download initiation is not a claim that the visitor has opened the file or printed it.

`tests/guide-objectives.test.ts` covers failed/interrupted states, mismatched hashes, downloads before inspection, and stale job/artifact proof. The ordinary app remains available without the guide. AI checks still do not certify human readability or accessibility.

## Optional online PWA

The app origin serves a standalone web-app manifest, real 192/512px icons, a maskable icon and an Apple touch icon. A dismissible mobile invitation offers platform-specific steps; installation help can be reopened after dismissal. A native browser install prompt is used only when the browser provides it and the user asks. Safari/iOS gets Share-menu instructions. Installed display mode hides the invitation.

This PWA is an online application. It adds no offline project store, service-worker cache or offline AI claim. AI and export need internet; jobs remain temporary and the Render cold start remains possible. Service workers are not a prerequisite for current installability; see [MDN installation requirements](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable). No operating-system installation was performed during agent QA.

## Build and publishing

Run `npm ci` and `npm run build:site`. Output is the ignored `site-dist/` directory, with a `/from-here/` URL base. `SITE_BASE_PATH` can override this for another deployment. Six static HTML pages are emitted with locally hosted fonts and explicit asset copies; there is no client framework, analytics script or embedded secret.

`.github/workflows/pages.yml` publishes this output on relevant main-branch changes. The Render service is updated separately through its manual deploy control. The runtime's Docker image does not need to include the static site source.

The original application references are retained in `design/approved/`; site, jury and walkthrough design concepts are in `design/site/`. Local browser review includes desktop and 390px mobile views, image load checks, navigation, cold-start copy and an exit action that preserves the application.

## Verified public release, 25 October 2026

GitHub Pages workflow run `40233068594` published commit `52c11de8561fdf1208c56a01dbb251b8e328e071` successfully. All six public pages, the stylesheet, font, SVG and saved PDF returned HTTP 200. Render deployed the same application commit and reported the service live.

An anonymous browser clicked the launch link on the public jury page and completed all five live walkthrough steps at a 390 × 844 viewport. The author shortened the action to “Child pickup” and the exception to “Wheelchair-accessible pickup: Main Entrance”, using the original notice as reference. The real AI report recovered 5 of 5 facts. Opening the checks unlocked the final task; a real PDF download completed the guide. Finish removed the coach while preserving the result. The downloaded PDF reopened as a single 297 × 420 mm page with the action, destination, date/time and linked exception intact. No browser warnings or errors were recorded. This does not claim a test on a physical phone.

## Mentor follow-up, 25 October 2026

Pages workflow `40240732925` published the installation and walkthrough documentation from `3121cd05f11ef097bc269d52ca518e19c5b09782`. Render subsequently reported application commit `4db737095604aa738e12cfb3c6918df26899d71c` live. That final application change also prevents delayed heading focus from overriding a fast keyboard action on Show me where. The build and all 38 automated tests passed.

Native Edge reported no installability errors and offered its real install prompt. Platform instructions, dismissal, modal Escape handling, guide highlighting, keyboard focus and the skip-link were checked. No operating-system installation or physical-phone test was performed.

After the final deployment, the WearAgain/Tour Rescue mentor independently completed the public sample → AI → author edits → layout → 5/5 checks → actual A3 PDF → Finish workflow. Mobile 390 × 844 and desktop 1440 × 1000 layouts had no horizontal overflow in the checked states, and the browser log contained no warnings or errors. The downloaded PDF was parsed and visually reviewed at 297 × 420 mm. Finish preserved the result and enabled export. A separate owner run used the actual upload file chooser and independently verified the downloaded PDF contents and dimensions.

The 93-second narrated film is now revision 3. Its closing card links directly to the public jury demo with a verified QR, with source code secondary. The mentor inspected the encoded video frames and complete decode, and confirmed this resolves the film's main requested change. The original narration audio is unchanged; automated audio/transcript checks do not constitute subjective listening. Private media and review evidence remain outside the source repository.

## Public narrated film, 26 October 2026

After the participant's explicit publication approval and separate confirmation of YouTube's upload terms, revision 3 was published publicly on the Damian channel: https://www.youtube.com/watch?v=x2jaGNFlA4I . YouTube reported publication complete and no copyright-check problems at publication time. The English SRT captions were uploaded and published, and realistic illustrative AI content was disclosed. Browser playback was verified with audio unmuted. This is not a claim of subjective audio listening or of a submitted Devpost entry. The home page, jury page and README link to this film without embedding a third-party player on initial site load.
