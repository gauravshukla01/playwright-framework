"use strict";
// pages/internet/InternetLoginPage.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternetLoginPage = void 0;
const BasePage_1 = require("../BasePage");
class InternetLoginPage extends BasePage_1.BasePage {
    constructor(page) {
        super(page);
        //this.usernameInput = page.locator('#username');
        // this.passwordInput = page.locator("#password");
        this.usernameInput = page.getByLabel('Username');
        this.passwordInput = page.getByLabel('Password');
        ////button[@class='radius']
        this.loginButton = page.getByRole('button', { name: 'Login' });
        //this.loginButton = page.locator('button[type="submit"]');
        // this.loginButton = page.locator("button[type='submit']");
        //this.loginButton = page.locator('//button[@type="submit"]');
        this.flashMessage = page.locator('#flash');
    }
    async fillUserName(userName) {
        await this.usernameInput.fill(userName);
    }
    async fillPassword(password) {
        await this.passwordInput.fill(password);
    }
    async clickLoginButton() {
        await this.loginButton.click();
    }
    async login(userName, passWord) {
        await this.fillUserName(userName);
        await this.fillPassword(passWord);
        await this.clickLoginButton();
    }
    async getFlashMEssage() {
        return this.flashMessage.innerText();
    }
    async isFlashSuccess() {
        return this.flashMessage.evaluate(e1 => e1.classList.contains('success'));
    }
    async isFlashFailure() {
        return this.flashMessage.evaluate(e1 => e1.classList.contains('failure'));
    }
} //end of class
exports.InternetLoginPage = InternetLoginPage;
