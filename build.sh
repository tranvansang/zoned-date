#!/usr/bin/env bash
set -Eeuo pipefail

#rm -rf build
#yarn tsc --allowJs --declaration -outDir build/ --module commonjs --lib ESNext --target ESNext OffsetDate.mjs # index.mjs
#cp build/OffsetDate.d.mts OffsetDate.d.ts
#cp build/index.d.mts index.d.ts
#rm -rf build

content=$(cat OffsetDate.mjs)
content="// Generated content. Do not edit.\n\n$content"
content=${content//export default/module.exports =}
echo "$content" > OffsetDate.cjs
