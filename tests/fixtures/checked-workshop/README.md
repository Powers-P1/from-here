# Recorded workshop fixture

These four files are recorded real output from the synthetic community-workshop notice:

- `report.json`: recorded facts, layout, checks and model receipts.
- `sign.png`: the actual rendered sign preview.
- `sign.svg`: the corresponding actual A3 SVG.
- `sign-A3.pdf`: the corresponding actual PDF.

The browser regression uses them **only as mocked test data**. It intercepts API requests and does not contact a model. Passing a browser test does not prove live extraction, live readback, human comprehension or print readability.

The source notice is `public/samples/community-workshop.png`. Its content is synthetic. The recorded report explicitly has `extractionWasReused: true`; preserve that provenance rather than describing this fixture as a new end-to-end source reading. The stored check and output are not recomputed by the browser suite.

The report was reviewed for credentials and private filesystem paths before inclusion. Request hashes are provenance hashes, not API keys. The files were copied unchanged; model/provider labels describe their recorded origin and are not a current service-readiness claim.
