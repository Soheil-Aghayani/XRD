# XRD Workbench

A local-first, English diffraction comparison page. Enter peak positions in 2θ or d-spacing, or import a two-column text scan. Inspect four curated COD-derived calcium references and export the complete analysis as JSON.

## Run

Requires Node.js 22 or later. No packages need installing.

```sh
npm run dev
```

Open http://127.0.0.1:5188. Run `npm test` and `npm run check` to verify the scientific core and JavaScript syntax.

## Scientific scope

- References are **selected CIF-derived positions**, not complete simulated patterns or measured reference intensities. Reference sticks have equal height intentionally.
- Four phases only: CaO, calcite, portlandite, calcium chloride hexahydrate. This is not a comprehensive phase identification database.
- Match scores are reference coverage weighted by positional error, not probabilities or phase fractions. Assignment is greedy and one-to-one; broad tolerances and overlaps can affect results.
- The user supplies a single wavelength, scan range, tolerance and optional reference offset. No automatic calibration, background correction, refinement or phase quantification.
- Scan detection uses local maxima above a fraction of the maximum intensity and 0.2° minimum separation. Review peaks; noisy scans and broad peaks require better preprocessing.
- Text import supports comma, tab or space separated columns, optional recognized header and comment lines. Binary RD/RAW, XLSX and three-column XYE are not supported yet.
- Scans remain in browser memory until exported by the user. No analytics or external requests run during matching. Source links navigate to COD only when clicked.

## Provenance

`references.json` contains source links, CC0-1.0 license, original CIF SHA-256 hashes, reference wavelength and packaging date. Positions were taken from an existing local COD comparison CSV. Source CIF revision, historical retrieval date and calculator version were not recorded and remain unknown. No thesis, sample scans or measured intensities are included.

Next scientific milestone: regenerate complete reference patterns from pinned original CIFs using a versioned diffraction calculator, record hkl and calculated intensity, validate with known experimental samples, and expand the licensed reference corpus.

## Publishing

The site is published at https://soheil-aghayani.github.io/XRD/ through GitHub Pages. The workflow tests and builds on every push to `main`; `npm run build` copies only the six public assets into `dist/`. Development scripts, tests, and screenshots are excluded from the deployed artifact. Public publishing was authorized on 2026-10-09. External scan uploads still require separate user approval.

