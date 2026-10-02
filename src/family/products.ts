import type { DrugProduct } from 'synthetic-data-fundamentals/story'

/**
 * The Canadian products the family's stories prescribe, each identified by a
 * DIN verified against Health Canada's Drug Product Database (DPD).
 *
 * @remarks
 * `synthetic-data-fundamentals` carries only the `DrugProduct` type; the choice of
 * products, and their verification, is the data set's.
 */

/**
 * The products the stories prescribe, every one verified against the DPD API
 * (`https://health-products.canada.ca/api/drug/drugproduct/?din=<DIN>&type=json`,
 * then `activeingredient`, `form` and `status` by `drug_code`) with the
 * ingredient, strength and form below — all **Marketed** but Fern's ferrous
 * sulfate (see below).
 *
 * | DIN        | DPD drug code | Brand                     | Company                  | Active ingredient              | Form   |
 * | ---------- | ------------- | ------------------------- | ------------------------ | ------------------------------ | ------ |
 * | `02242685` | 66475         | TARO-WARFARIN             | Taro Pharmaceuticals Inc | warfarin sodium 5 mg           | Tablet |
 * | `02242684` | 66474         | TARO-WARFARIN             | Taro Pharmaceuticals Inc | warfarin sodium 4 mg           | Tablet |
 * | `02257726` | 74296         | TEVA-METFORMIN            | Teva Canada Limited      | metformin hydrochloride 500 mg | Tablet |
 * | `02246820` | 71020         | SANDOZ METFORMIN FC       | Sandoz Canada Inc        | metformin hydrochloride 500 mg | Tablet |
 * | `02274752` | 76022         | APO-CLARITHROMYCIN        | Apotex Inc               | clarithromycin 500 mg          | Tablet |
 * | `02172070` | 19587         | SYNTHROID                 | BGP Pharma ULC           | levothyroxine sodium 50 mcg    | Tablet |
 * | `02172089` | 19595         | SYNTHROID                 | BGP Pharma ULC           | levothyroxine sodium 75 mcg    | Tablet |
 * | `02550741` | 103953        | APO-LEVOTHYROXINE         | Apotex Inc               | levothyroxine sodium 112 mcg   | Tablet |
 * | `02550733` | 103952        | APO-LEVOTHYROXINE         | Apotex Inc               | levothyroxine sodium 88 mcg    | Tablet |
 * | `02310902` | 79652         | TEVA-ATORVASTATIN         | Teva Canada Limited      | atorvastatin 20 mg             | Tablet |
 * | `02310910` | 79653         | TEVA-ATORVASTATIN         | Teva Canada Limited      | atorvastatin 40 mg             | Tablet |
 * | `02544253` | 103279        | SANDOZ BISOPROLOL TABLETS | Sandoz Canada Inc        | bisoprolol fumarate 2.5 mg     | Tablet |
 * | `02256134` | 74136         | APO-BISOPROLOL            | Apotex Inc               | bisoprolol fumarate 5 mg       | Tablet |
 * | `01987135` | 13993         | FERROUS SULFATE TABLETS 300MG | Pharmadex Laboratories Inc | ferrous sulfate 300 mg | Tablet |
 *
 * Oral ferrous sulfate is a natural health product in Canada today, licensed
 * in the Licensed Natural Health Products Database rather than the DPD, so no
 * ferrous sulfate tablet in the DPD is marketed. Fern's is the DPD's most
 * recently marketed plain 300 mg tablet: its DIN, drug code, ingredient and
 * form verify, but its status is **Cancelled Post Market** (since 1999).
 *
 * @remarks
 * Metformin has no 1000 mg immediate-release tablet on the Canadian market, so
 * a 1000 mg dose is two 500 mg tablets, as a pharmacy would fill it.
 */
