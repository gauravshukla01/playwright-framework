import { test } from '../../fixtures';

test.describe('Network Interception', () => {

  test('should fulfill request with mocked response', async ({ internetFlows }) => {
    await internetFlows.networkInterception.fulfillWithMockedResponse();
  });

  test('should abort CSS requests and page still functions', async ({ internetFlows }) => {
    await internetFlows.networkInterception.abortRequest();
  });

  test('should continue request and confirm interception occurred', async ({ internetFlows }) => {
    await internetFlows.networkInterception.continueRequest();
  });

});