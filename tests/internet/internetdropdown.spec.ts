// tests/internet/internetdropdown.spec.ts

import { test, expect }                      from '../../fixtures';
import { InternetCheckboxFlows } from '../../flows/internet/InternetCheckboxFlows';
import { setTestInfo, step, Tags, Features } from '../../utils/allureUtils';

test.describe('Tests for checking the dropdown capability', ()=>{

    test.beforeEach('navigate to dropdown page', async({internetFlows})=>{
        await internetFlows.dropDownBox.gotoDropDown();
    }); // end of before each block

    test('Verify initial state, no option selected and verify', async({internetFlows})=>{
        // step 1 for storing allure data
         await setTestInfo({
      description: 'Verifies dropdown has no option selected by default',
      severity:    'normal',
      feature:     Features.DROPWDOWN,
      story:       'Dropdown default state',
      tags:        [Tags.SMOKE],
        });

        // step 2 : verify default state
         await internetFlows.dropDownBox.verifyDefaultState();
        // end of test step 2

    }); // end of test 1

    test('CAn select option 1 by Value', async({internetFlows})=>{
           await setTestInfo({
      description: 'Verifies dropdown has no option selected by default',
      severity:    'normal',
      feature:     Features.DROPWDOWN,
      story:       'Dropdown default state',
      tags:        [Tags.SMOKE],
        });

        // test step
        
            await internetFlows.dropDownBox.selectOption1ByValueAndVerify();
       }); // end of test 2

    test('Select option 2 by Value ', async({internetFlows})=>{
        
        await internetFlows.dropDownBox.selectOption2ByValueAndVerify();
    }); // end of test 3

    test('can switch from option 1 to option 2', async({internetFlows})=>{
        await internetFlows.dropDownBox.switchFromOption1ToOption2AndVerify();
    }); // end of test 4

}); // end of test describe block