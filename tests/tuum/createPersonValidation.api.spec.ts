import { test } from '../../fixtures';
import { setTestInfo, step, Tags, Features } from '../../utils/allureUtils';
import { getCreatePersonValidationScenarios } from '../../data/createPersonValidationData';

test.describe('Tuum API — Create Person Field Validation', () => {
  const scenarios = getCreatePersonValidationScenarios();

  for (const scenario of scenarios) {
    test(`${scenario.id}: ${scenario.description}`, async ({ tuumApiFlows }) => {
      await setTestInfo({
        description:
          'Create a person with an incomplete request body and verify the expected validation error is returned',
        severity: 'normal',
        feature: Features.TUUM_CREATE_PERSON_ACCOUNT,
        story: 'Create person — field validation',
        tags: [Tags.TUUM_CREATE_PERSON_ACCOUNT, Tags.NEGATIVE, Tags.API, scenario.id],
      });

      const { requestBody, expected } = scenario;
      const flow = tuumApiFlows.createPersonAccount;

      await step('Authorise as employee', async () => {
        await flow.authenticate();
      });

      await step('Attempt to create person with incomplete body', async () => {
        const response = await flow.createPersonExpectingValidationError(requestBody);
        flow.assertValidationError(response, expected);
      });
    });
  }
});
