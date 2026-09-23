/** 용준 상점: 소모품은 item, 즉시 적용되는 영구 강화는 stat과 onceFlag를 갖는다. */
export const YONGJUN_SHOP = [
  { id: 'eggtart', name: '에그타르트', price: 50, item: '에그타르트', description: 'HP 100 회복. 사용하면 사라진다.' },
  { id: 'stomach_medicine', name: '위장약', price: 100, item: '위장약', description: 'HP 200 회복. 사용하면 사라진다.' },
  { id: 'cialis', name: '씨알리스', price: 10, event: true, stat: { attack: 1 }, onceFlag: 'shop_yongjun_cialis', description: '팀 전체 공격력 영구 +1. 한 번만 구매 가능.' },
  { id: 'vaseline', name: '바세린', price: 10, event: true, stat: { hpBonus: 20 }, onceFlag: 'shop_yongjun_vaseline', description: '팀 전체 최대 HP 영구 +20. 한 번만 구매 가능.' },
];

/** 구출 뒤 보충품만 교체한다. 영구 강화의 가격·구매 플래그는 그대로다. */
export const YONGJUN_RESCUE_SHOP = [
  { id: 'strong_vaseline', name: '더 강한 바세린', price: 10, item: '더 강한 바세린', description: 'HP 300 회복. 사용하면 사라진다.' },
  { id: 'strong_cialis', name: '더 강한 씨알리스', price: 10, item: '더 강한 씨알리스', description: 'HP 500 회복. 사용하면 사라진다.' },
  ...YONGJUN_SHOP.filter((entry) => entry.stat),
];

/** 실제 저장 플래그로 현재 진열품을 고른다. */
export const yongjunShop = (flags) => flags?.choimis_rescued ? YONGJUN_RESCUE_SHOP : YONGJUN_SHOP;

/** 판매 가격: 상점 소모품은 구매가 절반, 비매품은 사용자 지정 가격. */
export const YONGJUN_RESALE_PRICES = {
  ...Object.fromEntries(YONGJUN_SHOP.filter((entry) => entry.item).map((entry) => [entry.item, Math.floor(entry.price / 2)])),
  ...Object.fromEntries(YONGJUN_RESCUE_SHOP.filter((entry) => entry.item).map((entry) => [entry.item, Math.floor(entry.price / 2)])),
  '바나나': 10,
  '먼지': 1,
};
