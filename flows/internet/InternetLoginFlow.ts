import { expect, Expect, Page} from "@playwright/test";
import { InternetLoginPage } from "../../pages/internet/InternetLoginPage";
import { INTERNET_USERS } from "../../data/internetUsers";
import { containsIgnoreCase } from '../../utils/stringutils';

export class InternetLoginFlow {

    private readonly InternetLoginPage : InternetLoginPage;

    constructor (private readonly page : Page){
        this.InternetLoginPage = new InternetLoginPage(page);
    }

    // login journeys:
    async loginWithValidCredentials() : Promise<void>{
        await this.InternetLoginPage.navigateTo('/login');
        await this.InternetLoginPage.login(INTERNET_USERS.VALID.userName, INTERNET_USERS.VALID.passWord);
    }

    async loginWithInvalidCredentials(username:string, password:string): Promise<void>{
        await this.InternetLoginPage.navigateTo('/login');
        await this.InternetLoginPage.login(username,password);
    }

    async logout():Promise<void>{
        await this.InternetLoginPage.navigateTo('/logout');
    }

    // Assertion helpers
    async assertionLoginSuccess(): Promise<void>{
        await expect(this.InternetLoginPage.flashMessage).toBeVisible();
        const message = this.InternetLoginPage.getFlashMEssage();

    }

    async assertionLoginError(expectedMessage:string): Promise<void>{
        await expect(this.InternetLoginPage.flashMessage).toBeVisible();
        const isError = await(this.InternetLoginPage.isFlashFailure());
        expect(isError).toBe(true);
        const message = this.InternetLoginPage.getFlashMEssage();
        expect(message).toContain(expectedMessage);    
    }

    async assertLogoutSuccess(): Promise<void>{
        await expect(this.InternetLoginPage.flashMessage).toBeVisible();
        const message = await this.InternetLoginPage.getFlashMEssage();
      //  expect(message).toContain('You logged out of the Secure Area');
        expect(containsIgnoreCase(message, 'You logged out of the secure area')).toBe(true);
    }


}