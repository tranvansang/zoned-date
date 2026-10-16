#!/usr/bin/env bash
set -Eeuo pipefail
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# The CommonJS modules, for require(): the ES modules with require() for import and module.exports for export.
# The transform reads lines, so it accepts only these forms, at the start of a line:
# - import {a, b} from './module.mjs'
# - export default class Name, in a module without other exports
# - export const name = value, with one name and no comma, and export function name(
identifier='[A-Za-z_$][A-Za-z0-9_$]*'
importPattern="^import \{ ?$identifier(, $identifier)* ?\} from '\./($identifier)\.mjs'$"
defaultPattern="^export default class ($identifier) "
namedPattern="^export (const ($identifier) = [^,]*\$|function ($identifier)\()"
for name in shared OffsetDate ZonedDate; do
	body=
	default=
	named=
	while IFS= read -r line || [[ -n $line ]]; do
		if [[ $line =~ $importPattern ]]; then
			line="const ${line#import }"
			line="${line% from *} = require('./${BASH_REMATCH[2]}.cjs')"
		elif [[ $line =~ $defaultPattern ]]; then
			default=${BASH_REMATCH[1]}
			line=${line#export default }
		elif [[ $line =~ $namedPattern ]]; then
			named+=${named:+, }${BASH_REMATCH[2]}${BASH_REMATCH[3]}
			line=${line#export }
		elif [[ $line =~ ^[[:space:]]*(import|export)[^A-Za-z0-9_$] ]]; then
			echo "build.sh cannot convert this line of $name.mjs: $line" >&2
			exit 1
		fi
		body+=$line$'\n'
	done <"$DIR/$name.mjs"
	if [[ -n $default && -n $named ]]; then
		echo "build.sh cannot convert $name.mjs: it has a default export and other exports" >&2
		exit 1
	fi
	printf "'use strict'\n// Generated from %s.mjs by build.sh. Do not edit.\n\n%s\nmodule.exports = %s\n" $name "$body" "${default:-"{$named}"}" >"$DIR/$name.cjs"
done

# The declarations for require(): the declarations for import, which end with `export default Name`, with `export = Name`
for name in OffsetDate ZonedDate; do
	content=$(<"$DIR/$name.d.ts")
	body=${content%$'\n'export default $name}
	# exports in a namespace are indented with tabs; any other export breaks export =, and an import would make the
	# declarations for require() read the declarations for import
	if [[ $body == "$content" || $'\n'$body =~ $'\n'\ *(export|import)[^A-Za-z0-9_$] ]]; then
		echo "build.sh needs $name.d.ts to have no import and one export, export default $name, on its last line" >&2
		exit 1
	fi
	printf '// Generated from %s.d.ts by build.sh. Do not edit.\n\n%s\nexport = %s\n' $name "$body" $name >"$DIR/$name.d.cts"
done
