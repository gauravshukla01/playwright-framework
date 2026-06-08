"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryPage = void 0;
const BasePage_1 = require("./BasePage");
class InventoryPage extends BasePage_1.BasePage {
    constructor(page) {
        super(page);
        this.productList = page.locator('.inventory_list');
        this.pageTitle = page.locator('.title');
        this.shoppingCartBadge = page.locator('.shopping_cart_badge');
        this.shoppingCartLink = page.locator('.shopping_cart_link');
        this.sortDropdown = page.locator('[data-test="product_sort_container"]');
        this.burgerMenuButton = page.locator('#react-burger-menu-btn');
        this.logoutLink = page.locator('#logout_sidebar_link');
    }
    // ─── Actions ──────────────────────────────────────────────
    async getProductNames() {
        return await this.page.locator('.inventory_item_name').allInnerTexts();
    }
    async addItemToCartByName(productName) {
        await this.page
            .locator('.inventory_item')
            .filter({ hasText: productName })
            .locator('button')
            .click();
    }
    async getCartCount() {
        const isVisible = await this.shoppingCartBadge.isVisible();
        if (!isVisible)
            return 0;
        const count = await this.shoppingCartBadge.innerText();
        return parseInt(count, 10);
    }
    async goToCart() {
        await this.shoppingCartLink.click();
    }
    async sortProductsBy(option) {
        await this.sortDropdown.selectOption(option);
    }
    async logout() {
        await this.burgerMenuButton.click();
        await this.logoutLink.click();
    }
}
exports.InventoryPage = InventoryPage;
