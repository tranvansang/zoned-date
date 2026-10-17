import {after, describe, test} from 'node:test'
import {deepStrictEqual, notStrictEqual, strictEqual, throws} from 'node:assert'
import {execFileSync} from 'node:child_process'
import {cpSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {runInNewContext} from 'node:vm'
// The package imports itself by name (package.json has an exports map), so these are the published entry points
import OffsetDate from 'zoned-date/OffsetDate'
import ZonedDate from 'zoned-date/ZonedDate'

const packageRoot = fileURLToPath(new URL('..', import.meta.url))
// Another copy of each class, as when two versions of the package are installed: the compiled package, copied into a
// temporary directory. Coverage counts only dist, which loading the same file again would skew.
const copy = mkdtempSync(join(tmpdir(), 'zoned-date-copy-'))
after(() => rmSync(copy, {recursive: true, force: true}))
cpSync(new URL('../dist', import.meta.url), copy, {recursive: true})
writeFileSync(join(copy, 'package.json'), '{"type": "module"}')
const {default: OtherOffsetDate}: {default: typeof OffsetDate} = await import(pathToFileURL(join(copy, 'OffsetDate.js')).href)
const {default: OtherZonedDate}: {default: typeof ZonedDate} = await import(pathToFileURL(join(copy, 'ZonedDate.js')).href)

describe('package entry points', () => {
	test('the package name has no entry point', () => {
		throws(() => import.meta.resolve('zoned-date'), {code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'})
		throws(() => createRequire(import.meta.url).resolve('zoned-date'), {code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'})
	})
	test('the OffsetDate and ZonedDate subpaths only default-export their class', async () => {
		for (const [specifier, expected] of [
			['zoned-date/OffsetDate', OffsetDate],
			['zoned-date/ZonedDate', ZonedDate],
		] as const) {
			const namespace = await import(specifier)
			deepStrictEqual(Object.keys(namespace), ['default'], specifier)
			strictEqual(namespace.default, expected, specifier)
		}
	})
	test('each entry point resolves to its compiled module in dist', () => {
		for (const [specifier, file] of [
			['zoned-date/OffsetDate', 'OffsetDate'],
			['zoned-date/ZonedDate', 'ZonedDate'],
		]) strictEqual(import.meta.resolve(specifier), new URL(`../dist/${file}.js`, import.meta.url).href, specifier)
	})
	test('require() gives the module namespaces where Node.js can require ES modules', {skip: !process.features.require_module}, () => {
		const require = createRequire(import.meta.url)
		strictEqual(require('zoned-date/OffsetDate').default, OffsetDate)
		strictEqual(require('zoned-date/ZonedDate').default, ZonedDate)
	})
})

describe('source', () => {
	test('runs on Node.js without a build, as it uses only erasable TypeScript', async () => {
		const {default: SourceOffsetDate} = await import('../src/OffsetDate.ts')
		const {default: SourceZonedDate} = await import('../src/ZonedDate.ts')
		strictEqual(new SourceOffsetDate('2021-09-04T05:19', {offset: 9}).toISOString(), '2021-09-03T20:19:00.000Z')
		strictEqual(new SourceZonedDate('2023-11-05T01:30', {timezone: 'America/Los_Angeles', disambiguation: 'later'}).time, Date.UTC(2023, 10, 5, 9, 30))
	})
})

describe('published files', () => {
	test('npm publishes the compiled modules with the declarations beside them, which TypeScript reads', {skip: process.platform === 'win32'}, () => {
		const [{files}]: [{files: {path: string}[]}] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {cwd: packageRoot, encoding: 'utf8'}))
		deepStrictEqual(files.map(file => file.path).sort(), [
			'README.md',
			'dist/OffsetDate.d.ts',
			'dist/OffsetDate.js',
			'dist/ZonedDate.d.ts',
			'dist/ZonedDate.js',
			'dist/shared.d.ts',
			'dist/shared.js',
			'package.json',
		])
	})
})

describe('importing the package', () => {
	test('adds no globals and leaves Date and Intl untouched', () => {
		deepStrictEqual(inFreshProcess(globalsChangedByImport), [])
	})
})

describe('another copy of the package', () => {
	const time = Date.UTC(2024, 0, 15, 12)

	test('loads other classes', () => {
		notStrictEqual(OtherOffsetDate, OffsetDate)
		notStrictEqual(OtherZonedDate, ZonedDate)
	})
	test('an OffsetDate of either copy is a Date for the other copy', () => {
		// Temporal: 2024-01-15T12:00Z is 07:00 at -05:00 and 17:30 in Asia/Kolkata (+05:30)
		for (const [label, date, expected] of [
			['new OffsetDate(other OffsetDate, {offset: -5})', new OffsetDate(new OtherOffsetDate(time, {offset: 9}), {offset: -5}), ['2024-01-15T12:00:00.000Z', '2024-01-15T07:00:00.000', -5]],
			['new ZonedDate(other OffsetDate, {timezone})', new ZonedDate(new OtherOffsetDate(time, {offset: 9}), {timezone: 'Asia/Kolkata'}), ['2024-01-15T12:00:00.000Z', '2024-01-15T17:30:00.000', 5.5]],
			['new other OffsetDate(OffsetDate, {offset: -5})', new OtherOffsetDate(new OffsetDate(time, {offset: 9}), {offset: -5}), ['2024-01-15T12:00:00.000Z', '2024-01-15T07:00:00.000', -5]],
			['new other ZonedDate(OffsetDate, {timezone})', new OtherZonedDate(new OffsetDate(time, {offset: 9}), {timezone: 'Asia/Kolkata'}), ['2024-01-15T12:00:00.000Z', '2024-01-15T17:30:00.000', 5.5]],
		] as const) deepStrictEqual(summarize(date), expected, label)
	})
	test('new OffsetDate(offsetDate) keeps the offset of an OffsetDate of the other copy', () => {
		const copy = new OffsetDate(new OtherOffsetDate(time, {offset: 9}))
		strictEqual(copy.toISOString(), '2024-01-15T12:00:00.000Z')
		strictEqual(copy.offset, 9)
	})
	test('new ZonedDate(zonedDate) keeps the instant of a ZonedDate of the other copy', () => {
		const source = new OtherZonedDate(time, {timezone: 'Asia/Tokyo'})
		const copy = new ZonedDate(source)
		strictEqual(iso(copy.time), '2024-01-15T12:00:00.000Z')
		strictEqual(copy.timezone, 'Asia/Tokyo')
		// With a timezone, a copy keeps the wallclock: 21:00 in Tokyo, then 21:00 in UTC
		strictEqual(iso(new ZonedDate(source, {timezone: 'UTC'}).time), '2024-01-15T21:00:00.000Z')
	})
	test('new ZonedDate(zonedDate) keeps the disambiguation of a ZonedDate of the other copy, and its unresolved wallclock', () => {
		const epoch = Date.UTC(2021, 8, 4, 5, 19, 52, 1)
		const copy = new ZonedDate(new OtherZonedDate(epoch, {timezone: 'Asia/Tokyo', disambiguation: 'later'}))
		strictEqual(iso(copy.time), '2021-09-04T05:19:52.001Z')
		strictEqual(copy.timezone, 'Asia/Tokyo')
		strictEqual(copy.disambiguation, 'later')
		// an unresolved 'reject' wallclock has no instant: the copy keeps the wallclock
		const unresolved = new ZonedDate(new OtherZonedDate('2023-11-05T01:30', {timezone: 'America/Los_Angeles', disambiguation: 'reject'}), {disambiguation: 'later'})
		strictEqual(iso(unresolved.time), '2023-11-05T09:30:00.000Z')
		// zoned-date 0.1.3 has no disambiguation without an options object
		const old = {
			getTime() {
				return epoch
			},
			getTimezone() {
				return 'Asia/Tokyo'
			},
			getDisambiguation() {},
		}
		// @ts-expect-error a stub, not a ZonedDate: only the methods read from a ZonedDate of 0.1.3
		strictEqual(new ZonedDate(old).disambiguation, 'compatible')
		// a copy whose getTime() throws although its disambiguation is not 'reject' gets the instant of its wallclock
		const brokenCopy = new Proxy(new OtherZonedDate('2023-11-05T01:30', {timezone: 'America/Los_Angeles', disambiguation: 'reject'}), {
			get(target, key) {
				if (key === 'getDisambiguation') return () => 'later'
				const value = Reflect.get(target, key, target)
				return typeof value === 'function' ? value.bind(target) : value
			},
		})
		strictEqual(iso(new ZonedDate(brokenCopy).time), '2023-11-05T09:30:00.000Z')
	})
})

describe('Dates from another realm', () => {
	test('new OffsetDate(date) copies a Date from a node:vm context', () => {
		const date: Date = runInNewContext('new Date(0)')
		strictEqual(new OffsetDate(date, {offset: 9}).toISOString(), '1970-01-01T00:00:00.000Z')
		strictEqual(new OffsetDate(date).toISOString(), '1970-01-01T00:00:00.000Z')
	})
	test('new ZonedDate(date) copies a Date from a node:vm context', () => {
		const date: Date = runInNewContext('new Date(0)')
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

function iso(time: number) {
	return new Date(time).toISOString()
}
function summarize(date: OffsetDate | ZonedDate) {
	return [iso(date.getTime()), wallclock(date), date.offset]
}
function wallclock(date: OffsetDate | ZonedDate) {
	return new Date(Date.UTC(
		date.fullYear, date.month, date.date, date.hours, date.minutes, date.seconds, date.milliseconds,
	)).toISOString().slice(0, -1)
}
// Runs fn(...args) in a fresh Node.js process, which has not loaded the package yet, and returns its result through JSON
function inFreshProcess<T extends unknown[]>(fn: (...args: T) => unknown, ...args: T) {
	const code = `console.log(JSON.stringify(await (${fn})(...${JSON.stringify(args)})))`
	return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '--eval', code], {cwd: packageRoot, encoding: 'utf8'}))
}
// For inFreshProcess: the keys of the global objects whose own properties importing the package adds, removes or replaces
async function globalsChangedByImport() {
	// The first scan makes Node define some lazy globals, so it is not compared.
	propertiesOfGlobals()
	const before = propertiesOfGlobals()
	await import('zoned-date/OffsetDate')
	await import('zoned-date/ZonedDate')
	const after = propertiesOfGlobals()
	return [...new Set([...before.keys(), ...after.keys()])].filter(key => !Object.is(before.get(key), after.get(key)))

	function propertiesOfGlobals() {
		const properties = new Map<string, unknown>()
		for (const [name, object] of Object.entries({
			globalThis,
			Date,
			'Date.prototype': Date.prototype,
			'Object.prototype': Object.prototype,
			Intl,
			'Intl.DateTimeFormat': Intl.DateTimeFormat,
			'Intl.DateTimeFormat.prototype': Intl.DateTimeFormat.prototype,
		})) for (const key of Reflect.ownKeys(object)) {
			const {get, value} = Object.getOwnPropertyDescriptor(object, key)!
			properties.set(`${name}.${String(key)}`, get ?? value)
		}
		return properties
	}
}
// For inFreshProcess: the time each now API gives after the package was imported while a frozen fake Date was global,
// with the fake still installed, or removed and the clock then mocked by node:test
async function nowWithFakeDate(phase: string) {
	const nativeDate = Date
	globalThis.Date = fakeDate(Date.UTC(2001, 0, 1))
	const {default: OffsetDate} = await import('zoned-date/OffsetDate')
	const {default: ZonedDate} = await import('zoned-date/ZonedDate')
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
	function fakeDate(time: number) {
		return new Proxy(nativeDate, {
			construct(target, args, newTarget) {
				return Reflect.construct(target, args.length === 0 ? [time] : args, newTarget)
			},
			get(target, key) {
				return key === 'now' ? () => time : (target as DateConstructor & Record<PropertyKey, unknown>)[key]
			},
		})
	}
	function iso(time: number) {
		return new nativeDate(time).toISOString()
	}
}
