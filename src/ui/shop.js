import { Input } from '../core/input.js';
import { drawBox, drawHeart, loadImageOptional } from '../core/gfx.js';
import { purchaseShopItem, shopItemState } from '../core/shop.js';
import { YONGJUN_SHOP } from '../data/shops.js';
import { SHOP_KO as L } from '../data/locale/shop-ko.js';
import { FONT, F } from './font.js';
import { drawMenuText } from './menu-layout.js';

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
    this.artReady = typeof Image === 'undefined' ? Promise.resolve(null) : loadImageOptional('assets/shop/yongjun-counter.png').then((image) => { this.art = image; return image; });
  }

  /** Open the product list; discard the press that entered the shop. */
  open() {
    this.index = 0;
    this.choice = 1;
    this.message = null;
    this.mode = 'browse';
    this.lock = SHOP_LAYOUT.inputLock;
    this.waitForRelease = true;
    this.game.state = 'shop';
    this.game.sound.sfx('open');
  }

  /** Return directly to the paused field without changing its music or position. */
  close() {
    this.mode = 'closed';
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
    if (input.just('cancel')) {
      if (this.mode === 'browse') this.close();
      else this._browse();
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
        else this._purchase();
      }
      return;
    }
    const count = YONGJUN_SHOP.length + 1;
    if (input.just('up') || input.just('down')) {
      this.index = (this.index + (input.just('up') ? count - 1 : 1)) % count;
      this.game.sound.sfx('menu');
    }
    if (!input.just('confirm')) return;
    const item = YONGJUN_SHOP[this.index];
    if (!item) { this.close(); return; }
    const result = shopItemState(this.game, item.id);
    if (!result.ok) { this._feedback(result); return; }
    this.choice = 1;
    this.mode = 'confirm';
    this.lock = SHOP_LAYOUT.inputLock;
    this.game.sound.sfx('confirm');
  }

  _browse() {
    this.mode = 'browse';
    this.message = null;
    this.lock = SHOP_LAYOUT.inputLock;
    this.game.sound.sfx('cancel');
  }

  _purchase() {
    this._feedback(purchaseShopItem(this.game, YONGJUN_SHOP[this.index].id));
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
    if (this.mode === 'browse') this._drawProducts(ctx);
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
      ctx.fillText(item?.name ?? L.exit, nameX, y);
      if (item) {
        ctx.textAlign = 'right';
        ctx.fillText(soldOut ? L.soldOut : L.moneyAmount(item.price), priceX, y);
        ctx.textAlign = 'left';
      }
      if (i === this.index) drawHeart(ctx, nameX - 14, y + 5, colors.heart);
    }
    this._drawHint(ctx, L.browseHint);
  }

  _drawAction(ctx) {
    const { products, inset, colors } = SHOP_LAYOUT;
    const item = YONGJUN_SHOP[this.index];
    const x = products.x + inset;
    const width = products.w - inset * 2;
    ctx.fillStyle = colors.selected;
    ctx.fillText(item.name, x, 202);
    if (this.mode === 'confirm') {
      ctx.textAlign = 'right';
      ctx.fillText(L.moneyAmount(item.price), products.x + products.w - inset, 202);
      ctx.textAlign = 'left';
      ctx.fillStyle = colors.text;
      ctx.fillText(L.buyQuestion, x, 232);
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
      ctx.fillText(L.purchased, x, 202 + F.lineH);
      const effect = item.stat?.attack ? L.attackEffect(item.stat.attack) : item.stat?.hpBonus ? L.hpEffect(item.stat.hpBonus) : L.inventoryEffect;
      drawMenuText(ctx, effect, x, 250, width, 3);
    } else {
      ctx.fillStyle = colors.text;
      const reason = result.reason === 'insufficient_money' ? L.insufficientMoney : result.reason === 'sold_out' ? L.soldOutMessage : L.unavailable;
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
    drawMenuText(ctx, item?.description ?? L.exitDescription, x, 202, width, 5);
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
