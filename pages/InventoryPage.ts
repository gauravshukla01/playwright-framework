// pages/InventoryPage.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class InventoryPage extends BasePage {

  // ─── Locators ─────────────────────────────────────────────
  readonly productList:       Locator;
  readonly pageTitle:         Locator;
  readonly shoppingCartBadge: Locator;
  readonly shoppingCartLink:  Locator;
  readonly sortDropdown:      Locator;
  readonly burgerMenuButton:  Locator;
  readonly logoutLink:        Locator;

  constructor(page: Page) {
    super(page);
    this.productList       = page.locator('.inventory_list');
    this.pageTitle         = page.locator('.title');
    this.shoppingCartBadge = page.locator('.shopping_cart_badge');
    this.shoppingCartLink  = page.locator('.shopping_cart_link');
    this.sortDropdown      = page.locator('[data-test="product_sort_container"]');
    this.burgerMenuButton  = page.locator('#react-burger-menu-btn');
    this.logoutLink        = page.locator('#logout_sidebar_link');
  }

  // ─── Actions ──────────────────────────────────────────────

  async getProductNames(): Promise<string[]> {
    return await this.page.locator('.inventory_item_name').allInnerTexts();
  }

  async addItemToCartByName(productName: string): Promise<void> {
    await this.page
      .locator('.inventory_item')
      .filter({ hasText: productName })
      .locator('button')
      .click();
  }

  async getCartCount(): Promise<number> {
    const isVisible = await this.shoppingCartBadge.isVisible();
    if (!isVisible) return 0;
    const count = await this.shoppingCartBadge.innerText();
    return parseInt(count, 10);
  }

  async goToCart(): Promise<void> {
    await this.shoppingCartLink.click();
  }

  async sortProductsBy(option: 'az' | 'za' | 'lohi' | 'hilo'): Promise<void> {
    await this.sortDropdown.selectOption(option);
  }

  async logout(): Promise<void> {
    await this.burgerMenuButton.click();
    await this.logoutLink.click();
  }
}