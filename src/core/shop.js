import { YONGJUN_RESALE_PRICES, YONGJUN_SALE_EVENTS, yongjunShop } from '../data/shops.js';
import { ITEMS } from '../data/items.js';
import { fullParty } from './party.js';

/** 구매 가능 여부를 읽기만 한다. 취소 또는 상세 보기에는 상태 변경이 없다. */
export function shopItemState(game, itemId) {
  const item = yongjunShop(game.flags).find((entry) => entry.id === itemId);
  const reason = !item ? 'unknown' : item.onceFlag && game.has(item.onceFlag) ? 'sold_out' : game.money < item.price ? 'insufficient_money' : null;
  return { ok: reason === null, reason, item };
}

/** 팀 전체 최대 HP 를 영구로 올리고 지금 HP 도 그만큼 채운다(상점 바세린, 박용준의 오마카세). 저장은 부르는 쪽이 한다. */
export function raisePartyMaxHp(game, amount) {
  const hpBefore = new Map([...new Set([...fullParty(game.party), ...Object.keys(game.partyHp)])].map((id) => [id, game.hpOf(id)]));
  game.hpBonus += amount;
  for (const [id, hp] of hpBefore) game.partyHp[id] = Math.min(game.maxHpOf(id), hp + amount);
}

/** 검사 후 돈·아이템·영구 강화를 한 번에 적용하고 완성된 상태만 저장한다. */
export function purchaseShopItem(game, itemId) {
  const result = shopItemState(game, itemId);
  if (!result.ok) return result;
  const { item } = result;
  game.money -= item.price;
  if (item.item) game.inventory.push(item.item);
  if (item.stat?.attack) game.attack += item.stat.attack;
  if (item.stat?.hpBonus) raisePartyMaxHp(game, item.stat.hpBonus);
  if (item.onceFlag) game.setFlag(item.onceFlag);
  game.autosave();
  return result;
}

/** 인벤토리 원본 인덱스의 판매 가능 여부를 읽으며 중요·미등록 아이템은 거부한다. */
export function saleItemState(game, inventoryIndex) {
  if (!Number.isInteger(inventoryIndex) || inventoryIndex < 0 || inventoryIndex >= game.inventory.length) {
    return { ok: false, reason: 'invalid_index', inventoryIndex };
  }
  const name = game.inventory[inventoryIndex];
  const item = Object.hasOwn(ITEMS, name) ? ITEMS[name] : undefined;
  const price = Object.hasOwn(YONGJUN_RESALE_PRICES, name) ? YONGJUN_RESALE_PRICES[name] : undefined;
  const saleEvent = Object.hasOwn(YONGJUN_SALE_EVENTS, name) && YONGJUN_SALE_EVENTS[name].map === game.mapId ? YONGJUN_SALE_EVENTS[name] : undefined;
  const reason = !item ? 'unknown' : item.kind !== 'plain' ? 'key_item' : saleEvent ? null : price === undefined ? 'unsellable' : null;
  return { ok: reason === null, reason, item, name, price: reason === null && !saleEvent ? price : undefined, ...(reason === null && saleEvent ? { event: saleEvent } : {}), inventoryIndex };
}

/** 실행 시 다시 검사한 아이템 한 개만 빼고 대금을 더한 완성 상태를 한 번 저장한다. */
export function sellShopItem(game, inventoryIndex) {
  const result = saleItemState(game, inventoryIndex);
  if (!result.ok) return result;
  game.inventory.splice(inventoryIndex, 1);
  // 연출 판매: 대금 없이 아이템만 넘기고 플래그를 세운다. 저장은 연출이 끝난 뒤(도중에 끄면 판매 전으로 돌아간다)
  if (result.event) { game.setFlag(result.event.flag); return result; }
  game.money += result.price;
  game.autosave();
  return result;
}
