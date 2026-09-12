import { Input } from '../core/input.js';
import { drawBox, drawHeart, loadImageOptional } from '../core/gfx.js';
import { purchaseShopItem, shopItemState, saleItemState, sellShopItem } from '../core/shop.js';
import { YONGJUN_SHOP } from '../data/shops.js';
import { SHOP_KO as L } from '../data/locale/shop-ko.js';
import { FONT, F } from './font.js';
import { drawMenuText, menuWindow } from './menu-layout.js';
import { ShopGreeting } from './shop-greeting.js';
import { SHOP_GREETING_FLAG } from '../data/cutscenes/shop_greeting.js';

/** Logical-pixel shop geometry and palette from DESIGN.md's Yongjun contract. */
export const SHOP_LAYOUT = Object.freeze({
  art: { sx: 0, sy: 0, sw: 800, sh: 306, x: 0, y: 0, w: 480, h: 184 },
  products: { x: 8, y: 188, w: 288, h: 164 },
  detail: { x: 304, y: 188, w: 168, h: 164 },
  rowHeight: 24, listY: 202, nameX: 36, priceX: 280,
  footerY: 326, inset: 12, inputLock: 0.1,
  colors: { background: '#000', text: '#fff', frameInner: '#cfcfdd', selected: '#ffe066', muted: '#9a9ab0', heart: '#ff2b4a' },
});

function panel(ctx, rect) {
  drawBox(ctx, rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = SHOP_LAYOUT.colors.frameInner;
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 3.5, rect.y + 3.5, rect.w - 7, rect.h - 7);
}

/** A field overlay: core shop commands alone apply purchases to saved game data. */
export class Shop {
  constructor(game) {
    this.game = game;
    this.mode = 'closed';
    this.index = 0;
    this.choice = 1;
    this.art = null;
    this.greeting = null;
    this.artReady = typeof Image === 'undefined' ? Promise.resolve(null) : loadImageOptional('assets/shop/yongjun-counter.png').then((image) => { this.art = image; return image; });
  }

  /** Open the first-visit greeting or home menu; discard the entry press. */
  open() {
    this.reset();
    this.index = 0;
    this.choice = 1;
    this.message = null;
    this.mode = 'home';
    this.section = 'buy';
    this.lock = SHOP_LAYOUT.inputLock;
    this.waitForRelease = true;
    this.game.state = 'shop';
    if (!this.game.has(SHOP_GREETING_FLAG)) {
      this.mode = 'greeting';
      this.greeting = new ShopGreeting(this.game, SHOP_LAYOUT.products);
      this.greeting.start(() => {
        this.mode = 'home';
        this.lock = SHOP_LAYOUT.inputLock;
        this.waitForRelease = true;
      });
    }
  }

  /** Reset transient UI on new game, reload, QA jump, or interrupted entry. */
  reset() {
    this.greeting?.dispose();
    this.greeting = null;
    this.mode = 'closed';
  }

  /** Return directly to the paused field without changing its music or position. */
  close() {
    this.reset();
    this.game.state = 'field';
    this.game.sound.sfx('close');
  }

  /** Handle keyboard and gamepad action edges through the shared Input interface. */
  update(dt, input = Input) {
    if (this.mode === 'closed') return;
    this.lock = Math.max(0, this.lock - dt);
    if (this.waitForRelease) {
      if (!input.down('confirm') && !input.down('cancel')) this.waitForRelease = false;
      return;
    }
    if (this.lock > 0) return;
    if (this.mode === 'greeting') {
      this.greeting.update(dt, input);
      return;
    }
    if (input.just('cancel')) {
      if (this.mode === 'home') this.close();
      else if (this.mode === 'browse' || this.mode === 'sell') this._home();
      else this._browse();
      return;
    }
    if (this.mode === 'home') {
      this._move(input, 3);
      if (input.just('confirm')) {
        if (this.index === 2) this.close();
        else {
          this.section = this.index === 0 ? 'buy' : 'sell';
          this.index = 0;
          this._browse();
        }
      }
      return;
    }
    if (this.mode === 'message') {
      if (input.just('confirm')) this._browse();
      return;
    }
    if (this.mode === 'confirm') {
      if (['left', 'right', 'up', 'down'].some((action) => input.just(action))) {
        this.choice = 1 - this.choice;
        this.game.sound.sfx('menu');
      }
      if (input.just('confirm')) {
        if (this.choice === 1) this._browse();
        else this._transact();
      }
      return;
    }
    const count = (this.section === 'sell' ? this.game.inventory : YONGJUN_SHOP).length + 1;
    this._move(input, count);
    if (!input.just('confirm')) return;
    if (this.index === count - 1) { this._home(); return; }
    const result = this.section === 'sell' ? saleItemState(this.game, this.index) : shopItemState(this.game, YONGJUN_SHOP[this.index].id);
    this.transaction = result;
    if (!result.ok) { this._feedback(result); return; }
    this.choice = 1;
    this.mode = 'confirm';
    this.lock = SHOP_LAYOUT.inputLock;
    this.game.sound.sfx('confirm');
  }

