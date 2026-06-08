// pages/internet/InternetLoginPage.ts

import { Page, Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export class InternetLoginPage extends BasePage{
    readonly usernameInput : Locator;
    readonly passwordInput : Locator;
    readonly loginButton : Locator;
    readonly flashMessage: Locator;

    constructor (page:Page){
        super(page);
        //this.usernameInput = page.locator('#username');
       // this.passwordInput = page.locator("#password");
       this.usernameInput = page.getByLabel('Username');
        this.passwordInput = page.getByLabel('Password');
        ////button[@class='radius']
        this.loginButton = page.getByRole('button', {name :'Login'});
       //this.loginButton = page.locator('button[type="submit"]');
     // this.loginButton = page.locator("button[type='submit']");
       //this.loginButton = page.locator('//button[@type="submit"]');
        this.flashMessage = page.locator('#flash');

    }

    async fillUserName(userName:string): Promise<void>{
        await this.usernameInput.fill(userName);
    }

    async fillPassword (password: string): Promise<void>{
        await this.passwordInput.fill(password);
    }
    async clickLoginButton(): Promise<void>{
        await this.loginButton.click();
    }

    async login(userName:string, passWord:string): Promise<void>{
        await this.fillUserName(userName);
        await this.fillPassword(passWord);
        await this.clickLoginButton();
    }

    async getFlashMEssage() : Promise<string>{
        return this.flashMessage.innerText();
    }

    async isFlashSuccess() : Promise<boolean>{
        return this.flashMessage.evaluate(
            e1=>e1.classList.contains('success')
        );
    }

    async isFlashFailure(): Promise<boolean>{
        return this.flashMessage.evaluate(
            e1=>e1.classList.contains('failure')
       );
    }

        
    
} //end of class