const catalogue = {
  taroWarfarin5mg: {
    din: '02242685',
    drugCode: 66475,
    brandName: 'Taro-Warfarin',
    genericName: 'Warfarin',
    strength: { value: 5, unit: 'mg' },
    form: 'tablet',
    company: 'Taro Pharmaceuticals Inc',
  },
  taroWarfarin4mg: {
    din: '02242684',
    drugCode: 66474,
    brandName: 'Taro-Warfarin',
    genericName: 'Warfarin',
    strength: { value: 4, unit: 'mg' },
    form: 'tablet',
    company: 'Taro Pharmaceuticals Inc',
  },
  tevaMetformin500mg: {
    din: '02257726',
    drugCode: 74296,
    brandName: 'Teva-Metformin',
    genericName: 'Metformin',
    strength: { value: 500, unit: 'mg' },
    form: 'tablet',
    company: 'Teva Canada Limited',
  },
  sandozMetformin500mg: {
    din: '02246820',
    drugCode: 71020,
    brandName: 'Sandoz Metformin FC',
    genericName: 'Metformin',
    strength: { value: 500, unit: 'mg' },
    form: 'tablet',
    company: 'Sandoz Canada Inc',
  },
  apoClarithromycin500mg: {
    din: '02274752',
    drugCode: 76022,
    brandName: 'Apo-Clarithromycin',
    genericName: 'Clarithromycin',
    strength: { value: 500, unit: 'mg' },
    form: 'tablet',
    company: 'Apotex Inc',
  },
  synthroid50mcg: {
    din: '02172070',
    drugCode: 19587,
    brandName: 'Synthroid',
    genericName: 'Levothyroxine',
    strength: { value: 50, unit: 'mcg' },
    form: 'tablet',
    company: 'BGP Pharma ULC',
  },
  synthroid75mcg: {
    din: '02172089',
    drugCode: 19595,
    brandName: 'Synthroid',
    genericName: 'Levothyroxine',
    strength: { value: 75, unit: 'mcg' },
    form: 'tablet',
    company: 'BGP Pharma ULC',
  },
  apoLevothyroxine112mcg: {
    din: '02550741',
    drugCode: 103953,
    brandName: 'Apo-Levothyroxine',
    genericName: 'Levothyroxine',
    strength: { value: 112, unit: 'mcg' },
    form: 'tablet',
    company: 'Apotex Inc',
  },
  apoLevothyroxine88mcg: {
    din: '02550733',
    drugCode: 103952,
    brandName: 'Apo-Levothyroxine',
    genericName: 'Levothyroxine',
    strength: { value: 88, unit: 'mcg' },
    form: 'tablet',
    company: 'Apotex Inc',
  },
  tevaAtorvastatin20mg: {
    din: '02310902',
    drugCode: 79652,
    brandName: 'Teva-Atorvastatin',
    genericName: 'Atorvastatin',
    strength: { value: 20, unit: 'mg' },
    form: 'tablet',
    company: 'Teva Canada Limited',
  },
  tevaAtorvastatin40mg: {
    din: '02310910',
    drugCode: 79653,
    brandName: 'Teva-Atorvastatin',
    genericName: 'Atorvastatin',
    strength: { value: 40, unit: 'mg' },
    form: 'tablet',
    company: 'Teva Canada Limited',
  },
  sandozBisoprolol2point5mg: {
    din: '02544253',
    drugCode: 103279,
    brandName: 'Sandoz Bisoprolol',
    genericName: 'Bisoprolol',
    strength: { value: 2.5, unit: 'mg' },
    form: 'tablet',
    company: 'Sandoz Canada Inc',
  },
  apoBisoprolol5mg: {
    din: '02256134',
    drugCode: 74136,
    brandName: 'Apo-Bisoprolol',
    genericName: 'Bisoprolol',
    strength: { value: 5, unit: 'mg' },
    form: 'tablet',
    company: 'Apotex Inc',
  },
  pharmadexFerrousSulfate300mg: {
    din: '01987135',
    drugCode: 13993,
    brandName: 'Ferrous Sulfate',
    genericName: 'Ferrous Sulfate',
    strength: { value: 300, unit: 'mg' },
    form: 'tablet',
    company: 'Pharmadex Laboratories Inc',
  },
} as const satisfies Record<string, DrugProduct.DrugProduct>

export { catalogue }
