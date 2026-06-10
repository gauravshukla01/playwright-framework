import { test, expect }                      from '../../fixtures';
import { InternetCheckboxFlows } from '../../flows/internet/InternetCheckboxFlows';



    test.describe('test for file upload check', ()=>{
        test.beforeEach('navigate to upload page', async({internetFlows})=>{
            await internetFlows.fileUploadPage.goToUploadPage();
        }); // edn of before each


           test(' test to upload 1', async({internetFlows})=>{
        await internetFlows.fileUploadPage.uploadSingleFile();
    }); // end of test 1
    });

 


