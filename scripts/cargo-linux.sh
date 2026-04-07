#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPAT_LIB_DIR="${ROOT_DIR}/.cache/linux-compat/lib"

export PKG_CONFIG="${ROOT_DIR}/scripts/pkg-config-webkit-compat.sh"

mkdir -p "${COMPAT_LIB_DIR}"

if /usr/bin/pkg-config --exists webkit2gtk-4.1 javascriptcoregtk-4.1 &&
    ! /usr/bin/pkg-config --exists webkit2gtk-4.0 javascriptcoregtk-4.0; then
    WEBKIT_LIBDIR="$(/usr/bin/pkg-config --variable=libdir webkit2gtk-4.1)"
    JSCORE_LIBDIR="$(/usr/bin/pkg-config --variable=libdir javascriptcoregtk-4.1)"
    ln -sf "${WEBKIT_LIBDIR}/libwebkit2gtk-4.1.so" "${COMPAT_LIB_DIR}/libwebkit2gtk-4.0.so"
    ln -sf "${JSCORE_LIBDIR}/libjavascriptcoregtk-4.1.so" "${COMPAT_LIB_DIR}/libjavascriptcoregtk-4.0.so"
fi

export LIBRARY_PATH="${COMPAT_LIB_DIR}${LIBRARY_PATH:+:${LIBRARY_PATH}}"
export LD_LIBRARY_PATH="${COMPAT_LIB_DIR}${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}"

if [[ -f "${HOME}/.cargo/env" ]]; then
    # shellcheck disable=SC1090
    . "${HOME}/.cargo/env"
fi

exec cargo "$@"
