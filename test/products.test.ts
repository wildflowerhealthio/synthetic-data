import { Prescription } from 'synthetic-data-core'
import { describe, expect, test } from 'vite-plus/test'

import { beauStory, catalogue, fernStory, tyraStory, warrenStory } from '../src/family/index.ts'

/**
 * The product catalogue: every product a story dispenses is one of its
 * verified entries, and each is keyed as the database that verified it keys
 * it.
 */

const products = Object.values(catalogue)
const dispensed = [warrenStory, tyraStory, beauStory, fernStory].flatMap((story) =>
  story.prescriptions.flatMap((prescription) =>
    prescription.fillDays.map((day) => Prescription.productOnFillOf(prescription, day))
  )
)

describe('the product catalogue', () => {
  test('lists every product the stories dispense, and nothing they do not', () => {
    expect(new Set(dispensed)).toEqual(new Set(products))
  })

  test('keys every product by an eight-digit DIN, each once', () => {
    for (const product of products) expect(product.din).toMatch(/^\d{8}$/)
    expect(new Set(products.map((product) => product.din)).size).toBe(products.length)
  })

  test('verifies each against the DPD, or the one natural health product against the LNHPD', () => {
    const naturalHealthProducts = products.filter((product) => product.drugCode === null)
    expect(naturalHealthProducts.map((product) => product.genericName)).toEqual(['Ferrous Sulfate'])
    expect(naturalHealthProducts[0]?.lnhpdId).toBeGreaterThan(0)
  })
})