  _browse() {
    this.mode = this.section === 'sell' ? 'sell' : 'browse';
    const count = this.section === 'sell' ? this.game.inventory.length : YONGJUN_SHOP.length;
    this.index = Math.min(this.index, count);
    this.message = null;
    this.lock = SHOP_LAYOUT.inputLock;
    this.game.sound.sfx('cancel');
  }

  _home() {
    this.mode = 'home';
    this.index = this.section === 'sell' ? 1 : 0;
    this.message = null;
    this.lock = SHOP_LAYOUT.inputLock;
    this.game.sound.sfx('cancel');
  }

  _move(input, count) {
    if (input.just('up') || input.just('down')) {
      this.index = (this.index + (input.just('up') ? count - 1 : 1)) % count;
      this.game.sound.sfx('menu');
    }
  }

  _transact() {
    if (this.section === 'sell' && this.game.inventory[this.transaction.inventoryIndex] !== this.transaction.name) {
      this._feedback({ ok: false, reason: 'invalid_index' });
      return;
    }
    this._feedback(this.section === 'sell' ? sellShopItem(this.game, this.transaction.inventoryIndex) : purchaseShopItem(this.game, this.transaction.item.id));
  }

  _feedback(result) {
    this.mode = 'message';
    this.message = result;
    this.lock = SHOP_LAYOUT.inputLock;
    this.game.sound.sfx(result.ok ? 'item' : 'cancel');
  }

