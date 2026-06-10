import { Page, Locator } from "@playwright/test";
import { BasePage } from "../BasePage";

export class InternetFileUploadPage extends BasePage{
     readonly fileInput : Locator;
      readonly uploadButton : Locator;
       readonly uploadedFileName : Locator;

    constructor(page:Page){
        super(page);
    this.fileInput        = page.locator('#file-upload');
    this.uploadButton     = page.locator('#file-submit');
    this.uploadedFileName = page.locator('#uploaded-files');
    }

    // navigation method
    async navigateToUploadPage(): Promise<void>{
        await this.navigateTo('/upload');

    }

}