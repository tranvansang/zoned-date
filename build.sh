#rm -rf build
#yarn tsc --allowJs --declaration -outDir build/ --module commonjs --lib ESNext --target ESNext dateo.mjs # index.mjs
#cp build/dateo.d.mts dateo.d.ts
#cp build/index.d.mts index.d.ts
#rm -rf build

content=$(cat dateo.mjs)
content="// Generated content. Do not edit.\n\n$content"
content=${content//export default/module.exports =}
echo "$content" > dateo.cjs
