#!/usr/bin/env python3
"""OpenGateway(OpenAI 호환) 이미지 생성 클라이언트 — 섭타룬 스프라이트 raw 생성용.

사용 예:
  python3 tools/sprites/imagegen.py models --images
  python3 tools/sprites/imagegen.py generate --prompt-file p.txt --size 1024x1536 \
      --out assets/source/<작업>/<이름>-raw.png
  python3 tools/sprites/imagegen.py generate --prompt "..." --ref a.png --ref b.png --out x.png

키는 절대 출력하지 않는다. 우선순위: 환경변수 OPENGATEWAY_API_KEY → --env-file → <repo>/.env → ~/.hermes/.env
결과 옆에 <stem>.prompt.txt(실제 프롬프트·참조·모델)과 <stem>.meta.json(응답 usage 등, 키 없음)을 남긴다.
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import struct
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

DEFAULT_BASE = "https://apis.opengateway.ai/v1"
# 2026-09-14 인증 /v1/models 조회에서 status:active, endpoints:[images_generations, images_edits] 확인된 모델(providers.md)
DEFAULT_MODEL = "openai/gpt-image-2.5-sunburst"   # 2026-09-16 사용자 “2.5 안 쏘?” → 2.5-sunburst 기본(flare 는 눈 소용돌이·비율이 약해 반려)
KEY_VAR = "OPENGATEWAY_API_KEY"
REPO = Path(__file__).resolve().parents[2]
ENV_CANDIDATES = (REPO / ".env", Path.home() / ".hermes" / ".env")
IMAGE_HINTS = ("image", "dall-e", "dalle", "imagen", "flux", "stable-diffusion", "sdxl")
# 2026-09-14 실측: 참조 PNG 약1.49MB → HTTP 413, 424KB → 성공. 정확한 상한은 미확인이라 경고만 한다.
REF_WARN_BYTES = 1_000_000


def read_env_var(path: Path, var: str) -> str | None:
    """KEY=VALUE / export KEY="VALUE" 형식의 env 파일에서 var 하나만 읽는다."""
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return None
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        name, value = line.split("=", 1)
        if name.strip() != var:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        return value or None
    return None


def load_key(args: argparse.Namespace) -> str:
    var = args.key_var
    value = os.environ.get(var)
    if value:
        return value
    candidates = [Path(args.env_file)] if args.env_file else list(ENV_CANDIDATES)
    for path in candidates:
        value = read_env_var(path, var)
        if value:
            return value
    value = read_keychain(args.keychain_service)
    if value:
        return value
    searched = ", ".join(str(p) for p in candidates)
    sys.exit(f"[imagegen] {var} 를 찾지 못했습니다. 환경변수, env 파일({searched}), "
             f"또는 macOS 키체인 서비스 '{args.keychain_service}'(hermes 와 동일)에 넣어 주세요.")


def read_keychain(service: str) -> str | None:
    """macOS 키체인 generic password. hermes 의 og provider 가 쓰는 `security find-generic-password -ws <service>` 와 같다."""
    if not service or sys.platform != "darwin":
        return None
    try:
        result = subprocess.run(["security", "find-generic-password", "-ws", service],
                                capture_output=True, text=True, timeout=10, check=False)
    except (OSError, subprocess.SubprocessError):
        return None
    value = result.stdout.strip()
    return value if result.returncode == 0 and value else None


def redact(text: str, key: str) -> str:
    return text.replace(key, "***") if key else text


def http(base: str, key: str, path: str, *, json_body: dict | None = None,
         multipart: tuple[str, bytes] | None = None, method: str = "POST",
         timeout: int = 600, retries: int = 3) -> dict:
    url = base.rstrip("/") + "/" + path.lstrip("/")
    headers = {"Authorization": f"Bearer {key}", "Accept": "application/json"}
    data: bytes | None = None
    if json_body is not None:
        data = json.dumps(json_body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    elif multipart is not None:
        headers["Content-Type"], data = multipart
    last_error = ""
    for attempt in range(1, retries + 1):
        request = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", "replace")[:2000]
            last_error = f"HTTP {error.code} {path}: {redact(body, key)}"
            if error.code in (408, 409, 429, 500, 502, 503, 504) and attempt < retries:
                wait = 5 * attempt
                print(f"[imagegen] {last_error}\n[imagegen] {wait}s 후 재시도 ({attempt}/{retries})", file=sys.stderr)
                time.sleep(wait)
                continue
            sys.exit(f"[imagegen] {last_error}")
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            last_error = f"{path}: {redact(str(error), key)}"
            if attempt < retries:
                wait = 5 * attempt
                print(f"[imagegen] 네트워크 오류 {last_error}\n[imagegen] {wait}s 후 재시도 ({attempt}/{retries})", file=sys.stderr)
                time.sleep(wait)
                continue
            sys.exit(f"[imagegen] 네트워크 오류 {last_error}")
    sys.exit(f"[imagegen] {last_error}")


def encode_multipart(fields: dict[str, str], files: list[tuple[str, Path]]) -> tuple[str, bytes]:
    boundary = "----subtarune" + uuid.uuid4().hex
    chunks: list[bytes] = []
    for name, value in fields.items():
        chunks.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode("utf-8"))
    for name, path in files:
        mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        head = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"; filename=\"{path.name}\"\r\n"
                f"Content-Type: {mime}\r\n\r\n").encode("utf-8")
        chunks.append(head + path.read_bytes() + b"\r\n")
    chunks.append(f"--{boundary}--\r\n".encode("utf-8"))
    return f"multipart/form-data; boundary={boundary}", b"".join(chunks)


def png_size(data: bytes) -> tuple[int, int] | None:
    if data[:8] != b"\x89PNG\r\n\x1a\n" or len(data) < 24:
        return None
    width, height = struct.unpack(">II", data[16:24])
    return width, height


def fetch_url(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=300) as response:
        return response.read()


def cmd_models(args: argparse.Namespace) -> None:
    key = load_key(args)
    payload = http(args.base_url, key, "models", method="GET", timeout=60)
    entries = payload.get("data") or payload.get("models") or []
    ids = sorted({str(entry.get("id") or entry.get("name") or "") for entry in entries if isinstance(entry, dict)})
    if args.images:
        ids = [model_id for model_id in ids if any(hint in model_id.lower() for hint in IMAGE_HINTS)]
    if args.filter:
        ids = [model_id for model_id in ids if args.filter.lower() in model_id.lower()]
    print("\n".join(ids) if ids else "(모델 없음)")
    print(f"[imagegen] {len(ids)}개", file=sys.stderr)


def cmd_generate(args: argparse.Namespace) -> None:
    if bool(args.prompt) == bool(args.prompt_file):
        sys.exit("[imagegen] --prompt 또는 --prompt-file 중 하나만 지정합니다.")
    prompt = args.prompt if args.prompt else Path(args.prompt_file).read_text(encoding="utf-8").strip()
    refs = [Path(p) for p in (args.ref or [])]
    for ref in refs:
        if not ref.is_file():
            sys.exit(f"[imagegen] 참조 이미지가 없습니다: {ref}")
        if ref.stat().st_size > REF_WARN_BYTES:
            print(f"[imagegen] 경고: 참조 {ref.name} {ref.stat().st_size:,} bytes — 2026-09-14 실측에서 약1.49MB는 HTTP 413, "
                  f"424KB는 성공. `compose --scale`로 NEAREST 축소를 권장.", file=sys.stderr)
    if len(refs) > 1:
        sys.exit("[imagegen] 이 gateway의 images/edits 는 단일 `image` 필드만 받습니다(multipart image[]는 HTTP 400, 2026-09-14 실측). "
                 "`python3 tools/sprites/imagegen.py compose --out ref.png a.png b.png` 로 역할별 참조를 "
                 "한 장으로 합친 뒤 --ref 하나로 보내세요.")
    out = Path(args.out)
    if out.suffix.lower() != ".png":
        sys.exit("[imagegen] --out 은 .png 경로여야 합니다.")
    out.parent.mkdir(parents=True, exist_ok=True)

    fields: dict[str, str] = {"model": args.model, "prompt": prompt, "n": str(args.n)}
    if args.size:
        fields["size"] = args.size
    if args.quality:
        fields["quality"] = args.quality
    if args.background:
        fields["background"] = args.background
    if args.moderation:
        fields["moderation"] = args.moderation
    if args.output_format:
        fields["output_format"] = args.output_format
    if refs and args.fidelity:
        fields["input_fidelity"] = args.fidelity
    for extra in args.extra or []:
        if "=" not in extra:
            sys.exit(f"[imagegen] --extra 는 key=value 형식입니다: {extra}")
        name, value = extra.split("=", 1)
        fields[name.strip()] = value.strip()

    endpoint = "images/edits" if refs else "images/generations"
    if args.dry_run:
        print(json.dumps({"endpoint": endpoint, "fields": fields, "refs": [str(r) for r in refs], "out": str(out)},
                         ensure_ascii=False, indent=2))
        return

    key = load_key(args)
    started = time.time()
    if refs:
        content_type, body = encode_multipart(fields, [("image", refs[0])])
        payload = http(args.base_url, key, endpoint, multipart=(content_type, body), timeout=args.timeout)
    else:
        json_body: dict = dict(fields)
        json_body["n"] = args.n
        payload = http(args.base_url, key, endpoint, json_body=json_body, timeout=args.timeout)
    elapsed = round(time.time() - started, 1)

    items = payload.get("data") or []
    if not items:
        sys.exit(f"[imagegen] 응답에 이미지가 없습니다: {json.dumps(payload, ensure_ascii=False)[:800]}")
    written: list[dict] = []
    for index, item in enumerate(items):
        if item.get("b64_json"):
            data = base64.b64decode(item["b64_json"])
        elif item.get("url"):
            data = fetch_url(item["url"])
        else:
            sys.exit(f"[imagegen] 알 수 없는 이미지 항목: {list(item)}")
        target = out if len(items) == 1 else out.with_name(f"{out.stem}-{index + 1}{out.suffix}")
        target.write_bytes(data)
        size = png_size(data)
        written.append({"file": str(target), "bytes": len(data), "size": list(size) if size else None,
                        "revised_prompt": item.get("revised_prompt")})
        print(f"{target}  {size[0]}x{size[1]}" if size else f"{target}  (PNG 헤더 아님, {len(data)} bytes)")

    stem = out.with_suffix("")
    prompt_note = [f"# imagegen {time.strftime('%Y-%m-%d %H:%M:%S')}", f"# endpoint: {endpoint}", f"# model: {args.model}",
                   f"# size: {args.size or 'default'}  quality: {args.quality or 'default'}"]
    if refs:
        prompt_note.append("# refs: " + ", ".join(str(r) for r in refs))
    prompt_note += ["", prompt, ""]
    Path(f"{stem}.prompt.txt").write_text("\n".join(prompt_note), encoding="utf-8")
    meta = {"endpoint": endpoint, "base_url": args.base_url, "request": {k: v for k, v in fields.items() if k != "prompt"},
            "refs": [str(r) for r in refs], "elapsed_seconds": elapsed, "usage": payload.get("usage"),
            "created": payload.get("created"), "outputs": written}
    Path(f"{stem}.meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[imagegen] {elapsed}s, usage={json.dumps(payload.get('usage'))}", file=sys.stderr)


def cmd_compose(args: argparse.Namespace) -> None:
    """여러 참조 PNG를 가로로 이어 붙여 한 장으로 만든다(왼쪽부터 Image1, Image2 …). 이 gateway 의 edits 는 참조 1장만 받는다."""
    try:
        from PIL import Image
    except ImportError:
        sys.exit("[imagegen] compose 는 pillow 가 필요합니다: uv run --with pillow python3 tools/sprites/imagegen.py compose …")
    images = []
    for path in args.inputs:
        with Image.open(path) as im:
            images.append(im.convert("RGBA"))
    if args.scale != 1.0:
        images = [im.resize((max(1, round(im.width * args.scale)), max(1, round(im.height * args.scale))), Image.Resampling.NEAREST)
                  for im in images]
    gap = args.gap
    width = sum(im.width for im in images) + gap * (len(images) - 1)
    height = max(im.height for im in images)
    bg = tuple(int(args.background[i:i + 2], 16) for i in (0, 2, 4)) + (255,)
    canvas = Image.new("RGBA", (width, height), bg)
    x = 0
    for im in images:
        canvas.alpha_composite(im, (x, 0))
        x += im.width + gap
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(out, optimize=True)
    size = out.stat().st_size
    print(f"{out}  {width}x{height}  {size:,} bytes" + ("  (경고: 참조 크기 상한 근처)" if size > REF_WARN_BYTES else ""))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default=os.environ.get("OPENGATEWAY_BASE_URL", DEFAULT_BASE))
    parser.add_argument("--key-var", default=KEY_VAR, help="env 변수 이름 (기본 OPENGATEWAY_API_KEY)")
    parser.add_argument("--env-file", help="키를 읽을 env 파일 (기본: <repo>/.env → ~/.hermes/.env)")
    parser.add_argument("--keychain-service", default=os.environ.get("OPENGATEWAY_KEYCHAIN_SERVICE", "og-api-key"),
                        help="macOS 키체인 generic password 서비스 이름 (hermes og provider 와 같은 기본값 og-api-key)")
    sub = parser.add_subparsers(dest="command", required=True)

    models = sub.add_parser("models", help="사용 가능한 모델 목록")
    models.add_argument("--images", action="store_true", help="이미지 모델로 보이는 id만")
    models.add_argument("--filter", help="부분 문자열 필터")
    models.set_defaults(func=cmd_models)

    gen = sub.add_parser("generate", help="이미지 생성(참조 있으면 edits)")
    gen.add_argument("--prompt")
    gen.add_argument("--prompt-file")
    gen.add_argument("--ref", action="append", help="참조 이미지 (반복 가능, 순서 = Image1, Image2 …)")
    gen.add_argument("--out", required=True, help="저장할 PNG 경로")
    gen.add_argument("--model", default=os.environ.get("OPENGATEWAY_IMAGE_MODEL", DEFAULT_MODEL))
    gen.add_argument("--size", default="1024x1024", help="1024x1024 | 1024x1536 | 1536x1024 | auto")
    gen.add_argument("--quality", default="high", help="low | medium | high | auto (모델별)")
    gen.add_argument("--n", type=int, default=1)
    gen.add_argument("--background", choices=["transparent", "opaque", "auto"], help="gpt-image 전용, 보통 지정 안 함(마젠타 배경 사용)")
    gen.add_argument("--moderation", choices=["low", "auto"])
    gen.add_argument("--output-format", choices=["png", "jpeg", "webp"], default=None)
    gen.add_argument("--fidelity", choices=["high", "low"], default=None,
                     help="edits 시 input_fidelity. gpt-image-2 는 거부하므로 기본 미전송(gpt-image-1 계열에서만 지정)")
    gen.add_argument("--extra", action="append", help="추가 필드 key=value (모델별 파라미터)")
    gen.add_argument("--timeout", type=int, default=600)
    gen.add_argument("--dry-run", action="store_true", help="요청 내용만 출력(키 불필요)")
    gen.set_defaults(func=cmd_generate)

    comp = sub.add_parser("compose", help="참조 여러 장을 한 PNG로 가로 결합(edits 는 참조 1장만 받음)")
    comp.add_argument("inputs", nargs="+", help="왼쪽부터 Image1, Image2 … 순서")
    comp.add_argument("--out", required=True)
    comp.add_argument("--gap", type=int, default=32, help="이미지 사이 간격 px")
    comp.add_argument("--scale", type=float, default=1.0, help="NEAREST 배율(예 0.5). 413 회피용")
    comp.add_argument("--background", default="FF00FF", help="간격/여백 색 hex (기본 마젠타)")
    comp.set_defaults(func=cmd_compose)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
