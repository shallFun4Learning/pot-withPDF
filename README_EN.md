<img width="160px" src="public/icon.svg" align="left"/>

# pot-withPDF

> English-first README.
> 中文默认说明请见：[README.md](./README.md)

pot-withPDF is an **unofficial fork** of [pot-app/pot-desktop](https://github.com/pot-app/pot-desktop), focused on literature reading, translation, and PDF annotation.

**Important:** this repository is **not** an official pot-app release.

![License](https://img.shields.io/github/license/shallFun4Learning/pot-withPDF.svg)
![Repo](https://img.shields.io/badge/GitHub-pot--withPDF-black?logo=github)
![Tauri](https://img.shields.io/badge/Tauri-1.6.x-blue?logo=tauri)
![PDF.js](https://img.shields.io/badge/PDF.js-pdfjs--dist-red)

---

## Links

- Repository: <https://github.com/shallFun4Learning/pot-withPDF>
- Issues: <https://github.com/shallFun4Learning/pot-withPDF/issues>
- Releases: <https://github.com/shallFun4Learning/pot-withPDF/releases>

---

## What it does

pot-withPDF keeps the desktop translation workflow from Pot and adds a PDF reading layer for research and paper reading:

- local PDF open
- selection translation in a sidebar
- highlight annotations with save / save as
- side-by-side PDF compare
- dedicated **Original / Translation** compare mode
- copy citation with page number
- tabs, restore recently closed, reading progress restore

---

## Usage

### Open a PDF

Open a local `.pdf` from the tray menu or the PDF toolbar.

### Selection translation

Use **Translate** mode:

- select text in the PDF
- review/edit the source text in the right sidebar
- translate with the existing Pot translation services
- copy the selection or copy a citation with page number

### Highlight annotation

Use **Highlight** mode:

- drag across text to create highlights
- manage color, notes, and extract list
- save or save as to write annotations back into the PDF

### Compare reading

#### PDF vs PDF

Open two PDFs and choose another tab from **Compare**.

- synced reading
- free reading
- swap left and right documents

#### Original / Translation

Choose **Compare → Original / Translation**.

- the PDF stays on the left
- the selected source passage stays on the right
- the primary translation result is displayed beside it

### Useful shortcuts

- `Ctrl/Cmd + 1`: Translate mode
- `Ctrl/Cmd + 2`: Highlight mode
- `Ctrl/Cmd + 3`: Focus mode
- `Ctrl/Cmd + F`: Search in PDF
- `Ctrl/Cmd + S`: Save PDF
- `Ctrl/Cmd + T`: Open PDF / new tab
- `Ctrl/Cmd + Shift + T`: Restore recently closed tab
- `Ctrl/Cmd + W`: Close current tab

---

## Install and run

### Release packages

Please use the fork release page instead of the upstream Pot release page:
<https://github.com/shallFun4Learning/pot-withPDF/releases>

### Run from source

Bootstrap:

```bash
bash scripts/bootstrap-dev.sh
```

or on Windows PowerShell:

```powershell
./scripts/bootstrap-dev.ps1
```

Install dependencies:

```bash
corepack enable
pnpm install
```

Run web dev server:

```bash
pnpm dev
```

Run desktop app:

```bash
pnpm tauri dev
```

---

## Test commands

```bash
pnpm test:unit
pnpm test:e2e
pnpm build
./scripts/cargo-linux.sh test --manifest-path src-tauri/Cargo.toml
```

---

## Scope

This fork is intentionally focused on **reading + translation + annotation**.

Current scope:

- local PDF first
- highlight annotation, not full body editing
- no official Pot updater channel
- unofficial fork branding and release channel

---

## Credits and License

- Based on [pot-app/pot-desktop](https://github.com/pot-app/pot-desktop)
- PDF support powered by [Mozilla PDF.js](https://github.com/mozilla/pdf.js)
- Distributed under **GPL-3.0-only** in this repository

Thanks to:

1. the upstream Pot team and contributors
2. the PDF.js maintainers
3. the Pot service / plugin ecosystem authors

This repository keeps the required copyright and acknowledgement context, but it is **not** presented as an official pot-app build.
