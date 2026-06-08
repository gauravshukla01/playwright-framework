// test/internet/internetcheckboxes.spec.ts

import { test, expect }                      from '../../fixtures';
import { setTestInfo, step, Tags, Features } from '../../utils/allureUtils';

// test describe --> test.beforeEach --> test step
test.describe('The internet checkboxes', ()=>{

    // test . beforeeach
    test.beforeEach(async({internetFlows}) =>{
        await internetFlows.checkbox.navigateToCheckBox();
    }); // end of before each 1

    // start the test
    test('1: verify initial state of checkboxes',async ({internetFlows})=>{
        await setTestInfo({
      description: 'Verifies checkbox 1 is unchecked and checkbox 2 is checked by default',
      severity:    'normal',
      feature:     Features.AUTHENTICATION,
      story:       'Checkbox initial state',
      tags:        [Tags.SMOKE],
        }); // end set test info

        await step(' 1 verify initial checkbox status', async()=>{
            await internetFlows.checkbox.verifyInitialState();
        }); //end of step 1
 
    }); // end of test 1

    test('2. can check checkbox 1',async({ internetFlows})=>{
        await setTestInfo({
      description: 'Verifies checkbox 1 can be checked',
      severity:    'normal',
      feature:     Features.AUTHENTICATION,
      story:       'Check checkbox',
      tags:        [Tags.REGRESSION],
    });
        await step('check the checkbox1', async()=>{
            await internetFlows.checkbox.checkFirstCheckBox();
        }); // end of step check the checkbox1
    }); // end of test 2

    // start test 3
    test('3. Can uncheck checkbox 2 ', async({ internetFlows }) =>{
        await setTestInfo({
      description: 'Verifies checkbox 2 can be unchecked',
      severity:    'normal',
      feature:     Features.AUTHENTICATION,
      story:       'Uncheck checkbox',
      tags:        [Tags.REGRESSION],
    });
        await step(' un check checkbox 2', async()=>{
            await internetFlows.checkbox.uncheckSecondCheckBox();
        }); // end of test step
    }); // end of test 3

    test('4. Can check both checkboxes', async ({internetFlows}) =>{
        await setTestInfo({
      description: 'Verifies checkbox 2 can be unchecked',
      severity:    'normal',
      feature:     Features.AUTHENTICATION,
      story:       'Uncheck checkbox',
      tags:        [Tags.REGRESSION],
    });
        await step(' can check both the checkboxes', async()=>{

            await internetFlows.checkbox.checkBothCheckBoxes();
        }) ; // end of test step in test 4

    }); // end of test 4

}); // end of test describe