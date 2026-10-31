import type {
  ShoppersAccount,
  ShoppersAddress,
  ShoppersPatient,
  ShoppersStore,
} from '@wildflowerhealthio/synthetic-data-shoppers-drugmart'

import { beauStory } from './beau.ts'
import { fernStory } from './fern.ts'
import { tyra } from './people.ts'
import { tyraStory } from './tyra.ts'

/**
 * The Shoppers Drug Mart accounts Tyra, Beau and Fern each hold, one person
 * apiece, at one fictional Kingston store. Every id and number is fictional;
 * the phone numbers use the `555-01xx` range reserved for fiction.
 */

/** The household's address, which each account repeats. */
const household: ShoppersAddress = {
  line1: '48 Sydenham St',
  city: 'Kingston',
  province: 'ON',
  postalCode: tyra.postalCode,
}

/** The store that fills for all three accounts. */
const kingstonStore: ShoppersStore = {
  id: 1238,
  storeName: 'Shoppers Drug Mart #1238',
  phoneNumber: '6135550117',
  address: { line1: '310 Princess St', city: 'Kingston', province: 'ON', postalCode: 'K7L 1B3' },
}

/** An account at the Kingston store that manages `patient` alone, contacted on their phone. */
const onePersonAccountOf = (pcid: string, patient: ShoppersPatient): ShoppersAccount => ({
  pcid,
  phoneNumber: patient.phoneNumber,
  address: household,
  store: kingstonStore,
  patients: [patient],
})

/** Tyra's, Beau's and Fern's accounts, in that order. */
const shoppersAccounts: readonly ShoppersAccount[] = [
  onePersonAccountOf('6f1c2a9e-4b7d-4e38-9a15-d2c8e0b37f64', {
    patientId: 'a3e8d1f0-7c52-4b96-8e0d-5f14c9a72b38',
    phoneNumber: '6135550142',
    story: tyraStory,
  }),
  onePersonAccountOf('6eed5725-171e-4bb4-bcb3-818fb35b00f1', {
    patientId: 'c95b0e27-1d4a-4f83-b6e2-08a7f3d15c49',
    phoneNumber: '6135550143',
    story: beauStory,
  }),
  onePersonAccountOf('015abd19-e1ae-4c55-8245-45f6f749ad38', {
    patientId: '1d7f4a86-e0b3-4c25-9f71-b3c2d8e6a015',
    phoneNumber: '6135550142',
    story: fernStory,
  }),
]

export { shoppersAccounts }
