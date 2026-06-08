"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternetCheckboxPage = void 0;
const BasePage_1 = require("../BasePage");
class InternetCheckboxPage extends BasePage_1.BasePage {
    // define the constructor
    constructor(page) {
        super(page);
        this.checkbox1 = page.locator('//form[@id="checkboxes"]//input[contains(following-sibling::text(), "checkbox 1")]');
        this.checkbox2 = page.locator('//form[@id="checkboxes"]//input[contains(following-sibling::text(), "checkbox 2")]');
    }
    // define the atomic methods
    // navigation methods
    async goToCheckBoxes() {
        await this.page.goto('/checkboxes');
    }
    // action methods
    async checkCheckBoxe1() {
        await this.checkbox1.check();
    }
    async uncheckCheckBox1() {
        await this.checkbox1.uncheck();
    }
    async checkCheckBox2() {
        await this.checkbox2.check();
    }
    async uncheckCheckBox2() {
        await this.checkbox2.uncheck();
    }
    async checkBothCheckBoxes() {
        await this.checkbox1.check();
        await this.checkbox2.check();
    }
    async uncheckBothCheckBoxes() {
        await this.checkbox1.uncheck();
        await this.checkbox2.uncheck();
    }
    // getters
    async isCheckBox1Checked() {
        return await this.checkbox1.isChecked();
    }
    async isCheckBox2isChecked() {
        return await this.checkbox2.isChecked();
    }
}
exports.InternetCheckboxPage = InternetCheckboxPage;
