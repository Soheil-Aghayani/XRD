# XRD Workbench

English diffraction workbench with local XLSX/text import, peak review, reference plotting, positional matching and JSON/CSV exports.

## Run

Node.js 22 or newer. The XLSX reader is vendored; no package installation is needed.

```sh
npm run dev
npm test
npm run check
npm run build
```

Open http://127.0.0.1:5188. GitHub Pages deploys dist/ on pushes to main.

## Reference library

Curated COD structures replace four selected position tables. Each entry includes all reflections retained by pymatgen in the stored 0–179 degree domain at 1.5406 Å: d-spacing, grouped hkl, multiplicity and calculated relative intensity. Complete calculated patterns do not mean an exhaustive materials database or experimentally validated standards.

Name/formula/ID and required-element filters select structures for matching. A separate calculated intensity cutoff defaults to 5%; set 0 for all stored reflections. Intensities filter and size reference sticks; matching remains positional. Source links, publications, recorded conditions, parser notices, revisions, package versions and SHA-256 hashes are included. Original CC0-1.0 CIFs and retrieval metadata are pinned in library/cif/. The manifest records unsuccessful and excluded candidates.

## Rebuild

Python 3.13 with requirements-library.txt was used.

```sh
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-library.txt
.venv/Scripts/python scripts/build_library.py --offline
```

Offline mode uses pinned CIFs without network requests. Running without --offline refreshes selection through COD queries; cached query responses are not deployed. Selection uses exact mineral/common names, recorded ambient conditions, coordinates and ordered occupancies. Missing symmetry, missing elements and modulated structures require manual review. Inspect any refreshed selection before publishing. One structural model per included phase cannot represent all compositions, temperatures or polymorphs.

The engine is pymatgen XRDCalculator with symprec=0, intensity scaled to 100 and no supplied Debye–Waller factors. Positions convert by Bragg's law for the user wavelength; intensity stays calculated at 1.5406 Å. Shorter wavelengths can access additional reflections outside the stored domain. Documentation: https://pymatgen.org/pymatgen.analysis.diffraction.html and https://www.crystallography.net/cod/.

## Limits and privacy

The score is reference coverage × (1 − 0.5 × mean absolute angular error / tolerance) × 100, with greedy one-to-one assignment. Scores are not probabilities or phase fractions. Mixtures, overlaps, preferred orientation and instrument effects require expert interpretation. No refinement, calibration or background correction is performed. Synthetic consistency checks do not constitute experimental validation.

Local maxima detection uses a height threshold and minimum 0.2 degree separation. Users can review peaks while preserving raw scan rows and original peaks in JSON. XLSX supports worksheet/column/first-row selection. Text supports one/two columns; binary RAW/RD and XYE are not supported.

Matching and workbook processing stay in the browser. No sample scans, thesis files, analytics or measured intensities are bundled or sent to COD. Source links navigate externally only when clicked.

Support uses a keyboard-accessible popup with network/currency selection and address copying. No QR code, wallet connection or transaction. Icons use Solar.
