# Wildflower synthetic data: the Ashford family

A synthetic health data set for exercising [Wildflower](https://github.com/wildflowerhealthio/Wildflower)'s
importers and viewers end to end. One family across three generations, whose
records tell stories where **a dose change moves a lab level or a device
reading**.

The records are made by Wildflower's real importers wherever one exists, so they
look exactly like an import would. The pharmacy HARs go through the HAR importer.
The lab results go through the LifeLabs importer's own synthesis. The watch data
is built with FHIR Sync for Pebble's builders. The X-ray goes through the DICOM
importer. Every person, account, address and identifier is fictional.

The tools live in Wildflower (`slices/synthetic-data/synthetic-data-core`).
This repository holds the narrative: the people, their timelines, the products
they are prescribed, the content checks, the emit script and the published
output. See Wildflower epic #787 and ticket #794.

## The family

| Gen | Person                                | Name cue                                      | Story                                                              | Sources                                               |
| --- | ------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| 1   | **Warren Ashford**, 78, Tyra's father | **War**ren → **war**farin                     | Atrial fibrillation on warfarin, and type 2 diabetes on metformin. | Rexall HAR, labs, chest X-ray (DICOM)                 |
| 2   | **Tyra Ashford**, 46, the centre      | **Ty**ra → **thy**roid                        | Hypothyroidism, with a levothyroxine overshoot.                    | Shoppers HAR (account holder), labs, Pebble (28 days) |
| 2   | **Beau Hartman**, 48, Tyra's spouse   | **Beau** → **b**eta blocker, **Hart** → heart | Hypertension and a high LDL.                                       | Shoppers HAR, labs                                    |
| 3   | **Fern Ashford**, 16, their daughter  | **Fe**rn → Fe, iron                           | Iron-deficiency anemia.                                            | Shoppers HAR, labs                                    |

Every date is a day counted back from one fixed as-of date,
**2026-09-28** (`src/family/as-of.ts`). To move the data set forward in time,
change that date and regenerate: the intervals between events stay the same.

### Warren

- **Warfarin.** Warren starts on 5 mg. His INR reaches 3.8, so the dose is cut
  to 4 mg and the INR settles around 2.6. The 4 mg prescription is renewed when
  its repeats run out.
- **Clarithromycin.** A cough brings a 7-day clarithromycin course, an
  interaction a checker should catch. His INR peaks at 4.1 during the course.
  Warfarin is held for four days, then resumed at 4 mg, and the INR recovers
  into the 2–3 range.
- **Chest X-ray.** A chest X-ray is taken at the cough visit.
- **Metformin.** Metformin goes from 500 mg to 1000 mg twice daily (two 500 mg
  tablets). His HbA1c falls from 8.4 to 7.0, and his fasting glucose falls with
  it. At his last refill, the pharmacy switches the generic from Teva to Sandoz.
- **Pharmacy.** Everything is filled at Rexall.

### Tyra

- **Levothyroxine.** The dose goes 50 → 75 → 112 mcg. Her TSH falls from 8.9
  through 6.1 and 4.4 to 0.08, and her free T4 rises above range.
- **Generic interchange.** One 75 mcg refill is dispensed as Apo-Levothyroxine
  instead of Synthroid. It is the same prescription with a new DIN on the label.
- **The cut.** Twelve days before the as-of date, the dose is cut to 88 mcg.
  Ten days later her free T4 has settled back into range, while her TSH is
  still low but climbing back (0.29 mIU/L): a suppressed TSH takes weeks to
  recover.
- **Pebble.** The watch covers the last 28 days.
  - While she is on 112 mcg, her resting heart rate climbs from about 77 to 92
    (it was about 68 before the overshoot). Her nights break at about 3 a.m.,
    and at the peak again at about 5 a.m.
  - After the cut, her heart rate eases back day by day as free T4 clears
    (about 89 the first day, 73 by the last), and her nights consolidate.
  - The watch also records a lunchtime walk about every third day, and a
    charge each evening.
- **Pharmacy.** Tyra holds the family's Shoppers Drug Mart account, and she
  manages Beau's and Fern's prescriptions on it.

### Beau

- **Atorvastatin.** Atorvastatin goes from 20 mg to 40 mg, and his LDL falls
  from 4.1 to 2.2 mmol/L. Each draw is a full lipid panel that is consistent
  under Friedewald.
- **Bisoprolol.** Bisoprolol goes from 2.5 mg (half a 5 mg tablet) to 5 mg, and
  is then renewed.
- **Monitoring.** His potassium, creatinine and eGFR (CKD-EPI 2021) are drawn
  with every lipid panel, and all stay in range.

### Fern

- **Ferrous sulfate.** Fern takes ferrous sulfate 300 mg daily. It is a natural
  health product, dispensed under its Transitional DIN.
- **Results.** Over about four months, her hemoglobin rises from 98 to 128 g/L
  and her ferritin from 6 to 45 µg/L. Her microcytic indices correct as she
  recovers.
- **The missed fill.** One refill is picked up two weeks late. Her hemoglobin
  and ferritin plateau across that gap.

### One Patient per person

Each person has exactly one Patient: the one their pharmacy import makes.
Every lab result, watch reading and image is filed on that Patient. The one
exception is Tyra. The Shoppers importer always adds an account-holder Patient,
keyed by the account's `pcid` and linked by `seealso`, so Tyra has two.

## What's here

| Path                                                    | What it is                                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `wildflower/`                                           | The Wildflower repository as a git submodule, pinned to the commit whose tools render this data set.        |
| `src/family/as-of.ts`                                   | The as-of date.                                                                                             |
| `src/family/people.ts`                                  | The four people's demographics.                                                                             |
| `src/family/warren.ts`, `tyra.ts`, `beau.ts`, `fern.ts` | Each story: prescriptions, fills, lab draws and lab requisition. `warren.ts` also holds his Rexall account. |
| `src/family/tyra-shoppers-account.ts`                   | The Shoppers family account Tyra holds.                                                                     |
| `src/family/products.ts`                                | The product catalogue: every DIN, with how it was verified.                                                 |
| `src/family/lifelabs-toronto.ts`                        | The laboratory, and how it prints each test (names, ranges, sections).                                      |
| `src/family/tyra-physiology.ts`                         | What Tyra's Pebble measured, day by day.                                                                    |
| `src/family/warren-chest-x-ray.ts`                      | Who and when Warren's X-ray is re-identified as.                                                            |
| `src/generate.ts`                                       | Renders the family. Each HAR goes through the real HAR importer, and the output is grouped per person.      |
| `src/site.ts`                                           | Assembles the data set and writes `site/`.                                                                  |
| `src/family/introductions.ts`                           | Each person's name and summary in `index.json`.                                                             |
| `src/sources.ts`                                        | Reads `sources/`.                                                                                           |
| `sources/dicom/`                                        | The TCIA chest radiograph Warren's X-ray is made from (CC BY 3.0, see `NOTICE`).                            |
| `test/`                                                 | The content checks (see below).                                                                             |
| `scripts/emit.ts`                                       | Writes the data set into `site/` (see "The published data set").                                            |
| `scripts/register-ts.ts`                                | Lets `node` run the TypeScript scripts without a build (see "Setup").                                       |
| `site/`                                                 | The published data set, deployed to GitHub Pages.                                                           |
| `.github/workflows/ci.yml`                              | Checks and tests on every push and PR, with the submodule checked out.                                      |
| `.github/workflows/pages.yml`                           | Deploys `site/` to Pages on every push to `main`.                                                           |

### Products

Every DIN is checked against Health Canada's Drug Product Database (DPD), using
`https://health-products.canada.ca/api/drug/drugproduct/?din=<DIN>&type=json`.
Fern's ferrous sulfate is checked against the Licensed Natural Health Products
Database instead. The full table is in `src/family/products.ts`.

| Product                          | DIN      |
| -------------------------------- | -------- |
| Taro-Warfarin 5 mg               | 02242685 |
| Taro-Warfarin 4 mg               | 02242684 |
| Teva-Metformin 500 mg            | 02257726 |
| Sandoz Metformin FC 500 mg       | 02246820 |
| Apo-Clarithromycin 500 mg        | 02274752 |
| Synthroid 50 mcg                 | 02172070 |
| Synthroid 75 mcg                 | 02172089 |
| Apo-Levothyroxine 75 mcg         | 02550725 |
| Apo-Levothyroxine 88 mcg         | 02550733 |
| Apo-Levothyroxine 112 mcg        | 02550741 |
| Teva-Atorvastatin 20 mg          | 02310902 |
| Teva-Atorvastatin 40 mg          | 02310910 |
| Apo-Bisoprolol 5 mg              | 02256134 |
| pms-Ferrous Sulfate 300 mg (NPN) | 00586323 |

### What `generate` produces

As of 2026-09-28:

| Person | Pharmacy | Labs | Pebble | Imaging | Files                         |
| ------ | -------- | ---- | ------ | ------- | ----------------------------- |
| Warren | 18       | 57   | —      | 3       | Rexall HAR, chest X-ray DICOM |
| Tyra   | 15       | 16   | 2,123  | —       | Shoppers HAR                  |
| Beau   | 17       | 41   | —      | —       | Shoppers HAR                  |
| Fern   | 7        | 57   | —      | —       | Shoppers HAR                  |

Two resources are shared between people. Tyra, Beau and Fern share the Shoppers
HAR's source-file DocumentReference. They also share the Practitioner for Dr
Bhatt, who orders or is copied on all three people's labs.

## Setup

You need Node 26 and [Vite+](https://viteplus.dev) (`vp`), which Wildflower
uses too.

```sh
git clone --recurse-submodules <this repo>
cd synthetic-data
vp -C wildflower install   # Wildflower's own workspace install
vp install                 # links the Wildflower packages this repo uses
```

The workspace consumes the submodule without building anything:

- **Linked packages.** `package.json` lists each Wildflower package it imports
  (`synthetic-data-core`, `har-importer-core`, `fhir-r4`, …) as a `link:` to
  its directory in the submodule. It also links the submodule's own installed
  `effect`, `vite-plus` and TypeScript, so there is one copy of each.
- **Dependencies.** A linked package resolves its own dependencies from the
  submodule's install, which is why that install comes first.
- **TypeScript sources.** Every Wildflower package exports its TypeScript
  source under the `source` condition.
  - `vite.config.ts` resolves the `source` condition for the tests, as
    Wildflower's own configs do.
  - The scripts run under plain `node --conditions=source`, with
    `scripts/register-ts.ts` transforming TypeScript. Node's own type
    stripping can't handle the parameter properties some Wildflower packages
    use.

To move to a newer Wildflower, check out the new commit in the submodule, rerun
both installs, run the checks, and commit the new submodule pointer:

```sh
git -C wildflower fetch && git -C wildflower checkout <commit>
```

## Checks and regeneration

```sh
vp check        # format, lint, typecheck
vp test         # the content checks
vp run emit     # regenerate site/
```

The content checks, in `test/`, are:

- **Stories** (`warren`, `tyra`, `beau`, `fern`): the doses, the order of
  events, and the lab values that drive each change.
- **Lab results** (`lab-results`), read from what `generate` files:
  - each level tracks its dose;
  - Warren's INR peaks during the clarithromycin course;
  - Tyra's TSH is suppressed on 112 mcg;
  - Beau's LDL falls on 40 mg;
  - Fern's hemoglobin and ferritin plateau across the missed fill;
  - flags match the ranges printed beside them.
- **Pebble** (`pebble`):
  - Tyra's median heart rate is higher during the overshoot than after it;
  - her sleep is more fragmented during the overshoot, with the 3 a.m.
    wake-ups;
  - the data covers 28 days.
- **Records** (`records`):
  - each person has exactly one Patient, plus Tyra's account Patient;
  - every lab, Pebble and DICOM subject is the person's pharmacy Patient;
  - the Shoppers split gives each person exactly their own prescriptions and
    fills;
  - the X-ray was taken on the day of the cough visit.
- **Products** (`products`): the catalogue lists exactly what is dispensed, and
  each DIN is unique.

## The published data set

`vp run emit` replaces `site/` with the data set, laid out by
synthetic-data-core's `DataSet.assemble` (Wildflower #793):

- `index.json`: the manifest — each person's key, name, summary, Patient ids
  and files, the as-of date and the Wildflower commit it was generated at.
- `fhir/<Type>/<id>.json`: one importer-output resource per file.
- `har/` and `dicom/`: the files the records were imported from, linked from
  their source-file DocumentReferences' relative `attachment.url`.
- `NOTICE` (also in `dicom/`) and a minimal `index.html`.

Emitting twice gives byte-identical files (`test/site.test.ts`). Commit the
regenerated `site/`; the Pages workflow publishes it.

## Licensing

- **Code and synthetic records.** These follow Wildflower's licensing.
  Wildflower's packages are currently marked `"license": "UNLICENSED"`, with no
  LICENSE file, and this repository matches that (`package.json`) until the
  maintainer picks a licence for both.
- **The chest radiograph.** The file in `sources/dicom/`, and the published
  `dicom/` file made from it, come from TCIA's LIDC-IDRI collection. They are
  licensed under **CC BY 3.0**, and have been modified. See `NOTICE` for the
  attribution, the citations and TCIA's data usage policy.
