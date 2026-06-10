import {test, expect} from '../../fixtures';
import { setTestInfo, step, Tags, Features } from '../../utils/allureUtils';
// test.describe
    // before each
    // test
        // step
test.describe('these tests are for the JS alerts handling on a webpage', ()=>{
    test.beforeEach( async({internetFlows})=>{
        await internetFlows.JSAlert.navigateToJSAlerts();
    }); // end of before each

    test(' Test 1: can accept JS alert and verify result ', async({internetFlows })=>{
        await step('can accept JS alert and verify result', async()=>{
            await internetFlows.JSAlert.acceptJSAlertAndVerify();
        }); // end of step
    });// end of test

    test('can accept JS confirm and verify result', async({internetFlows})=>{
        await step('Accept JS confirm and verify result', async()=>{
            await internetFlows.JSAlert.acceptJSConfirmAndVerify();
     }); // end of step
    }); // end of test

    test('can dismiss JS confirm and verify result', async({internetFlows})=>{
        await step('dismiss and verify', async()=>{
            await internetFlows.JSAlert.dismissJSConfirmAndVerify();
        }); // end of step
    }); // edn of test

    test('can accept JS prompt with text and verify result', async({internetFlows})=>{
        await step('can accept the prompt with text and verify', async()=>{
            await internetFlows.JSAlert.acceptJSPromptWithTextAndVerify('this is the prompt');
        }); // end of step
    }); // end of test

    test('can dismiss JS prompt and verify result', async({internetFlows})=>{
        await step('dismiss and verify the prompt', async()=>{
            await internetFlows.JSAlert.dismissJSPromptAndVerify();
        }); // end of step
    }); // end of test
}); //end of describe block