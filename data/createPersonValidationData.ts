// data/createPersonValidationData.ts
// Scenario-driven dataset for the "create person — field validation" API
// test — sourced from testData/tuum/createPersonValidation.scenarios.json.

import { loadScenarios } from '../utils/testDataLoader';

export interface CreatePersonValidationExpected {
  status: number;
  field?: string;
  code: string;
  message: string;
}

export interface CreatePersonValidationScenario {
  id: string;
  description: string;
  requestBody: Record<string, unknown>;
  expected: CreatePersonValidationExpected;
}

export function getCreatePersonValidationScenarios(): CreatePersonValidationScenario[] {
  return loadScenarios<CreatePersonValidationScenario>(
    'testData/tuum/createPersonValidation.scenarios.json',
  );
}
