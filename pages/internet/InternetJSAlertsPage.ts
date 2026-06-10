import { Page, Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

// define the class
export class InternetJSAlertsPage extends BasePage{
// define the locators
readonly jsAlert : Locator;
readonly jsConfirmAlert : Locator;
readonly jsPromptAlert : Locator;
readonly resultText : Locator;
// define the constructor
constructor (page:Page){
super(page);
this.jsAlert = page.getByRole('button', {name: 'Click for JS Alert'});
this.jsConfirmAlert = page.getByRole('button', {name:'Click for JS Confirm'});
this.jsPromptAlert = page.getByRole('button', {name: 'Click for JS Prompt'});
this.resultText = page.locator('#result'); // css selector for the result 

}

// define the atomic methods
// navigation
async goToJSAlerts():Promise<void>{
    await this.navigateTo('/javascript_alerts');
}

// click the jsAlert button
async clickJsAlert(): Promise<void>{
    await this.jsAlert.click();
}

// click jsConfirmAlert
async clickJSConfirmAlert(): Promise<void>{
    await this.jsConfirmAlert.click();
}
// click jsPromptAlert
async clickJSPromptAlert(): Promise<void>{
    await this.jsPromptAlert.click();
}

// getters
async getResultText(): Promise<string>{
return await this.resultText.innerText();
}
}


