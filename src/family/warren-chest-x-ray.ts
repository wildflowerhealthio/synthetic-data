import type { DicomImage } from 'synthetic-data-dicom'

import { warren } from './people.ts'
import { warrenStory } from './warren.ts'

/**
 * Warren's chest X-ray: a real, de-identified PA chest radiograph from TCIA's
 * LIDC-IDRI collection (subject LIDC-IDRI-0002; CC BY 3.0 — see `NOTICE`),
 * downsampled 4x, re-identified as Warren on the day of his cough visit — the
 * day the walk-in clinic writes his clarithromycin — and read through the
 * DICOM importer onto his Rexall Patient.
 */

const clarithromycin = warrenStory.prescriptions.find(
  (prescription) => prescription.key === 'clarithromycin-1'
)
if (clarithromycin === undefined) throw new Error('Warren has no clarithromycin course')

/** The source file, relative to the repository root. */
const CHEST_X_RAY_SOURCE = 'sources/dicom/lidc-idri-0002-chest-pa-ds4.dcm'

/** The name the re-identified file is picked (and published) under. */
const CHEST_X_RAY_FILE_NAME = 'warren-ashford-chest-x-ray.dcm'

/** Who and when the image is re-identified as; the ids are the imaging clinic's, fictional. */
const warrenChestXRay: DicomImage.Reidentification = {
  person: warren,
  patientId: 'KXR-0481327',
  studyDay: clarithromycin.written.day,
  accessionNumber: 'XR26-0104417',
  imageKey: 'chest-x-ray',
}

export { CHEST_X_RAY_FILE_NAME, CHEST_X_RAY_SOURCE, warrenChestXRay }
