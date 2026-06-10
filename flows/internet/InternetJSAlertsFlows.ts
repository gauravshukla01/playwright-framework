import { Page, expect } from "@playwright/test";
import { InternetJSAlertsPage } from "../../pages/internet/InternetJSAlertsPage";

export class InternetJSAlertsFlows{
private readonly internetJSAlertsPage : InternetJSAlertsPage;

constructor (private readonly page:Page){
    this.internetJSAlertsPage = new InternetJSAlertsPage(page);
}
// navigation
async navigateToJSAlerts(): Promise<void>{
    await this.internetJSAlertsPage.goToJSAlerts();
}

// js alert scenarios
async acceptJSAlertAndVerify():Promise<void>{
    this.page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toBe('I am a JS Alert');
      await dialog.accept();
    });
    await this.internetJSAlertsPage.clickJsAlert();
    const result = await this.internetJSAlertsPage.getResultText();
    expect(result).toContain('You successfully clicked an alert');
}
// js confirm scenario
async acceptJSConfirmAndVerify(): Promise<void>{
    this.page.once('dialog', async (dialog)=>{
        expect(dialog.type()).toBe('confirm');
        expect(dialog.message()).toBe('I am a JS Confirm');
        await dialog.accept();
    });
    await this.internetJSAlertsPage.clickJSConfirmAlert();
    const result = await this.internetJSAlertsPage.getResultText();
    expect(result).toBe('You clicked: Ok');

}
async dismissJSConfirmAndVerify():Promise<void>{
    this.page.once('dialog', async(dialog)=>{
        expect(dialog.type()).toBe('confirm');
        await dialog.dismiss();
    });
        await this.internetJSAlertsPage.clickJSConfirmAlert();
    const result = await this.internetJSAlertsPage.getResultText();
    expect(result).toContain('You clicked: Cancel');
}

// jsprompt scenario
async acceptJSPromptWithTextAndVerify(inputString: string):Promise<void>{
    this.page.once('dialog', async(dialog)=>{
        expect(dialog.type()).toBe('prompt');
        await dialog.accept(inputString);
    });
    await this.internetJSAlertsPage.clickJSPromptAlert();
    const result = await this.internetJSAlertsPage.getResultText();
    expect(result).toContain(`You entered: ${inputString}`);
}

async dismissJSPromptAndVerify():Promise<void>{
    // set the listener
    this.page.once('dialog', async(dialog)=>{
        expect(dialog.type()).toBe('prompt');
        await dialog.dismiss();
    });
    await this.internetJSAlertsPage.clickJSPromptAlert();
    const result = await this.internetJSAlertsPage.getResultText();
    expect(result).toBe('You entered: null');
}

}// end of class