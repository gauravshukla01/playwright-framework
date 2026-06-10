import { Page, expect } from "@playwright/test";
import { InternetFileUploadPage } from "../../pages/internet/InternetFileUploadPage";
import path from 'path';

export class InternetFileUploadPageFlows{
    readonly internetFileUploadPage : InternetFileUploadPage;

    constructor(page: Page){
        this.internetFileUploadPage = new InternetFileUploadPage(page);
    }

    // navigate to the upload page
    async goToUploadPage():Promise<void>{
        await this.internetFileUploadPage.navigateToUploadPage();
    }

    // method to upload and check
      async uploadSingleFile(): Promise<void> {
    
    const filePath = path.join(__dirname, '../../fixtures/testUploadFile.txt');

    await this.internetFileUploadPage.fileInput.setInputFiles(filePath);
    await this.internetFileUploadPage.uploadButton.click();
    await expect(this.internetFileUploadPage.uploadedFileName).toHaveText('testUploadFile.txt');
  }

   async clearFileSelection(): Promise<void> {
  

    const filePath = path.join(__dirname, '../../fixtures/testUploadFile.txt');

    await this.internetFileUploadPage.fileInput.setInputFiles(filePath);
    await this.internetFileUploadPage.fileInput.setInputFiles([]);
    await expect(this.internetFileUploadPage.uploadButton).toBeVisible();
  }

}