#!/usr/bin/env bash

set -Eeuo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
output_path=${1:-"$repo_root/fame-meet-web.tar.gz"}
stage_dir=$(mktemp -d)
trap 'rm -rf "$stage_dir"' EXIT

cd "$repo_root"

required=(
    css/all.css
    index.html
    interface_config.js
    libs/app.bundle.min.js
)

for path in "${required[@]}"; do
    if [[ ! -f $path ]]; then
        echo "Required build output is missing: $path" >&2
        exit 1
    fi
done

mkdir -p "$stage_dir/web"

for directory in css fonts images lang libs resources sounds static; do
    cp -a "$directory" "$stage_dir/web/"
done

for file in ./*.html ./*.js manifest.json LICENSE; do
    [[ -f $file ]] && cp -a "$file" "$stage_dir/web/"
done

printf '%s\n' "${GITHUB_SHA:-$(git rev-parse HEAD)}" > "$stage_dir/web/DEPLOYED_COMMIT"

tar -C "$stage_dir" -czf "$output_path" web
sha256sum "$output_path" > "$output_path.sha256"
