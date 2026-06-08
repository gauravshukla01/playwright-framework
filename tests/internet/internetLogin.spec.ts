// tests/internet/internetLogin.spec.ts
import { test, expect } from '../../fixtures' ;
import { setTestInfo, step, Tags, Features } from '../../utils/allureUtils';
import { INTERNET_USERS } from '../../data/internetUsers';
import { InternetLoginPage } from '../../pages/internet/InternetLoginPage';

test.describe ('The internet : Login happy path',()=>{

    test ('Valid credentials login success', async ({internetFlows})=>   {
        await setTestInfo({
        description: 'Verifies admin user can login with valid credentials',
        severity:    'critical',
        feature:     Features.AUTHENTICATION,
        story:       'Valid login',
        tags:        [Tags.SMOKE, Tags.LOGIN],

        }); // end set test info

        await step('Navigate and login with valid credentials',async()=>{
            await internetFlows.login.loginWithValidCredentials();
        }); // end of step 1

        await step('Assert login with success message', async()=>{
            await internetFlows.login.assertionLoginSuccess();
        }); // end of step 2


    }); // end of test method 1

    test (' user can logout successfully', async({ internetFlows}) =>{
        await setTestInfo({
            description: 'Verifies logged in user can logout successfully',
            severity:    'normal',
            feature:     Features.AUTHENTICATION,
            story:       'Logout',
            tags:        [Tags.SMOKE, Tags.LOGIN],
        }); // end of setTestInfo

        await step('login with valid credentials ', async ()=> {
            await internetFlows.login.loginWithValidCredentials();
        }); // end of step 1

        await step('logout and assert logout message', async ()=> {
            await internetFlows.login.logout();
            await internetFlows.login.assertLogoutSuccess();
        });

    }); // end of test method 2
}) ;// end of test describe