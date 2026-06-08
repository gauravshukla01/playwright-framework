//pages/internet/InternetCheckboxPage.ts
import { Page, Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export class InternetCheckboxPage extends BasePage{
 // define the locators
 readonly checkbox1 : Locator;
 readonly checkbox2 : Locator;


 // define the constructor
constructor (page: Page){
    super(page);
    
    this.checkbox1 = page.locator('//form[@id="checkboxes"]//input[contains(following-sibling::text(), "checkbox 1")]');
    this.checkbox2 = page.locator('//form[@id="checkboxes"]//input[contains(following-sibling::text(), "checkbox 2")]');

}

 // define the atomic methods

 // navigation methods
async goToCheckBoxes() : Promise<void>{
    await this.navigateTo('/checkboxes');
}

 // action methods
async checkCheckBoxe1(): Promise<void>{
    await this.checkbox1.check();
}

async uncheckCheckBox1() : Promise<void>{
    await this.checkbox1.uncheck();
}

async checkCheckBox2() : Promise<void>{
    await this.checkbox2.check();
}

async uncheckCheckBox2(): Promise<void>{
    await this.checkbox2.uncheck();
}

async checkBothCheckBoxes():Promise <void>{
    await this.checkbox1.check();
    await this.checkbox2.check();
}

async uncheckBothCheckBoxes(): Promise<void>{
    await this.checkbox1.uncheck();
    await this.checkbox2.uncheck();
}


 // getters
async isCheckBox1Checked(): Promise<boolean>{
    return await this.checkbox1.isChecked();
}

async isCheckBox2isChecked(): Promise<boolean>{
    return await this.checkbox2.isChecked();
}


}