// page/internet/InternetDropdownPage.ts

import { Page, Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

// define the class
export class InternetDropdownPage extends BasePage {
   // define the locators
    readonly dropDown : Locator;

// define the contructor
    constructor (page: Page) {
        super(page);
        this.dropDown = page.locator('#dropdown');

    }

// define the atomic methods
// navigation method
async goToDropDown():Promise<void>{
    await this.navigateTo('/dropdown')
}

//actions
async selectByValue(value: string):Promise<void>{
    await this.dropDown.selectOption(value);
}

async selectByLabel(label: string): Promise<void>{
    await this.dropDown.selectOption({label});
}

async selectByIndex(index:number): Promise<void>{
    await this.dropDown.selectOption({index});
}


// getters

async getSelectedValue():Promise<string>{
    return await this.dropDown.inputValue();
}

async getSelectedLabel(): Promise<string> {
    return await this.dropDown.evaluate(
      (el: HTMLSelectElement) => el.options[el.selectedIndex]?.text ?? ''
    );
  }

} // end of class