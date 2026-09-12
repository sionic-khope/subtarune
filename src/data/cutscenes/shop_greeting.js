export const SHOP_GREETING_FLAG = 'shop_yongjun_greeted';
const Y = { speaker: '박용준', voice: 'yongjun' };
const P = { speaker: '억빠맨', portrait: 'ppaman', voice: 'ppaman' };

/** First shop entry only; completion is persisted after the final dialogue closes. */
export const shop_greeting = Object.assign([
  { ...Y, text: '* 오 안녕하세요 형' },
  { ...P, text: '* 너 뭐해 여기서' },
  { ...Y, text: '* 알바하면 자꾸 잘려서 제가 편의점을 차렸어요' },
  { ...P, text: '* 걍 다내놔 시발새끼야' },
  { ...Y, text: '* 어허 안됩니다' },
  { ...Y, text: '* 필요한거 있으시면{n}말씀주세요 ㅎㅎ' },
  { set: { [SHOP_GREETING_FLAG]: true } },
  { action: (game) => game.autosave() },
], { silent: true });
