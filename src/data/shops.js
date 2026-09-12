/** 용준 상점: 소모품은 item, 즉시 적용되는 영구 강화는 stat과 onceFlag를 갖는다. */
export const YONGJUN_SHOP = [
  { id: 'eggtart', name: '에그타르트', price: 50, item: '에그타르트', description: 'HP 100 회복. 사용하면 사라진다.' },
  { id: 'stomach_medicine', name: '위장약', price: 100, item: '위장약', description: 'HP 200 회복. 사용하면 사라진다.' },
  { id: 'cialis', name: '씨알리스', price: 1000, stat: { attack: 1 }, onceFlag: 'shop_yongjun_cialis', description: '팀 전체 공격력 영구 +1. 한 번만 구매 가능.' },
  { id: 'vaseline', name: '바세린', price: 1500, stat: { hpBonus: 20 }, onceFlag: 'shop_yongjun_vaseline', description: '팀 전체 최대 HP 영구 +20. 한 번만 구매 가능.' },
];