  /** Render original counter art and live, independently measured text panels. */
  draw(ctx) {
    if (this.mode === 'closed') return;
    const { art, products, detail, colors } = SHOP_LAYOUT;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, 480, 360);
    ctx.font = FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    if (this.art) ctx.drawImage(this.art, art.sx, art.sy, art.sw, art.sh, art.x, art.y, art.w, art.h);
    else {
      const portrait = this.game.portraits?.yongjun;
      if (portrait) ctx.drawImage(portrait, 208, 72, 64, 64);
      ctx.fillStyle = colors.text;
      ctx.fillText(L.title, 24, 148);
    }
    panel(ctx, products);
    panel(ctx, detail);
    if (this.mode === 'greeting') {
      this._drawMoney(ctx);
      this.greeting.draw(ctx);
      ctx.restore();
      return;
    }
    if (this.mode === 'home') this._drawHome(ctx);
    else if (this.mode === 'browse') this._drawProducts(ctx);
    else if (this.mode === 'sell') this._drawSales(ctx);
    else this._drawAction(ctx);
    this._drawDetail(ctx);
    ctx.restore();
  }

  _drawProducts(ctx) {
    const { listY, rowHeight, nameX, priceX, colors } = SHOP_LAYOUT;
    for (let i = 0; i <= YONGJUN_SHOP.length; i++) {
      const item = YONGJUN_SHOP[i];
      const soldOut = item && shopItemState(this.game, item.id).reason === 'sold_out';
      const y = listY + i * rowHeight;
      ctx.fillStyle = i === this.index ? colors.selected : soldOut ? colors.muted : colors.text;
      ctx.fillText(item?.name ?? L.back, nameX, y);
      if (item) {
        if (item.event) {
          ctx.fillStyle = colors.selected;
          ctx.fillText(L.event, nameX + Math.ceil(ctx.measureText(item.name).width) + 8, y);
          ctx.fillStyle = i === this.index ? colors.selected : soldOut ? colors.muted : colors.text;
        }
        ctx.textAlign = 'right';
        ctx.fillText(soldOut ? L.soldOut : L.moneyAmount(item.price), priceX, y);
        ctx.textAlign = 'left';
      }
      if (i === this.index) drawHeart(ctx, nameX - 14, y + 5, colors.heart);
    }
    this._drawHint(ctx, L.browseHint);
  }

  _drawHome(ctx) {
    const { listY, rowHeight, nameX, colors } = SHOP_LAYOUT;
    [L.buy, L.sell, L.exit].forEach((label, i) => {
      const y = listY + i * rowHeight;
      ctx.fillStyle = this.index === i ? colors.selected : colors.text;
      ctx.fillText(label, nameX, y);
      if (this.index === i) drawHeart(ctx, nameX - 14, y + 5, colors.heart);
    });
    this._drawHint(ctx, L.homeHint);
  }

  _drawSales(ctx) {
    const { listY, rowHeight, nameX, priceX, colors } = SHOP_LAYOUT;
    const count = this.game.inventory.length;
    const window = menuWindow(count + 1, this.index, 5);
    for (let i = window.start; i < window.end; i++) {
      const result = i < count ? saleItemState(this.game, i) : null;
      const y = listY + (i - window.start) * rowHeight;
      const price = result ? result.ok ? L.moneyAmount(result.price) : L.cannotSell : '';
      ctx.fillStyle = i === this.index ? colors.selected : result && !result.ok ? colors.muted : colors.text;
      drawMenuText(ctx, result?.name ?? L.back, nameX, y, priceX - nameX - ctx.measureText(price).width - 8);
      ctx.textAlign = 'right';
      ctx.fillText(price, priceX, y);
      ctx.textAlign = 'left';
      if (i === this.index) drawHeart(ctx, nameX - 14, y + 5, colors.heart);
    }
    this._drawHint(ctx, L.sellHint);
  }

  _drawAction(ctx) {
    const { products, inset, colors } = SHOP_LAYOUT;
    const item = this.transaction.item;
    const selling = this.section === 'sell';
    const x = products.x + inset;
    const width = products.w - inset * 2;
    ctx.fillStyle = colors.selected;
    drawMenuText(ctx, selling ? this.transaction.name : item.name, x, 202, width - 80);
    if (this.mode === 'confirm') {
      ctx.textAlign = 'right';
      ctx.fillText(L.moneyAmount(selling ? this.transaction.price : item.price), products.x + products.w - inset, 202);
      ctx.textAlign = 'left';
      ctx.fillStyle = colors.text;
      ctx.fillText(selling ? L.sellQuestion : L.buyQuestion, x, 232);
      [L.yes, L.no].forEach((label, index) => {
        const choiceX = x + 24 + index * 112;
        ctx.fillStyle = this.choice === index ? colors.selected : colors.text;
        ctx.fillText(label, choiceX, 278);
        if (this.choice === index) drawHeart(ctx, choiceX - 14, 283, colors.heart);
      });
      this._drawHint(ctx, L.confirmHint);
      return;
    }
    const result = this.message;
    if (result.ok) {
      ctx.fillText(selling ? L.sold : L.purchased, x, 202 + F.lineH);
      const effect = selling ? L.saleEffect(result.price) : item.stat?.attack ? L.attackEffect(item.stat.attack) : item.stat?.hpBonus ? L.hpEffect(item.stat.hpBonus) : L.inventoryEffect;
      drawMenuText(ctx, effect, x, 250, width, 3);
    } else {
      ctx.fillStyle = colors.text;
      const reason = selling ? result.reason === 'key_item' ? L.keyItem : L.noSale : result.reason === 'insufficient_money' ? L.insufficientMoney : result.reason === 'sold_out' ? L.soldOutMessage : L.unavailable;
      drawMenuText(ctx, reason, x, 238, width, 3);
    }
    this._drawHint(ctx, L.messageHint);
  }

  _drawDetail(ctx) {
    const { detail, inset, colors } = SHOP_LAYOUT;
    const item = YONGJUN_SHOP[this.index];
    const x = detail.x + inset;
    const width = detail.w - inset * 2;
    ctx.fillStyle = colors.text;
    let description = item?.description ?? L.backDescription;
    if (this.mode === 'home') description = [L.buyDescription, L.sellDescription, L.exitDescription][this.index];
    else if (this.section === 'sell') {
      const selected = this.mode === 'sell' ? saleItemState(this.game, this.index) : this.transaction;
      description = selected.reason === 'invalid_index' ? this.game.inventory.length ? L.backDescription : L.emptyInventory : selected.item?.desc ?? L.noSale;
      if (this.mode === 'sell' && this.game.inventory.length >= 5) {
        ctx.fillStyle = colors.muted;
        ctx.fillText(L.listPosition(this.index + 1, this.game.inventory.length + 1), x, 280);
      }
    }
    ctx.fillStyle = colors.text;
    drawMenuText(ctx, description, x, 202, width, 4);
    this._drawMoney(ctx);
  }

  _drawMoney(ctx) {
    const { detail, inset, colors } = SHOP_LAYOUT;
    const x = detail.x + inset;
    const width = detail.w - inset * 2;
    ctx.fillStyle = colors.muted;
    ctx.fillText(L.money, x, 304);
    ctx.fillStyle = colors.text;
    drawMenuText(ctx, L.moneyAmount(this.game.money), x, 326, width);
  }

  _drawHint(ctx, label) {
    const { products, inset, footerY, colors } = SHOP_LAYOUT;
    ctx.fillStyle = colors.muted;
    drawMenuText(ctx, label, products.x + inset, footerY, products.w - inset * 2);
  }
}
