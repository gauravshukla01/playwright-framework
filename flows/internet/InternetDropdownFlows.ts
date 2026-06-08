// flows/internet/InternetDropdownFlows.ts

import { Page, expect } from "@playwright/test";
import { InternetDropdownPage } from "../../pages/internet/InternetDropdownPage";

export class InternetDropdownFlows{
    // define the page object reference

    private readonly dropDownPage : InternetDropdownPage;

    // define the construtor
    constructor(page: Page){
        this.dropDownPage = new InternetDropdownPage(page);
    }

    // define the business flows as per the required test cases
    // navigation flow
    async gotoDropDown():Promise<void>{
        await this.dropDownPage.goToDropDown();
    }

    // business scenario:
    // 1: verify default state
    async verifyDefaultState():Promise<void>{
        const selectedValue = await this.dropDownPage.getSelectedValue();
        expect(selectedValue).toBe('');
    }

async selectOption1ByValueAndVerify():Promise<void>{
    // first select the option 1 by value
    await this.dropDownPage.selectByValue('1');
    expect(await this.dropDownPage.getSelectedValue()).toBe('1');

}

async selectOption2ByValueAndVerify():Promise<void>{
    // first select the option 1 by value
    await this.dropDownPage.selectByValue('2');
    const selectedValue = await this.dropDownPage.getSelectedValue();
    expect(selectedValue).toBe('2');
}

async selectOption1ByLabelAndVerify():Promise<void>{
    await this.dropDownPage.selectByLabel('Option 1');
    const label = await this.dropDownPage.getSelectedLabel();
    expect(label).toBe('Option 1')
}

async selectOption2ByLabelAndVerify():Promise<void>{
    await this.dropDownPage.selectByLabel('Option 2');
    const label = await this.dropDownPage.getSelectedLabel();
    expect(label).toBe('Option 2');
}

async switchFromOption1ToOption2AndVerify():Promise<void>{
    await this.dropDownPage.selectByValue('1');
    expect(await this.dropDownPage.getSelectedValue()).toBe('1');
    await this.dropDownPage.selectByValue('2');
    expect(await this.dropDownPage.getSelectedValue()).toBe('2');
}

}