import { Page, expect, BrowserContext } from "@playwright/test";
import { InternetWindowsPage } from "../../pages/internet/InternetWindowsPage";

export class InternetWindowsPageFlows{

readonly internetWindowsPage : InternetWindowsPage;
readonly context: BrowserContext;

constructor(page: Page, context: BrowserContext){
    this.internetWindowsPage = new InternetWindowsPage(page);
    this.context = context;
}

// define the business flows:
async navigtateToNewWindowPage():Promise<void>{
    await this.internetWindowsPage.goToNewWindowPage();
}

async openNewTabAndVerify(): Promise<void>{
   // await this.internetWindowsPage.navigateTo();

    const [newPage] = await Promise.all([
      this.context.waitForEvent('page'),
      this.internetWindowsPage.newWindowLink.click()
    ]);

    await newPage.waitForLoadState();
    await expect(newPage.getByRole('heading', { name: 'New Window' })).toBeVisible();
    await newPage.close();
} ; // end of verification method


}// end of class