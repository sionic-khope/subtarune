// 굽은 물길(jjajang_bend2)의 비석 다섯 (BUILD248 사용자 브리핑 2026-09-19, 원문·구현표는 design/narrative/cutscenes/jjajang_stele.md)
//   길 위쪽 칸에 간격을 맞춰 서 있고, 앞에서 C 를 누르면 새겨진 글을 읽는다. 대사는 원문 그대로(비석 글이라 전부 나레이션).
//   다섯 번째는 글이 끊기고 나레이션 한 줄이 더 붙는다: “... 그 뒤에 내용이 갈기갈기 찢어져있다 .”
const N = text => ({ voice: 'narrator', text: `* ${text}` });

export const jjajang_stele1 = [
  N('과거 붉은군단과 파란악마가 격돌했다'),
  N('붉은 군단은 혁명을 일으켰지만 결국 실패하고 말았다'),
];
export const jjajang_stele2 = [
  N('드럼통의 악마는 더욱 강해져갔다'),
  N('그를 막을 방법은 아무도 없었다'),
];
export const jjajang_stele3 = [
  N('전설의 붉은 깃발의 용사가 있었다.'),
  N('그가 마지막 영웅이였으며 모두의 희망이였다.'),
];
export const jjajang_stele4 = [
  N('그러나 결국 실패하고 말았다.'),
  N('계엄을 실패한 것이다.'),
];
export const jjajang_stele5 = [
  N('...'),
  N('야이씨발년아 씹구멍쑤ㅅ..'),
  N('... 그 뒤에 내용이 갈기갈기 찢어져있다 .'),
];
export const STELE_SCRIPTS = ['jjajang_stele1', 'jjajang_stele2', 'jjajang_stele3', 'jjajang_stele4', 'jjajang_stele5'];
