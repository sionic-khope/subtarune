# 이미지 공급자 교체

## 실행 전에 확인

1. 선택한 서비스의 현재 카탈로그에서 정확한 모델 ID·상태·출력 image를 확인한다. 이미지 **입력/이해**만 가능한 텍스트 모델은 생성 모델이 아니다.
2. 이번 계약에 필요한 text-to-image, 실제 이미지 참조/편집, 여러 참조, 출력 치수·품질, alpha 또는 단색 배경, 결과 bytes/URL 전달 방식을 공식 요청 스키마에서 확인한다. 모델 자체 지원과 gateway가 노출한 지원을 구분한다.
3. 사용할 수 있는 API 실행 도구/자격과 사용자 허용 범위, 참조 파일 업로드 대상, 횟수·비용 상한을 정한다. 모델 추천/지침 준비는 과금 생성이나 새 서비스 업로드 승인이 아니다. 문서에 키를 쓰거나 임의의 파일에서 비밀키를 찾지 않는다.
4. 원본 공급자와 gateway가 다르면 모델명 문자열 교체만으로 호환된다고 가정하지 않는다. 생성/편집 endpoint, 이미지 첨부 형식, response와 usage 형식을 확인한 뒤 실행한다. 미지원이면 기존 승인 그림을 보존하고 필요한 기능을 명시한다. 다른 유료 서비스로 조용히 전환하지 않는다.

## 선택 경로

- **Codex 내장 이미지:** 해당 세션에서 실제 이미지 생성 도구를 확인한다. 설치된 generate2dsprite/pixel-character-sprites의 제작·처리 절차를 적용하되 공통 승인 계약은 유지한다. 호출 도구가 backend 모델·품질·usage를 숨기면 unknown으로 기록한다. Astra 같은 코딩/추론 모델 이름을 이미지 backend 이름이나 건당 비용으로 쓰지 않는다.
- **OpenAI/Gemini 등 직접 API:** 사용자 선택 모델과 현재 공식 스키마를 사용한다. 이미지 한 장부터 명시된 비용 범위 내에서 입력/출력 계약을 확인한다. 모델마다 같은 seed/quality 이름이 같은 결과를 뜻하지 않는다.
- **OpenGateway:** 아래 조사 메모는 탐색 출발점이며 배포 설정이 아니다. 실제 계정 가용성과 이미지 참조 요청이 확인된 다음에만 실행 경로로 선택한다.

## OpenGateway 조사 메모 · 2026-09-14

[공개 모델 목록](https://opengateway.ai/models)의 기본 목록에서 `openai/gpt-image-1-mini`, `openai/gpt-image-1.5`, `openai/gpt-image-2`, `openai/gpt-image-2.5-flare`, `openai/gpt-image-2.5-sunburst`, `google/gemini-3.1-flash-image`, `google/gemini-3-pro-image`, `google/gemini-2.5-flash-image`의 이미지 출력 표시를 확인했다. 이후 사용자가 기존 OG 연결 시험을 승인하여 인증 `/v1/models`를 조회했고 `openai/gpt-image-2`의 `status:active`, `input:[text,image]`, `output:[image]`, `endpoints:[images_generations,images_edits]`를 확인했다. 이는 가용성 메타데이터이며 유료 생성/참고 이미지 보존의 성공 증거와는 다르다. FLUX나 Nano Banana2 Lite의 OG 가용성은 이 목록으로 확인되지 않았다.

**주의:** [OG 이미지 문서](https://opengateway.ai/docs/reference/endpoints/images)는 non-stream `/v1/images/generations`와 텍스트 프롬프트를 설명하지만 참고 이미지/edit/mask 요청 필드를 명시하지 않는다. 공식 개요가 안내한 backend `/openapi`도 조사 때 HTTP404였다. 인증 모델 목록의 edits 표기와 OG의 OpenAI 호환 설명에 따라 표준 multipart를 시험할 수 있지만, 실제 HTTP 응답과 참조 결과를 관찰하기 전까지 해당 스키마는 미검증으로 표시한다. 임의 참조 필드를 만들어 성공했다고 기록하지 않는다.

[OG 과금](https://opengateway.ai/docs/platform/billing)은 공급자 요금과 플랫폼 수수료를 구분하며 정확한 수수료는 로그인 후 표시한다. 가격은 해당 일자의 공개 표시와 실제 usage를 별도로 기록한다. Gemini2.5 Flash Image는 OG에 보여도 [Google 가격/종료 안내](https://ai.google.dev/gemini-api/docs/pricing)의 2026-10-02 종료 공지가 있으므로 신규 장기 경로의 기본값으로 삼지 않는다. 실행 시 최신 수명주기를 다시 확인한다.

[요청 로그](https://opengateway.ai/docs/products/observability/logs)의 `job_id`와 `cost_usd`를 실제 응답/실행 시각·고유 session ID에 대조한다. `cost_usd`는 요청 전체 비용이며 모델 토큰 단가를 곱한 추정치와 구분한다. 로그 접근이 안 되면 응답 usage만 보존하고 수수료 포함 실결제액은 미확인으로 쓴다. 비용 문서의 예시 수수료를 실제 계정 수수료로 간주하지 않는다.

## 비용과 교체 판정

한 장/한 동작/캐릭터 묶음의 단위를 먼저 고정한다. 출력 토큰 단가가 낮다고 결과물 한 건이 더 싼 것은 아니다. 입력·참조·출력·별도 추론·gateway 수수료·재시도 비용을 실제 과금 형식으로 더하되, 장당 가격과 그 가격의 토큰 환산 표시를 두 번 합산하지 않는다. unknown usage를 임의 토큰 수로 채워 실측처럼 보고하지 않는다.

동일 레퍼런스로 만든 후보는 제작 계약을 그대로 통과해야 한다. 통과한 한 동작부터 선택하고 다른 승인 자산을 일괄 재생성하지 않는다. 비용 한도, 재시도 상한, 미지원 참조/과금 오류가 나오면 그 요청의 생성을 멈추고 상태를 반환한다. 키 회전·계정 변경·결제 충전은 모델 교체의 자동 후속 작업이 아니다.
