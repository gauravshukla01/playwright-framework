import { Page, Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

// define the class
export class InternetWindowsPage extends BasePage{
    // define the locators
readonly newWindowLink : Locator;

// define the constructor
constructor(page:Page){
    super(page);
    this.newWindowLink = page.getByRole('link', { name: 'Click Here' });
}
// define navigation and atomic action methods
async goToNewWindowPage():Promise<void>{
    await this.navigateTo('/windows');
}

} // end of class


