# 재사용 검은 연기 컷신 노드

2026-09-13 채택. 기존 `aura`는 빛나는 버프 입자라서 검은 연기의 불투명한 덩어리·응축/대상 이동을 표현하지 못한다.

`src/ui/dark-smoke.js`는 외부 이미지나 캐릭터를 변형하지 않고64개 고정 시드 픽셀 구름의 위치/크기를 계산한다. `darkSmokeWaiter(game, definition)`은 기존 ScriptRunner가 소비하는 duration waiter이고, `drawDarkSmoke(ctx, game, cam)`는 월드 인물 위/대화창 아래에서 그린다. 시간은 기존 `game.time`을 쓰며 별도 타이머나 백그라운드 루프를 만들지 않는다. `mode`, `from`, `to`, `duration`, `veil`은 컷신 데이터가 정한다. `swell/gather/cloak/transfer`는 각각 확산/응축/대상 감싸기/대상 간 이동이며 `veil`은 연기 없이 방 어둠만 유지한다.

상태는 `game.darkSmoke` 한 곳에 있고 다음 노드가 교체하면 이전 waiter는 종료된다. `{darkSmoke:null}`, `resetState`, `toTitle`, `changeMap`이 정리한다. 유지된 효과는 화자의 대사 도중에도 기존 게임 시계로 천천히 흐르며 입력을 따로 소비하지 않는다. 원본 캐릭터와 새로 생긴 캐릭터는 별도 엔티티라 연출이 플레이어를 교체하지 않는다.

`nod`는 기존 컷신 엔진의 짧은 waiter로 회전/세로 그림 오프셋만 사용하고 충돌 좌표를 바꾸지 않는다. 끝에는 처음 값을 복원한다. 장면의 변신/플래그·실체화·소멸은 컷신 데이터가 소유하며 효과 모듈은 스토리 상태를 바꾸지 않는다.
