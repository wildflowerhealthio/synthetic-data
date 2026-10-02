import type { ShoppersAccount } from 'synthetic-data-shoppers-drugmart'

import { beauStory } from './beau.ts'
import { fernStory } from './fern.ts'
import { tyra } from './people.ts'
import { tyraStory } from './tyra.ts'

/**
 * Tyra's Shoppers Drug Mart account, under which she manages her own
 * prescriptions, Beau's and Fern's, at one fictional Kingston store. Every id
 * and number is fictional; the phone numbers use the `555-01xx` range reserved
 * for fiction.
 */
const tyraShoppersAccount: ShoppersAccount = {
  pcid: '6f1c2a9e-4b7d-4e38-9a15-d2c8e0b37f64',
  phoneNumber: '6135550142',
  address: {
    line1: '48 Sydenham St',
    city: 'Kingston',
    province: 'ON',
    postalCode: tyra.postalCode,
  },
  store: {
    id: 1238,
    storeName: 'Shoppers Drug Mart #1238',
    phoneNumber: '6135550117',
    address: { line1: '310 Princess St', city: 'Kingston', province: 'ON', postalCode: 'K7L 1B3' },
  },
  patients: [
    {
      patientId: 'a3e8d1f0-7c52-4b96-8e0d-5f14c9a72b38',
      phoneNumber: '6135550142',
      story: tyraStory,
    },
    {
      patientId: 'c95b0e27-1d4a-4f83-b6e2-08a7f3d15c49',
      phoneNumber: '6135550143',
      story: beauStory,
    },
    {
      patientId: '1d7f4a86-e0b3-4c25-9f71-b3c2d8e6a015',
      phoneNumber: '6135550142',
      story: fernStory,
    },
  ],
}

export { tyraShoppersAccount }
