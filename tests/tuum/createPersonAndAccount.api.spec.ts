import { test } from '../../fixtures';
import { setTestInfo, step, Tags, Features } from '../../utils/allureUtils';
import { buildCreatePersonRequest } from '../../data/tuumPersonAccountData';

test.describe('Tuum API — Create Person & Account', () => {
  test('authorise, create a person, create an account for them, and find the person via search', async ({
    tuumApiFlows,
  }) => {
    await setTestInfo({
      description:
        'Create a legal person, open an account owned by that person, and verify the person is findable via search',
      severity: 'critical',
      feature: Features.TUUM_CREATE_PERSON_ACCOUNT,
      story: 'Create person and account',
      tags: [Tags.SMOKE, Tags.TUUM_CREATE_PERSON_ACCOUNT, Tags.API],
    });

    const flow = tuumApiFlows.createPersonAccount;
    const personRequest = buildCreatePersonRequest();

    // eslint-disable-next-line no-console
    console.log(
      'idNumber for manual UI verification:',
      personRequest.identificationNumbers?.[0]?.idNumber,
    );

    await step('Authorise as employee', async () => {
      await flow.authenticate();
    });

    let personId = '';

    await step('Create person', async () => {
      const response = await flow.createPerson(personRequest);
      personId = flow.assertPersonCreated(response);
    });

    await step('Create account for the person', async () => {
      const response = await flow.createAccount(personId, personRequest.name ?? '');
      flow.assertAccountCreated(response, { personId });
    });

    await step('Search for the person by ID number', async () => {
      const idNumber = personRequest.identificationNumbers?.[0]?.idNumber ?? '';
      const response = await flow.searchPersonByIdNumber(idNumber);
      flow.assertPersonFoundInSearch(response, personId);
    });
  });
});
