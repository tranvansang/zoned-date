import {describe, test} from 'node:test'
import {deepStrictEqual, ok, strictEqual, throws} from 'node:assert'
import {execFileSync} from 'node:child_process'
import {copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {runInNewContext} from 'node:vm'
import {OffsetDate, ZonedDate} from 'zoned-date'

// The package imports itself by name (package.json has an exports map), so these are the published entry points.
const require = createRequire(import.meta.url)
const cjs = require('zoned-date')
const packageRoot = fileURLToPath(new URL('..', import.meta.url))
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

describe('package entry points', () => {
	test('importing the package name gives index.mjs, with OffsetDate and ZonedDate as named exports', async () => {
		const namespace = await import('zoned-date')
		strictEqual(namespace, await import('../index.mjs'))
		deepStrictEqual(Object.keys(namespace), ['OffsetDate', 'ZonedDate'])
	})
	test('the OffsetDate and ZonedDate subpaths default-export the classes of the package root', async () => {
		for (const [specifier, expected] of [
			['zoned-date/OffsetDate', OffsetDate],
			['zoned-date/ZonedDate', ZonedDate],
		]) {
			const namespace = await import(specifier)
			deepStrictEqual(Object.keys(namespace), ['default'], specifier)
			strictEqual(namespace.default, expected, specifier)
		}
	})
	test('requiring the package name gives both classes as named properties, without a default', () => {
		deepStrictEqual(Object.keys(cjs), ['OffsetDate', 'ZonedDate'])
		strictEqual(cjs.OffsetDate.name, 'OffsetDate')
		strictEqual(cjs.ZonedDate.name, 'ZonedDate')
	})
	test('requiring a subpath gives the class itself, the same one as the package root', () => {
		strictEqual(require('zoned-date/OffsetDate'), cjs.OffsetDate)
		strictEqual(require('zoned-date/ZonedDate'), cjs.ZonedDate)
	})
	test('import resolves to the .mjs files and require to the .cjs files', () => {
		for (const [specifier, file] of [
			['zoned-date', 'index'],
			['zoned-date/OffsetDate', 'OffsetDate'],
			['zoned-date/ZonedDate', 'ZonedDate'],
		]) {
			strictEqual(import.meta.resolve(specifier), new URL(`../${file}.mjs`, import.meta.url).href, specifier)
			strictEqual(require.resolve(specifier), fileURLToPath(new URL(`../${file}.cjs`, import.meta.url)), specifier)
		}
	})
	test('zoned-date/package.json can be required', () => {
		strictEqual(require('zoned-date/package.json').name, 'zoned-date')
	})
})

describe('published files', () => {
	test('every exports target exists and is published', () => {
		for (const [conditions, target] of exportTargets(packageJson.exports)) {
			const label = `${conditions}: ${target}`
			ok(existsSync(new URL(`../${target}`, import.meta.url)), label)
			ok(isPublished(target.replace(/^\.\//, '')), label)
		}
	})
	test('the published modules import only published files', () => {
		for (const file of packageJson.files.filter(name => /\.[cm]js$/.test(name))) {
			const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
			for (const [, specifier] of source.matchAll(/(?:from |require\()'\.\/([^']+)'/g)) ok(isPublished(specifier), `${file} loads ${specifier}`)
		}
	})
	test('main is the file that require loads for the package name', () => {
		strictEqual(fileURLToPath(new URL(`../${packageJson.main}`, import.meta.url)), require.resolve('zoned-date'))
	})
	test('a LICENSE file ships with the package', () => {
		// npm always packs a LICENSE or LICENCE file, with or without an extension
		ok(readdirSync(packageRoot).some(name => /^licen[cs]e(\..+)?$/i.test(name)))
	})

	// [subpath and conditions, target] for every target, nested conditions included
	function exportTargets(value, keys = []) {
		if (value === null) return []
		if (typeof value === 'string') return [[keys.join(' '), value]]
		return Object.entries(value).flatMap(([key, nested]) => exportTargets(nested, [...keys, key]))
	}
	// npm publishes package.json whatever files says
	function isPublished(file) {
		return file === 'package.json' || packageJson.files.includes(file)
	}
})

describe('import and require builds', () => {
	// Expected values: Temporal.ZonedDateTime and Temporal.Instant, or native Date for the overflowing setters.
	// summarize() gives [instant, wallclock, offset].
	const results = [
		['new OffsetDate(epoch, {offset: 7.5})', lib => summarize(new lib.OffsetDate(Date.UTC(2020, 1, 2, 3, 4, 5, 6), {offset: 7.5})), ['2020-02-02T03:04:05.006Z', '2020-02-02T10:34:05.006', 7.5]],
		['new OffsetDate(date, {offset: -3.5})', lib => summarize(new lib.OffsetDate(new Date(0), {offset: -3.5})), ['1970-01-01T00:00:00.000Z', '1969-12-31T20:30:00.000', -3.5]],
		['new OffsetDate(offsetDate)', lib => summarize(new lib.OffsetDate(new lib.OffsetDate(0, {offset: 5.5}))), ['1970-01-01T00:00:00.000Z', '1970-01-01T05:30:00.000', 5.5]],
		['new OffsetDate(string with a zone, {offset: -3.5})', lib => summarize(new lib.OffsetDate('2021-09-04T05:19:52.001+09:00', {offset: -3.5})), ['2021-09-03T20:19:52.001Z', '2021-09-03T16:49:52.001', -3.5]],
		['new OffsetDate(string without a zone, {offset: 11})', lib => summarize(new lib.OffsetDate('2023-10-25 01:44:59.32', {offset: 11})), ['2023-10-24T14:44:59.320Z', '2023-10-25T01:44:59.320', 11]],
		['setMonth(1) on January 31', lib => summarize(new lib.OffsetDate('2020-01-31T12:00', {offset: 9}).setMonth(1)), ['2020-03-02T03:00:00.000Z', '2020-03-02T12:00:00.000', 9]],
		['withHours(hours => hours + 13) into a leap day', lib => summarize(new lib.OffsetDate('2024-02-28T12:30', {offset: -5}).withHours(hours => hours + 13)), ['2024-02-29T06:30:00.000Z', '2024-02-29T01:30:00.000', -5]],
		['setOffset(-5) keeps the instant', lib => summarize(new lib.OffsetDate(0, {offset: 9}).setOffset(-5)), ['1970-01-01T00:00:00.000Z', '1969-12-31T19:00:00.000', -5]],
		['timezoneOffset at +05:45', lib => new lib.OffsetDate(0, {offset: 5.75}).timezoneOffset, -345],
		['toJSON()', lib => new lib.OffsetDate(Date.UTC(2020, 1, 2, 3, 4, 5, 6), {offset: 9}).toJSON(), '2020-02-02T03:04:05.006Z'],
		['day and utcDay of 2024-03-31T00:30+09:00', lib => dayAndUtcDay(new lib.OffsetDate('2024-03-31T00:30', {offset: 9})), [0, 6]],
		['new ZonedDate(epoch, {timezone})', lib => summarize(new lib.ZonedDate(1e12, {timezone: 'Asia/Tokyo'})), ['2001-09-09T01:46:40.000Z', '2001-09-09T10:46:40.000', 9]],
		['new ZonedDate(string without a zone, {timezone})', lib => summarize(new lib.ZonedDate('2021-09-04T05:19:52.001', {timezone: 'America/New_York'})), ['2021-09-04T09:19:52.001Z', '2021-09-04T05:19:52.001', -4]],
		['new ZonedDate(string with a zone, {timezone})', lib => summarize(new lib.ZonedDate('2021-09-04T05:19:52Z', {timezone: 'Asia/Kolkata'})), ['2021-09-04T05:19:52.000Z', '2021-09-04T10:49:52.000', 5.5]],
		['new ZonedDate(year, month, date, hours, minutes, {timezone})', lib => summarize(new lib.ZonedDate(2021, 8, 4, 5, 19, {timezone: 'Asia/Kathmandu'})), ['2021-09-03T23:34:00.000Z', '2021-09-04T05:19:00.000', 5.75]],
		['withTimezone keeps the wallclock', lib => summarize(new lib.ZonedDate('2021-09-04T05:19:52.001', {timezone: 'Asia/Tokyo'}).withTimezone('Europe/Paris')), ['2021-09-04T03:19:52.001Z', '2021-09-04T05:19:52.001', 2]],
		['setDate(date => date + 1) after a leap day', lib => summarize(new lib.ZonedDate('2024-02-29T23:30', {timezone: 'Australia/Lord_Howe'}).setDate(date => date + 1)), ['2024-03-01T12:30:00.000Z', '2024-03-01T23:30:00.000', 11]],
		['utcHours', lib => new lib.ZonedDate('2021-09-04T05:19', {timezone: 'Asia/Tokyo'}).utcHours, 20],
		// The fall-back folds: America/Los_Angeles repeats 01:00-02:00 (-07:00 then -08:00), Australia/ACT 02:00-03:00 (+11:00 then +10:00)
		['fold, compatible', lib => summarize(new lib.ZonedDate('2023-11-05T01:30', {timezone: 'America/Los_Angeles', disambiguation: 'compatible'})), ['2023-11-05T08:30:00.000Z', '2023-11-05T01:30:00.000', -7]],
		['fold, earlier', lib => summarize(new lib.ZonedDate('2023-11-05T01:30', {timezone: 'America/Los_Angeles', disambiguation: 'earlier'})), ['2023-11-05T08:30:00.000Z', '2023-11-05T01:30:00.000', -7]],
		['fold, later', lib => summarize(new lib.ZonedDate('2023-11-05T01:30', {timezone: 'America/Los_Angeles', disambiguation: 'later'})), ['2023-11-05T09:30:00.000Z', '2023-11-05T01:30:00.000', -8]],
		['fold east of UTC, compatible', lib => summarize(new lib.ZonedDate('2023-04-02T02:30', {timezone: 'Australia/ACT', disambiguation: 'compatible'})), ['2023-04-01T15:30:00.000Z', '2023-04-02T02:30:00.000', 11]],
		['fold east of UTC, later', lib => summarize(new lib.ZonedDate('2023-04-02T02:30', {timezone: 'Australia/ACT', disambiguation: 'later'})), ['2023-04-01T16:30:00.000Z', '2023-04-02T02:30:00.000', 10]],
		['defaults', lib => [lib.OffsetDate.defaultOffset, lib.ZonedDate.defaultTimezone, lib.ZonedDate.defaultDisambiguation], [0, 'UTC', 'compatible']],
	]
	const errors = [
		['an invalid OffsetDate string', lib => new lib.OffsetDate('2021-09-04Tnoon'), {name: 'Error', message: 'Invalid date string'}],
		['an invalid ZonedDate string', lib => new lib.ZonedDate('2021-09-04Tnoon'), {name: 'Error', message: 'Invalid date string'}],
		['reject in a gap', lib => new lib.ZonedDate('2023-03-12T02:30', {timezone: 'America/Los_Angeles', disambiguation: 'reject'}).time, {name: 'RangeError', message: 'Ambiguous time'}],
		['reject in a fold', lib => new lib.ZonedDate('2023-11-05T01:30', {timezone: 'America/Los_Angeles', disambiguation: 'reject'}).time, {name: 'RangeError', message: 'Ambiguous time'}],
		['an unknown timezone', lib => new lib.ZonedDate(0, {timezone: 'Mars/Phobos'}), {name: 'RangeError'}],
		['an unknown disambiguation', lib => new lib.ZonedDate(0, {disambiguation: 'nearest'}), {name: 'Error', message: 'Invalid disambiguation option'}],
	]
	for (const [condition, lib] of [
		['import', {OffsetDate, ZonedDate}],
		['require', cjs],
	]) {
		test(`the ${condition} build gives the expected values for constructors, parsing, setters and folds`, () => {
			for (const [label, run, expected] of results) deepStrictEqual(run(lib), expected, label)
		})
		test(`the ${condition} build throws the expected errors`, () => {
			for (const [label, run, expected] of errors) throws(() => run(lib), expected, label)
		})
	}
	test('a detached with* call throws TypeError in both builds', () => {
		for (const lib of [cjs, {OffsetDate, ZonedDate}]) {
			const {withHours} = new lib.OffsetDate(0, {offset: 9})
			throws(() => withHours(5), TypeError)
			const {withTimezone} = new lib.ZonedDate(0)
			throws(() => withTimezone('Asia/Tokyo'), TypeError)
		}
	})

	function dayAndUtcDay(date) {
		return [date.day, date.utcDay]
	}
})

describe('build.sh', () => {
	const sources = ['shared.mjs', 'OffsetDate.mjs', 'ZonedDate.mjs', 'OffsetDate.d.ts', 'ZonedDate.d.ts']
	const generated = ['shared.cjs', 'OffsetDate.cjs', 'ZonedDate.cjs', 'OffsetDate.d.cts', 'ZonedDate.d.cts']

	test('generates the committed CommonJS modules and declarations byte for byte', {skip: process.platform === 'win32'}, t => {
		const directory = copySources(t)
		execFileSync('bash', ['build.sh'], {cwd: directory})
		deepStrictEqual(readdirSync(directory).sort(), [...sources, ...generated, 'build.sh'].sort())
		// latin1 maps every byte to one character: this compares bytes and still prints a readable diff
		for (const name of generated) strictEqual(
			readFileSync(join(directory, name), 'latin1'),
			readFileSync(new URL(`../${name}`, import.meta.url), 'latin1'),
			name,
		)
	})
	test('refuses a declaration file with another export, which export = would break, or with an import', {skip: process.platform === 'win32'}, t => {
		// an import of the declarations for import would stay one in the declarations for require()
		for (const line of ['export interface Extra {}', `import type OffsetDate from './OffsetDate.js'`]) {
			const directory = copySources(t)
			const declarations = readFileSync(join(directory, 'ZonedDate.d.ts'), 'utf8')
			writeFileSync(join(directory, 'ZonedDate.d.ts'), `${line}\n${declarations}`)
			throws(() => execFileSync('bash', ['build.sh'], {cwd: directory, stdio: 'pipe'}), {status: 1}, line)
		}
	})
	test('each CommonJS module exports what its ES module exports', async () => {
		// the keys of a module namespace are sorted
		deepStrictEqual(Object.keys(require('../shared.cjs')).sort(), Object.keys(await import('../shared.mjs')))
		for (const name of ['OffsetDate', 'ZonedDate']) {
			const [required, {default: imported}] = [require(`../${name}.cjs`), await import(`../${name}.mjs`)]
			strictEqual(required.name, name)
			deepStrictEqual(Reflect.ownKeys(required), Reflect.ownKeys(imported), name)
			deepStrictEqual(Reflect.ownKeys(required.prototype), Reflect.ownKeys(imported.prototype), name)
		}
	})
	test('refuses imports and exports that it cannot convert', {skip: process.platform === 'win32'}, t => {
		for (const [file, line] of [
			['shared.mjs', 'export const a = 1, b = 2'],
			['shared.mjs', 'export {cycle}'],
			['shared.mjs', '\texport const indented = 1'],
			['OffsetDate.mjs', `import {oneHour as hour} from './shared.mjs'`],
			['OffsetDate.mjs', 'export const named = 1'],
		]) {
			const directory = copySources(t)
			writeFileSync(join(directory, file), `${readFileSync(join(directory, file), 'utf8')}\n${line}\n`)
			throws(() => execFileSync('bash', ['build.sh'], {cwd: directory, stdio: 'pipe'}), {status: 1}, `${file}: ${line}`)
		}
	})
	test('each CommonJS declaration file has one export, export =', () => {
		for (const name of ['OffsetDate', 'ZonedDate']) {
			const exports = readFileSync(new URL(`../${name}.d.cts`, import.meta.url), 'utf8').split('\n').filter(line => line.startsWith('export'))
			deepStrictEqual(exports, [`export = ${name}`], name)
		}
	})

	// A temporary directory with the files that build.sh reads, removed after the test
	function copySources(t) {
		const directory = mkdtempSync(join(tmpdir(), 'zoned-date-build-'))
		t.after(() => rmSync(directory, {recursive: true, force: true}))
		for (const name of [...sources, 'build.sh']) copyFileSync(new URL(`../${name}`, import.meta.url), join(directory, name))
		return directory
	}
})

describe('importing the package', () => {
	for (const condition of ['import', 'require']) test(`${condition} adds no globals and leaves Date and Intl untouched`, () => {
		deepStrictEqual(inFreshProcess(globalsChangedBy, condition), [])
	})
})

describe('mixing the import and require builds', () => {
	const time = Date.UTC(2024, 0, 15, 12)

	test('an OffsetDate of either build is a Date for the other build', () => {
		// Temporal: 2024-01-15T12:00Z is 07:00 at -05:00 and 17:30 in Asia/Kolkata (+05:30)
		for (const [label, date, expected] of [
			['import build, new OffsetDate(require OffsetDate, {offset: -5})', new OffsetDate(new cjs.OffsetDate(time, {offset: 9}), {offset: -5}), ['2024-01-15T12:00:00.000Z', '2024-01-15T07:00:00.000', -5]],
			['import build, new ZonedDate(require OffsetDate, {timezone})', new ZonedDate(new cjs.OffsetDate(time, {offset: 9}), {timezone: 'Asia/Kolkata'}), ['2024-01-15T12:00:00.000Z', '2024-01-15T17:30:00.000', 5.5]],
			['require build, new OffsetDate(import OffsetDate, {offset: -5})', new cjs.OffsetDate(new OffsetDate(time, {offset: 9}), {offset: -5}), ['2024-01-15T12:00:00.000Z', '2024-01-15T07:00:00.000', -5]],
			['require build, new ZonedDate(import OffsetDate, {timezone})', new cjs.ZonedDate(new OffsetDate(time, {offset: 9}), {timezone: 'Asia/Kolkata'}), ['2024-01-15T12:00:00.000Z', '2024-01-15T17:30:00.000', 5.5]],
		]) deepStrictEqual(summarize(date), expected, label)
	})
	test('new OffsetDate(offsetDate) keeps the offset of an OffsetDate from the require build', () => {
		const copy = new OffsetDate(new cjs.OffsetDate(time, {offset: 9}))
		strictEqual(copy.toISOString(), '2024-01-15T12:00:00.000Z')
		strictEqual(copy.offset, 9)
	})
	test('new ZonedDate(zonedDate) keeps the instant of a ZonedDate from the require build', () => {
		const source = new cjs.ZonedDate(time, {timezone: 'Asia/Tokyo'})
		const copy = new ZonedDate(source)
		strictEqual(iso(copy.time), '2024-01-15T12:00:00.000Z')
		strictEqual(copy.timezone, 'Asia/Tokyo')
		// With a timezone, a copy keeps the wallclock: 21:00 in Tokyo, then 21:00 in UTC
		strictEqual(iso(new ZonedDate(source, {timezone: 'UTC'}).time), '2024-01-15T21:00:00.000Z')
	})
})

describe('Dates from another realm', () => {
	test('new OffsetDate(date) copies a Date from a node:vm context', () => {
		const date = runInNewContext('new Date(0)')
		strictEqual(new OffsetDate(date, {offset: 9}).toISOString(), '1970-01-01T00:00:00.000Z')
		strictEqual(new OffsetDate(date).toISOString(), '1970-01-01T00:00:00.000Z')
	})
	test('new ZonedDate(date) copies a Date from a node:vm context', () => {
		const date = runInNewContext('new Date(0)')
		strictEqual(iso(new ZonedDate(date, {timezone: 'Asia/Tokyo'}).time), '1970-01-01T00:00:00.000Z')
		strictEqual(iso(new ZonedDate(date).time), '1970-01-01T00:00:00.000Z')
	})
})

describe('a fake Date installed before the import', () => {
	// In a fresh process, the package is first imported while a frozen fake Date at 2001-01-01T00:00Z is global.
	test('drives every now API while it is installed', () => {
		deepStrictEqual(inFreshProcess(nowWithFakeDate, 'installed'), {
			'new OffsetDate()': '2001-01-01T00:00:00.000Z',
			'OffsetDate.now()': '2001-01-01T00:00:00.000Z',
			'new ZonedDate()': '2001-01-01T00:00:00.000Z',
			'ZonedDate.now()': '2001-01-01T00:00:00.000Z',
		})
	})
	test('no longer drives the now APIs once it is removed', () => {
		// After the fake is removed, node:test mocks the clock at 2024-01-15T12:00Z.
		deepStrictEqual(inFreshProcess(nowWithFakeDate, 'removed'), {
			'new OffsetDate()': '2024-01-15T12:00:00.000Z',
			'OffsetDate.now()': '2024-01-15T12:00:00.000Z',
			'new ZonedDate()': '2024-01-15T12:00:00.000Z',
			'ZonedDate.now()': '2024-01-15T12:00:00.000Z',
		})
	})
})

function iso(time) {
	return new Date(time).toISOString()
}
function summarize(date) {
	return [iso(date.getTime()), wallclock(date), date.offset]
}
function wallclock(date) {
	return new Date(Date.UTC(
		date.fullYear, date.month, date.date, date.hours, date.minutes, date.seconds, date.milliseconds,
	)).toISOString().slice(0, -1)
}
// Runs fn(...args) in a fresh Node.js process, which has not loaded the package yet, and returns its result through JSON
function inFreshProcess(fn, ...args) {
	const code = `console.log(JSON.stringify(await (${fn})(...${JSON.stringify(args)})))`
	return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '--eval', code], {cwd: packageRoot, encoding: 'utf8'}))
}
// For inFreshProcess: the keys of the global objects whose own properties importing or requiring the package adds, removes or replaces
async function globalsChangedBy(condition) {
	const {createRequire} = await import('node:module')
	// The first scan makes Node define some lazy globals, so it is not compared.
	propertiesOfGlobals()
	const before = propertiesOfGlobals()
	if (condition === 'import') await import('zoned-date')
	else createRequire(import.meta.url)('zoned-date')
	const after = propertiesOfGlobals()
	return [...new Set([...before.keys(), ...after.keys()])].filter(key => !Object.is(before.get(key), after.get(key)))

	function propertiesOfGlobals() {
		const properties = new Map()
		for (const [name, object] of Object.entries({
			globalThis,
			Date,
			'Date.prototype': Date.prototype,
			'Object.prototype': Object.prototype,
			Intl,
			'Intl.DateTimeFormat': Intl.DateTimeFormat,
			'Intl.DateTimeFormat.prototype': Intl.DateTimeFormat.prototype,
		})) for (const key of Reflect.ownKeys(object)) {
			const {get, value} = Object.getOwnPropertyDescriptor(object, key)
			properties.set(`${name}.${String(key)}`, get ?? value)
		}
		return properties
	}
}
// For inFreshProcess: the time each now API gives after the package was imported while a frozen fake Date was global,
// with the fake still installed, or removed and the clock then mocked by node:test
async function nowWithFakeDate(phase) {
	const nativeDate = Date
	globalThis.Date = fakeDate(Date.UTC(2001, 0, 1))
	const {OffsetDate, ZonedDate} = await import('zoned-date')
	if (phase === 'removed') {
		globalThis.Date = nativeDate
		const {mock} = await import('node:test')
		mock.timers.enable({apis: ['Date'], now: Date.UTC(2024, 0, 15, 12)})
	}
	return {
		'new OffsetDate()': iso(new OffsetDate().getTime()),
		'OffsetDate.now()': iso(OffsetDate.now()),
		'new ZonedDate()': iso(new ZonedDate().time),
		'ZonedDate.now()': iso(ZonedDate.now()),
	}

	// A frozen clock like the ones fake-timer libraries install: new Date() and Date.now() return time.
	// Not node:test's mock Date: it ignores new.target, so a class that extends it constructs plain Dates.
	function fakeDate(time) {
		return new Proxy(nativeDate, {
			construct(target, args, newTarget) {
				return Reflect.construct(target, args.length === 0 ? [time] : args, newTarget)
			},
			get(target, key) {
				return key === 'now' ? () => time : target[key]
			},
		})
	}
	function iso(time) {
		return new nativeDate(time).toISOString()
	}
}
