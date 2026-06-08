// flows/internet/InternetCheckboxFlows.ts

import { Page, expect } from "@playwright/test";
import { InternetCheckboxPage } from "../../pages/internet/InternetCheckboxPage";

// define the class and the object of the related page class
export class InternetCheckboxFlows{

private readonly internetCheckBoxPage : InternetCheckboxPage;

// define a constructor
constructor (page: Page){
    this.internetCheckBoxPage = new InternetCheckboxPage(page);
}
// define business flow related methods using the internetcheckboxpage
 // navigation method:
 async navigateToCheckBox(): Promise <void>{
    await this.internetCheckBoxPage.goToCheckBoxes();
 }

 // business scenario
 // 1 : verify initial state
 async verifyInitialState(): Promise<void>{
    await this.internetCheckBoxPage.goToCheckBoxes();
    await expect(this.internetCheckBoxPage.checkbox1).not.toBeChecked();
    await expect(this.internetCheckBoxPage.checkbox2).toBeChecked();
 }
// check first checkbox
async checkFirstCheckBox(): Promise<void>{
    await this.internetCheckBoxPage.checkCheckBoxe1();
    await expect( this.internetCheckBoxPage.checkbox1).toBeChecked();
}

// uncheck second check box
async uncheckSecondCheckBox(): Promise<void>{
    await this.internetCheckBoxPage.uncheckCheckBox2();
    await expect( this.internetCheckBoxPage.checkbox2).not.toBeChecked();
    }

// check both check boxes:

async checkBothCheckBoxes(): Promise<void>{
    await this.internetCheckBoxPage.checkBothCheckBoxes();
    await expect( this.internetCheckBoxPage.checkbox1).toBeChecked();
    await expect( this.internetCheckBoxPage.checkbox2).toBeChecked();
}

// uncheck both boxes
async uncheckBothCheckBoxes(): Promise<void>{
    await this.internetCheckBoxPage.uncheckBothCheckBoxes();
    await expect( this.internetCheckBoxPage.checkbox1).not.toBeChecked();
    await expect( this.internetCheckBoxPage.checkbox2).not.toBeChecked();
}
// visibility assertions
async assertCheckBoxesVisible(): Promise<void>{
    await expect( this.internetCheckBoxPage.checkbox1).toBeVisible();
    await expect( this.internetCheckBoxPage.checkbox2).toBeVisible();
}
}


