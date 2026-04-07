#!/usr/bin/env bash
set -euo pipefail

REAL_PKG_CONFIG="${PKG_CONFIG_REAL:-/usr/bin/pkg-config}"

if [[ ! -x "$REAL_PKG_CONFIG" ]]; then
    REAL_PKG_CONFIG="$(command -v pkg-config)"
fi

if [[ -z "${REAL_PKG_CONFIG:-}" ]]; then
    echo "pkg-config not found" >&2
    exit 127
fi

if "$REAL_PKG_CONFIG" --exists javascriptcoregtk-4.0 webkit2gtk-4.0; then
    exec "$REAL_PKG_CONFIG" "$@"
fi

mapped_args=()
for arg in "$@"; do
    mapped_args+=(
        "$(
            printf '%s' "$arg" | sed \
                -e 's/javascriptcoregtk-4\.0/javascriptcoregtk-4.1/g' \
                -e 's/webkit2gtk-web-extension-4\.0/webkit2gtk-web-extension-4.1/g' \
                -e 's/webkit2gtk-4\.0/webkit2gtk-4.1/g'
        )"
    )
done

exec "$REAL_PKG_CONFIG" "${mapped_args[@]}"
