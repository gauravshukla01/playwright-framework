import { test, expect } from '../../fixtures' ;
import { setTestInfo, step, Tags, Features } from '../../utils/allureUtils';

test.describe('Test for opening the new window', ()=>{

    test.beforeEach('navigate to new window page', async({internetFlows})=>{
        await internetFlows.newWindowPage.navigtateToNewWindowPage();
    });

    test('open and verify the new page', async({internetFlows})=>{
        await internetFlows.newWindowPage.openNewTabAndVerify();
    });


}); // end of describe block