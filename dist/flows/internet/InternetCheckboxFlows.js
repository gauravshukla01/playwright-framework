"use strict";
// flows/internet/InternetCheckboxFlows.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternetCheckboxFlows = void 0;
const test_1 = require("@playwright/test");
const InternetCheckboxPage_1 = require("../../pages/internet/InternetCheckboxPage");
// define the class and the object of the related page class
class InternetCheckboxFlows {
    // define a constructor
    constructor(page) {
        this.internetCheckBoxPage = new InternetCheckboxPage_1.InternetCheckboxPage(page);
    }
    // define business flow related methods using the internetcheckboxpage
    // navigation method:
    async navigateToCheckBox() {
        await this.internetCheckBoxPage.goToCheckBoxes();
    }
    // business scenario
    // 1 : verify initial state
    async verifyInitialState() {
        await this.internetCheckBoxPage.goToCheckBoxes();
        await (0, test_1.expect)(this.internetCheckBoxPage.checkbox1).not.toBeChecked();
        await (0, test_1.expect)(this.internetCheckBoxPage.checkbox2).toBeChecked();
    }
    // check first checkbox
    async checkFirstCheckBox() {
        await this.internetCheckBoxPage.checkCheckBoxe1();
        await (0, test_1.expect)(this.internetCheckBoxPage.checkbox1).toBeChecked();
    }
    // uncheck second check box
    async uncheckSecondCheckBox() {
        await this.internetCheckBoxPage.uncheckCheckBox2();
        await (0, test_1.expect)(this.internetCheckBoxPage.checkbox2).not.toBeChecked();
    }
    // check both check boxes:
    async checkBothCheckBoxes() {
        await this.internetCheckBoxPage.checkBothCheckBoxes();
        await (0, test_1.expect)(this.internetCheckBoxPage.checkbox1).toBeChecked();
        await (0, test_1.expect)(this.internetCheckBoxPage.checkbox2).toBeChecked();
    }
    // uncheck both boxes
    async uncheckBothCheckBoxes() {
        await this.internetCheckBoxPage.uncheckBothCheckBoxes();
        await (0, test_1.expect)(this.internetCheckBoxPage.checkbox1).not.toBeChecked();
        await (0, test_1.expect)(this.internetCheckBoxPage.checkbox2).not.toBeChecked();
    }
    // visibility assertions
    async assertCheckBoxesVisible() {
        await (0, test_1.expect)(this.internetCheckBoxPage.checkbox1).toBeVisible();
        await (0, test_1.expect)(this.internetCheckBoxPage.checkbox2).toBeVisible();
    }
}
exports.InternetCheckboxFlows = InternetCheckboxFlows;
