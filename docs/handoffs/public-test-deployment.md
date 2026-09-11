# 공개 플레이 테스트 배포

대상은 기존 공개 저장소 `sionic-khope/subtarune`이며, 소스와 Git 이력도 공개된다. 플레이 주소는 <https://sionic-khope.github.io/subtarune/>다.

GitHub 저장소 Settings → Pages → Build and deployment의 Source를 **GitHub Actions**로 설정한다. `.github/workflows/publish-game.yml`이 `main` push와 수동 실행을 처리한다. PR이 `main`에 병합되면 배포되며, 아직 병합하지 않은 브랜치나 PR은 배포하지 않는다. 수동 실행도 `main`에서 실행한다. 매 실행은 최신 `main`을 체크아웃하고, 겹치는 이전 배포는 취소한다.

`tools/deploy/package-site.sh`는 빈 외부 폴더에 아래 파일만 복사한다.

- `index.html`, CSS와 스타일용 이미지·폰트, `src/editor`를 제외한 JavaScript
- `assets`의 게임 이미지·JSON·오디오·폰트 (`source`, `references`, `library`, `lib` 폴더 제외)
- 3D 서랍 장면에 필요한 `assets/lib/three.module.js`와 MIT 고지 `three.LICENSE`
- `.nojekyll`, 소스 커밋 SHA와 UTC 빌드 시각만 기록한 `version.json`

에디터 페이지, Python 개발 서버, 도구, 문서, 프롬프트, Markdown, 텍스트 파일, 저장소 이력은 Pages 산출물에 들어가지 않는다. 이 제외 규칙은 공개 저장소 자체의 파일 접근을 제한하지 않는다. 브라우저에 전달되는 JavaScript와 미디어도 공개된다. 새 실행 파일 형식이나 제외 폴더의 자산을 게임에 연결하면 패키저의 허용 목록을 함께 수정해야 한다.

로컬 패키징 확인:

```bash
site_dir=$(mktemp -d)
bash tools/deploy/package-site.sh "$site_dir"
```

Actions의 **Publish playable game** 실행이 성공한 뒤 사이트와 `/subtarune/version.json`을 확인한다. 기존 탭에는 이전 코드가 남을 수 있으므로 새로고침하며, 계속 이전 화면이면 강력 새로고침한다. 저장 데이터는 사용한 브라우저에만 남고 다른 기기·브라우저나 로컬 개발 서버와 공유되지 않는다.

별도 PAT, SSH 키, 배포 비밀값은 필요 없다. 워크플로는 해당 실행의 `GITHUB_TOKEN`과 Pages OIDC 권한을 쓴다. 자동 배포 중단은 Actions에서 워크플로를 비활성화하거나 파일을 제거한다. 사이트 게시 중단은 Settings → Pages에서 **Unpublish site**를 실행한다. 저장소의 공개 여부는 이와 별도다.

구성 근거: [GitHub 공식 Pages 사용자 지정 워크플로 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). 액션은 공식 저장소의 전체 커밋 SHA에 고정한다.
