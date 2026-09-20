#!/usr/bin/env bash
set -euo pipefail

fail() { printf 'package-site: %s\n' "$*" >&2; exit 1; }

[[ $# -eq 1 ]] || fail 'Usage: bash tools/deploy/package-site.sh /absolute/empty/output-directory'
[[ "$1" = /* && -d "$1" && ! -L "$1" ]] || fail 'Output must be an existing absolute directory, not a symlink.'
source_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd -P)
output_root=$(cd -- "$1" && pwd -P)
[[ "$output_root" != / && "$output_root" != "$source_root" ]] || fail 'Unsafe output directory.'
case "$output_root/" in "$source_root/"*) fail 'Output must be outside the source checkout.' ;; esac
[[ -z "$(find "$output_root" -mindepth 1 -print -quit)" ]] || fail 'Output directory must be empty; no files will be deleted.'

cd -- "$source_root"
for path in index.html css src assets; do
  [[ -e "$path" && ! -L "$path" ]] || fail "Missing or symlinked runtime path: $path"
done
[[ -z "$(find css src assets -type l -print -quit)" ]] || fail 'Symlinks are not permitted in runtime directories.'
source_sha=$(git rev-parse --verify HEAD)
[[ "$source_sha" =~ ^[0-9a-f]{40}$ ]] || fail 'Expected a full source commit SHA.'

copy_file() {
  local path=$1
  mkdir -p -- "$output_root/$(dirname -- "$path")"
  cp -- "$path" "$output_root/$path"
}

# 노래 영상(assets/video/*.mp4 — 리듬 게임·TV 클립)도 런타임 파일이다: 빠져 있어 배포판에서 뚜울라 노래·영상이 404 였다(BUILD271, 사용자 2026-09-20 “리듬게임에 뒤에 영상하고 그런거 안나옴”)
copy_file index.html
while IFS= read -r -d '' path; do copy_file "$path"; done < <(
  find css -type f \( -name '*.css' -o -name '*.png' -o -name '*.webp' -o -name '*.gif' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.woff' -o -name '*.woff2' -o -name '*.ttf' \) ! -path '*/.*' -print0
)
while IFS= read -r -d '' path; do copy_file "$path"; done < <(
  find src -path src/editor -prune -o -type f -name '*.js' ! -path '*/.*' -print0
)
while IFS= read -r -d '' path; do copy_file "$path"; done < <(
  find assets \( -path assets/source -o -path assets/references -o -path assets/library -o -path assets/lib \) -prune -o \
    -type f \( -name '*.png' -o -name '*.webp' -o -name '*.gif' -o -name '*.jpg' -o -name '*.jpeg' -o -name '*.json' -o -name '*.mp3' -o -name '*.ogg' -o -name '*.wav' -o -name '*.mp4' -o -name '*.webm' -o -name '*.woff' -o -name '*.woff2' -o -name '*.ttf' \) ! -path '*/.*' -print0
)

# The drawer scene imports this vendored module; retain its MIT notice.
copy_file assets/lib/three.module.js
copy_file assets/lib/three.LICENSE
copy_file assets/source/fonts253/NeoDunggeunmo-LICENSE.txt
copy_file assets/source/fonts253/Galmuri-LICENSE.txt
touch "$output_root/.nojekyll"
printf '{"sourceSha":"%s","builtAt":"%s"}\n' "$source_sha" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$output_root/version.json"
printf 'Packaged source %s into %s\n' "$source_sha" "$output_root"
