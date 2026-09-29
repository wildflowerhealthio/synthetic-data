import type { DrugProduct } from 'synthetic-data-core'

/**
 * The marketed Canadian products the family's stories prescribe, each
 * identified by a DIN verified against Health Canada's Drug Product Database
 * (DPD) — or, for an oral iron that Canada licenses as a natural health
 * product, against the Licensed Natural Health Products Database (LNHPD).
 *
 * @remarks
 * `synthetic-data-core` carries only the `DrugProduct` type; the choice of
 * products, and their verification, is the data set's.
 */

/**
 * The products the stories prescribe, every one verified against the DPD API
 * (`https://health-products.canada.ca/api/drug/drugproduct/?din=<DIN>&type=json`,
 * then `activeingredient`, `form` and `status` by `drug_code`) as **Marketed**,
 * with the ingredient, strength and form below.
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
 * | `02550725` | 103951        | APO-LEVOTHYROXINE         | Apotex Inc               | levothyroxine sodium 75 mcg    | Tablet |
 * | `02550741` | 103953        | APO-LEVOTHYROXINE         | Apotex Inc               | levothyroxine sodium 112 mcg   | Tablet |
 * | `02550733` | 103952        | APO-LEVOTHYROXINE         | Apotex Inc               | levothyroxine sodium 88 mcg    | Tablet |
 * | `02310902` | 79652         | TEVA-ATORVASTATIN         | Teva Canada Limited      | atorvastatin 20 mg             | Tablet |
 * | `02310910` | 79653         | TEVA-ATORVASTATIN         | Teva Canada Limited      | atorvastatin 40 mg             | Tablet |
 * | `02256134` | 74136         | APO-BISOPROLOL            | Apotex Inc               | bisoprolol fumarate 5 mg       | Tablet |
 *
 * Oral ferrous sulfate is a natural health product in Canada: the DPD lists no
 * marketed human ferrous sulfate tablet, so Fern's is verified against the
 * LNHPD instead
 * (`https://health-products.canada.ca/api/natural-licences/productlicence/?lang=en&type=json`,
 * then `medicinalingredient` by `lnhpd_id`) as an **active** licence:
 *
 * | Licence (DIN) | LNHPD id | Product                                            | Company           | Medicinal ingredient              | Form   |
 * | ------------- | -------- | -------------------------------------------------- | ----------------- | --------------------------------- | ------ |
 * | `00586323`    | 4814823  | pms-FERROUS SULFATE (Ferrous Sulfate Tablets BP) 300 mg | Pharmascience Inc | anhydrous ferrous sulfate 187 mg | Tablet |
 *
 * It is a Transitional DIN: the product's old DIN, kept as its licence number,
 * which is the number a pharmacy dispenses it under.
 *
 * @remarks
 * Metformin has no 1000 mg immediate-release tablet on the Canadian market, so
 * a 1000 mg dose is two 500 mg tablets, as a pharmacy would fill it. Likewise
 * bisoprolol has no 2.5 mg tablet (only 5 and 10 mg are marketed), so a 2.5 mg
 * dose is half a 5 mg tablet.
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
  apoLevothyroxine75mcg: {
    din: '02550725',
    drugCode: 103951,
    brandName: 'Apo-Levothyroxine',
    genericName: 'Levothyroxine',
    strength: { value: 75, unit: 'mcg' },
    form: 'tablet',
    company: 'Apotex Inc',
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
  apoBisoprolol5mg: {
    din: '02256134',
    drugCode: 74136,
    brandName: 'Apo-Bisoprolol',
    genericName: 'Bisoprolol',
    strength: { value: 5, unit: 'mg' },
    form: 'tablet',
    company: 'Apotex Inc',
  },
  pmsFerrousSulfate300mg: {
    din: '00586323',
    drugCode: null,
    lnhpdId: 4814823,
    brandName: 'pms-Ferrous Sulfate',
    genericName: 'Ferrous Sulfate',
    strength: { value: 300, unit: 'mg' },
    form: 'tablet',
    company: 'Pharmascience Inc',
  },
} as const satisfies Record<string, DrugProduct.DrugProduct>

export { catalogue }
