"use strict";
// test/internet/internetcheckboxes.spec.ts
Object.defineProperty(exports, "__esModule", { value: true });
const fixtures_1 = require("../../fixtures");
const allureUtils_1 = require("../../utils/allureUtils");
// test describe --> test.beforeEach --> test step
fixtures_1.test.describe('The internet checkboxes', () => {
    // test . beforeeach
    fixtures_1.test.beforeEach(async ({ internetFlows }) => {
        await internetFlows.checkbox.navigateToCheckBox();
    }); // end of before each 1
    // start the test
    (0, fixtures_1.test)('1: verify initial state of checkboxes', async ({ internetFlows }) => {
        await (0, allureUtils_1.setTestInfo)({
            description: 'Verifies checkbox 1 is unchecked and checkbox 2 is checked by default',
            severity: 'normal',
            feature: allureUtils_1.Features.AUTHENTICATION,
            story: 'Checkbox initial state',
            tags: [allureUtils_1.Tags.SMOKE],
        }); // end set test info
        await (0, allureUtils_1.step)(' 1 verify initial checkbox status', async () => {
            await internetFlows.checkbox.verifyInitialState();
        }); //end of step 1
    }); // end of test 1
    (0, fixtures_1.test)('2. can check checkbox 1', async ({ internetFlows }) => {
        await (0, allureUtils_1.setTestInfo)({
            description: 'Verifies checkbox 1 can be checked',
            severity: 'normal',
            feature: allureUtils_1.Features.AUTHENTICATION,
            story: 'Check checkbox',
            tags: [allureUtils_1.Tags.REGRESSION],
        });
        await (0, allureUtils_1.step)('check the checkbox1', async () => {
            await internetFlows.checkbox.checkFirstCheckBox();
        }); // end of step check the checkbox1
    }); // end of test 2
    // start test 3
    (0, fixtures_1.test)('3. Can uncheck checkbox 2 ', async ({ internetFlows }) => {
        await (0, allureUtils_1.setTestInfo)({
            description: 'Verifies checkbox 2 can be unchecked',
            severity: 'normal',
            feature: allureUtils_1.Features.AUTHENTICATION,
            story: 'Uncheck checkbox',
            tags: [allureUtils_1.Tags.REGRESSION],
        });
        await (0, allureUtils_1.step)(' un check checkbox 2', async () => {
            await internetFlows.checkbox.uncheckSecondCheckBox();
        }); // end of test step
    }); // end of test 3
    (0, fixtures_1.test)('4. Can check both checkboxes', async ({ internetFlows }) => {
        await (0, allureUtils_1.setTestInfo)({
            description: 'Verifies checkbox 2 can be unchecked',
            severity: 'normal',
            feature: allureUtils_1.Features.AUTHENTICATION,
            story: 'Uncheck checkbox',
            tags: [allureUtils_1.Tags.REGRESSION],
        });
        await (0, allureUtils_1.step)(' can check both the checkboxes', async () => {
            await internetFlows.checkbox.checkBothCheckBoxes();
        }); // end of test step in test 4
    }); // end of test 4
}); // end of test describe
