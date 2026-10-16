import {describe, test, type TestContext} from 'node:test'
import {deepStrictEqual, notStrictEqual, ok, strictEqual, throws} from 'node:assert'
import {runInNewContext} from 'node:vm'
import OffsetDate, {type DateLike, type OffsetDateOptions, type ValueSetter} from 'zoned-date/OffsetDate'
import ZonedDate from 'zoned-date/ZonedDate'

// Wed 2024-01-31T20:30:15.250Z, which is Thu 2024-02-01T05:30:15.250 at +09:00
const instant = Date.UTC(2024, 0, 31, 20, 30, 15, 250)
// 2023-12-31T20:30:15.250Z is 2024-01-01T02:15:15.250 at +05:45: the year, month, date, hours and minutes all differ from UTC
const newYear = Date.UTC(2023, 11, 31, 20, 30, 15, 250)
const accessors = [
	['fullYear', 'setFullYear'],
	['utcFullYear', 'setUTCFullYear'],
	['month', 'setMonth'],
	['utcMonth', 'setUTCMonth'],
	['date', 'setDate'],
	['utcDate', 'setUTCDate'],
	['hours', 'setHours'],
	['utcHours', 'setUTCHours'],
	['minutes', 'setMinutes'],
	['utcMinutes', 'setUTCMinutes'],
	['seconds', 'setSeconds'],
	['utcSeconds', 'setUTCSeconds'],
	['milliseconds', 'setMilliseconds'],
	['utcMilliseconds', 'setUTCMilliseconds'],
	['timezoneOffset', 'setTimezoneOffset'],
	['offset', 'setOffset'],
	['time', 'setTime'],
] as const

// The with* method of a set* method, as method.replace('set', 'with') names it, which TypeScript only knows as a string
type WithMethod<Method> = Method extends `set${infer Field}` ? `with${Field}` : never

// The OffsetDate constructor for the argument lists Args, which its overloads take one each: TypeScript matches a spread
// argument list to an overload only when it is a single tuple, not a union of them
interface Constructor<Args extends readonly unknown[]> {
	new (...args: [...Args]): OffsetDate
}
// The numbers of the multi-number form, which the rows of its tables satisfy before the cast to Constructor
type WallclockFields = readonly [fullYear: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, milliseconds?: number]

describe('constructor', () => {
	test('an epoch number or a Date keeps the instant and takes the offset option', () => {
		for (const [label, date, offset, expected] of [
			['an epoch', new OffsetDate(instant, {offset: 9}), 9, '2024-02-01T05:30:15.250'],
			['a Date', new OffsetDate(new Date(instant), {offset: -9.5}), -9.5, '2024-01-31T11:00:15.250'],
		] as const) {
			strictEqual(date.toISOString(), '2024-01-31T20:30:15.250Z', label)
			strictEqual(date.offset, offset, label)
			strictEqual(wallclock(date), expected, label)
		}
	})

	test('no arguments or only an options object take the default or the given offset', () => {
		strictEqual(new OffsetDate().offset, 0)
		strictEqual(new OffsetDate({offset: -9.5}).offset, -9.5)
	})

	test('a missing, undefined or null offset option uses the default offset 0', () => {
		for (const [label, date] of [
			['no options', new OffsetDate(instant)],
			['{}', new OffsetDate(instant, {})],
			['{offset: undefined}', new OffsetDate(instant, {offset: undefined})],
			['{offset: null}', new OffsetDate(instant, {offset: null})],
			['a Date without options', new OffsetDate(new Date(instant))],
		] as const) {
			strictEqual(date.offset, 0, label)
			strictEqual(wallclock(date), '2024-01-31T20:30:15.250', label)
		}
	})

	test('OffsetDate.defaultOffset is the offset of later instances without an offset option', t => {
		strictEqual(OffsetDate.defaultOffset, 0)
		const previous = OffsetDate.defaultOffset
		t.after(() => OffsetDate.defaultOffset = previous)
		const before = new OffsetDate(instant)
		OffsetDate.defaultOffset = 5.75
		for (const [label, date] of [
			['an epoch', new OffsetDate(instant)],
			['a Date', new OffsetDate(new Date(instant))],
			['{offset: null}', new OffsetDate(instant, {offset: null})],
		] as const) {
			strictEqual(date.offset, 5.75, label)
			strictEqual(wallclock(date), '2024-02-01T02:15:15.250', label)
		}
		strictEqual(new OffsetDate(instant, {offset: 0}).offset, 0)
		strictEqual(new OffsetDate(new OffsetDate(instant, {offset: 9})).offset, 9)
		strictEqual(before.offset, 0)
	})

	test('the copy constructor copies the instant and the offset into an independent object', () => {
		const source = new OffsetDate(instant, {offset: 5.75})
		const copy = new OffsetDate(source)
		notStrictEqual(copy, source)
		strictEqual(copy.toISOString(), '2024-01-31T20:30:15.250Z')
		strictEqual(copy.offset, 5.75)
		strictEqual(new OffsetDate(source, {}).offset, 5.75)
		strictEqual(new OffsetDate(source, {offset: undefined}).offset, 5.75)
		copy.setHours(0)
		copy.setOffset(-12)
		strictEqual(source.toISOString(), '2024-01-31T20:30:15.250Z')
		strictEqual(source.offset, 5.75)
	})

	test('the copy constructor with an offset option keeps the instant', () => {
		const source = new OffsetDate(instant, {offset: 9})
		for (const [offset, expected] of [
			[-5, '2024-01-31T15:30:15.250'],
			[0, '2024-01-31T20:30:15.250'],
		] as const) {
			const copy = new OffsetDate(source, {offset})
			strictEqual(copy.toISOString(), '2024-01-31T20:30:15.250Z', `offset ${offset}`)
			strictEqual(copy.offset, offset, `offset ${offset}`)
			strictEqual(wallclock(copy), expected, `offset ${offset}`)
		}
	})

	test('the multi-number form reads the numbers like Date at offset 0, two-digit years included', () => {
		// native new Date(...args) under TZ=UTC, which maps the years 0 to 99 to 1900 to 1999
		for (const [args, expected] of [
			[[2024, 1, 29, 23, 59, 59, 999], '2024-02-29T23:59:59.999Z'],
			[[2024, 1, 29], '2024-02-29T00:00:00.000Z'],
			[[2024, 12], '2025-01-01T00:00:00.000Z'],
			[[2024, 0, 0], '2023-12-31T00:00:00.000Z'],
			[[99, 0], '1999-01-01T00:00:00.000Z'],
			[[0, 0, 1], '1900-01-01T00:00:00.000Z'],
			[[100, 0], '0100-01-01T00:00:00.000Z'],
			[[-1, 0], '-000001-01-01T00:00:00.000Z'],
		] as const) {
			strictEqual(new (OffsetDate as Constructor<[...typeof args, OffsetDateOptions]>)(...args satisfies WallclockFields, {offset: 0}).toISOString(), expected, `${args}`)
			strictEqual(new (OffsetDate as Constructor<typeof args>)(...args satisfies WallclockFields).toISOString(), expected, `${args} without options`)
		}
	})

	test('the multi-number form reads the numbers as the wallclock at the offset', () => {
		// Temporal: the wallclock at the same fixed offset
		for (const [args, expectedWallclock, expectedIso] of [
			[[2020, 0, 1, {offset: 9}], '2020-01-01T00:00:00.000', '2019-12-31T15:00:00.000Z'],
			[[2020, 0, 1, 12, {offset: -9.5}], '2020-01-01T12:00:00.000', '2020-01-01T21:30:00.000Z'],
			[[2024, 1, 29, 23, 59, 59, 999, {offset: 5.75}], '2024-02-29T23:59:59.999', '2024-02-29T18:14:59.999Z'],
		] as const) {
			const date = new (OffsetDate as Constructor<typeof args>)(...args satisfies readonly [...number[], OffsetDateOptions])
			strictEqual(wallclock(date), expectedWallclock, JSON.stringify(args))
			strictEqual(date.toISOString(), expectedIso, JSON.stringify(args))
		}
	})

	test('a ZonedDate argument keeps its instant', () => {
		const zonedDate = new ZonedDate(instant, {timezone: 'Asia/Tokyo'})
		strictEqual(new OffsetDate(zonedDate).toISOString(), '2024-01-31T20:30:15.250Z')
		strictEqual(new OffsetDate(zonedDate, {offset: 9}).toISOString(), '2024-01-31T20:30:15.250Z')
	})

	test('a lone null or boolean converts to an epoch like Date', () => {
		const values: [value: number | string | Date | DateLike | null, expected: string][] = [
			[null, '1970-01-01T00:00:00.000Z'],
			// @ts-expect-error a boolean is not a declared value
			[false, '1970-01-01T00:00:00.000Z'],
			// @ts-expect-error a boolean is not a declared value
			[true, '1970-01-01T00:00:00.001Z'],
		]
		for (const [value, expected] of values) strictEqual(new OffsetDate(value).toISOString(), expected, String(value))
	})

	test('a numeric string year in the multi-number form converts like Date', () => {
		// native: Date.UTC converts every argument with ToNumber
		// @ts-expect-error the year is a numeric string, not a number
		strictEqual(new OffsetDate('2024', 5, 15, {offset: 0}).toISOString(), '2024-06-15T00:00:00.000Z')
	})

	test('an object that Date reads through valueOf converts to its epoch', () => {
		const epoch = Date.UTC(2020, 5, 15, 12)
		for (const [label, value] of [
			['a Number object', new Number(epoch)],
			// shaped like a dayjs or moment instance: valueOf on the prototype
			['a date-like object', Object.create({valueOf() { return epoch }})],
		]) {
			strictEqual(iso(new OffsetDate(value)), '2020-06-15T12:00:00.000Z', label)
			const date = new OffsetDate(value, {offset: 9})
			strictEqual(iso(date), '2020-06-15T12:00:00.000Z', `${label} with options`)
			strictEqual(date.offset, 9, `${label} with options`)
		}
	})

	test('the copy constructor treats an offset of null like a missing offset', () => {
		const copy = new OffsetDate(new OffsetDate(instant, {offset: 9}), {offset: null})
		strictEqual(copy.offset, 9)
		strictEqual(wallclock(copy), '2024-02-01T05:30:15.250')
	})

	test('an explicit undefined, or a null after other arguments, stands for a missing options object', t => {
		t.mock.timers.enable({apis: ['Date'], now: instant})
		strictEqual(iso(new OffsetDate(undefined)), '2024-01-31T20:30:15.250Z')
		for (const options of [undefined, null]) {
			const date = new OffsetDate(instant, options)
			strictEqual(iso(date), '2024-01-31T20:30:15.250Z', String(options))
			strictEqual(date.offset, 0, String(options))
		}
	})

	test('an offset that is not a finite number throws RangeError', t => {
		const offsets: number[] = [
			NaN,
			Infinity,
			// @ts-expect-error a string is not a number
			'nine',
		]
		for (const offset of offsets) {
			throws(() => new OffsetDate(instant, {offset}), RangeError, String(offset))
			throws(() => new OffsetDate(instant).setOffset(offset), RangeError, String(offset))
			throws(() => new OffsetDate(instant).setTimezoneOffset(offset), RangeError, String(offset))
		}
		const {defaultOffset} = OffsetDate
		t.after(() => OffsetDate.defaultOffset = defaultOffset)
		// @ts-expect-error the default offset is a number, not undefined
		OffsetDate.defaultOffset = undefined
		throws(() => new OffsetDate(instant), RangeError)
	})

	test('objects that Date reads through toString or valueOf are values, and other objects are options', () => {
		// native Date
		// @ts-expect-error an array is not a declared value
		strictEqual(iso(new OffsetDate(['2020-06-15'])), '2020-06-15T00:00:00.000Z')
		// @ts-expect-error a URL is not a declared value
		strictEqual(iso(new OffsetDate(new URL('https://example.com'))), 'Invalid Date')
		// @ts-expect-error the month is an array, not a number
		strictEqual(iso(new OffsetDate(2024, [5], {offset: 0})), '2024-06-01T00:00:00.000Z')
		// @ts-expect-error an object read through toString is not a declared value
		strictEqual(iso(new OffsetDate({iso: '2020-06-15', toString(this: {iso: string}) { return this.iso }}, {offset: 9})), '2020-06-15T00:00:00.000Z')
		// a class instance, an object without prototype and an object of another realm are options
		for (const [label, options] of [
			// @ts-expect-error new on a function, which TypeScript allows only on a class
			['class instance', new Options(9)],
			['null prototype', Object.assign(Object.create(null), {offset: 9})],
			['other realm', runInNewContext('({offset: 9})')],
		]) {
			const date = new OffsetDate(instant, options)
			strictEqual(iso(date), '2024-01-31T20:30:15.250Z', label)
			strictEqual(date.offset, 9, label)
		}
		// an object without a prototype is a value too when it has its own valueOf or toString
		strictEqual(iso(new OffsetDate(Object.assign(Object.create(null), {valueOf() { return 86_400_000 }}))), '1970-01-02T00:00:00.000Z')
		strictEqual(iso(new OffsetDate(Object.assign(Object.create(null), {toString() { return '2020-06-15' }}))), '2020-06-15T00:00:00.000Z')
		// so is an instance whose prototype chain ends at the prototype of a class that extends null, as the last argument too
		const stamp = Object.assign(Object.create(null), {valueOf(this: {value: number}) { return this.value }})
		stamp.constructor = Object.assign(function Stamp() {}, {prototype: stamp})
		strictEqual(iso(new OffsetDate(Object.assign(Object.create(stamp), {value: 86_400_000}))), '1970-01-02T00:00:00.000Z')
		strictEqual(iso(new OffsetDate(2021, 0, Object.assign(Object.create(stamp), {value: 5}))), '2021-01-05T00:00:00.000Z')
		// an object that only claims the Date tag is not a Date
		// @ts-expect-error Symbol.toStringTag is not an option
		strictEqual(new OffsetDate(instant, {[Symbol.toStringTag]: 'Date', offset: 9}).offset, 9)
		// Date calls valueOf once
		let calls = 0
		const counted = {
			valueOf() {
				calls++
				return instant
			},
		}
		strictEqual(iso(new OffsetDate(counted)), '2024-01-31T20:30:15.250Z')
		strictEqual(calls, 1)

		function Options(this: {offset: number}, offset: number) {
			this.offset = offset
		}
	})

	test('a BigInt throws TypeError, like Date', () => {
		// @ts-expect-error a BigInt is not a number
		throws(() => new OffsetDate(2024n, 0), TypeError)
		// @ts-expect-error a BigInt is not a number
		throws(() => new OffsetDate(instant).setHours(5n), TypeError)
		// @ts-expect-error a BigInt is not a number
		throws(() => new OffsetDate(instant).setTime(5n), TypeError)
		// @ts-expect-error a BigInt is not a number
		throws(() => new OffsetDate(instant).setYear(5n), TypeError)
		// an invalid date still converts the values of a setter
		// @ts-expect-error a BigInt is not a number
		throws(() => new OffsetDate(NaN).setHours(5n), TypeError)
		// @ts-expect-error a BigInt is not a number
		throws(() => new OffsetDate(NaN).setUTCMonth(1, 5n), TypeError)
	})

	test('a year past ±1,000,000 or a month past ±10,000,000, before truncation, gives an Invalid Date like V8', () => {
		// native Date.UTC, where the day count would bring the time back into the range
		for (const [label, date, expected] of [
			['year 2,000,001', new OffsetDate(2_000_001, 0, -730_486_000, {offset: 0}), 'Invalid Date'],
			['year 1,000,000.5', new OffsetDate(1_000_000.5, 0, -364_000_000, {offset: 0}), 'Invalid Date'],
			['year 1,000,000', new OffsetDate(1_000_000, 0, -364_000_000, {offset: 0}), '3401-11-06T00:00:00.000Z'],
			['year -1,000,001', new OffsetDate(-1_000_001, 0, 365_961_000, {offset: 0}), 'Invalid Date'],
			['month 10,000,001', new OffsetDate(1970, 10_000_001, -304_000_000, {offset: 0}), 'Invalid Date'],
			['month 10,000,000', new OffsetDate(1970, 10_000_000, -304_000_000, {offset: 0}), '2979-08-06T00:00:00.000Z'],
			['month -10,000,001', new OffsetDate(1970, -10_000_001, 304_400_000, {offset: 0}), 'Invalid Date'],
			['setUTCMonth(10,000,000.5)', new OffsetDate(0).setUTCMonth(10_000_000.5, -304_000_000), 'Invalid Date'],
		] as const) strictEqual(iso(date), expected, label)
		// before the year -399999, V8 puts some dates a day late (Date.UTC(-1_000_000, 0, 365_961_000) is 1967-03-10):
		// these follow ECMAScript
		strictEqual(iso(new OffsetDate(-1_000_000, 0, 365_961_000, {offset: 0})), '1967-03-09T00:00:00.000Z')
	})

	test('the multi-number form computes the wallclock before the range check, like Date', () => {
		// native Date.UTC: the day and the hours are each out of range, and cancel out
		strictEqual(iso(new OffsetDate(2024, 0, 1e8, -2.4e9, {offset: 0})), '2023-12-31T00:00:00.000Z')
		// native Date under TZ=Etc/GMT-9: a wallclock past the end of the range, whose instant is the last one
		strictEqual(iso(new OffsetDate(275760, 8, 13, 9, {offset: 9})), '+275760-09-13T00:00:00.000Z')
	})
})

describe('wallclock getters', () => {
	test('the wallclock accessors and get* methods read the instant at the offset', () => {
		// Temporal: Instant#toZonedDateTimeISO with the same fixed offset
		for (const [instantIso, offset, expected] of [
			['2024-01-31T20:30:15.250Z', 0, '2024-01-31T20:30:15.250'],
			['2024-01-31T20:30:15.250Z', 9, '2024-02-01T05:30:15.250'],
			['2024-01-31T20:30:15.250Z', 5.75, '2024-02-01T02:15:15.250'],
			['2024-01-31T20:30:15.250Z', -9.5, '2024-01-31T11:00:15.250'],
			['2024-01-31T20:30:15.250Z', 14, '2024-02-01T10:30:15.250'],
			['2024-01-31T20:30:15.250Z', -12, '2024-01-31T08:30:15.250'],
			['2023-12-31T10:00:00.000Z', 14, '2024-01-01T00:00:00.000'],
			['2024-01-01T11:59:59.999Z', -12, '2023-12-31T23:59:59.999'],
			['2024-02-28T18:15:00.000Z', 5.75, '2024-02-29T00:00:00.000'],
			['2100-02-28T14:00:00.000Z', 14, '2100-03-01T04:00:00.000'],
		] as const) strictEqual(wallclock(new OffsetDate(Date.parse(instantIso), {offset})), expected, `${instantIso} at ${offset}`)
		const date = new OffsetDate(instant, {offset: -9.5})
		deepStrictEqual(
			[date.getFullYear(), date.getMonth(), date.getDate(), date.getDay(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()],
			[2024, 0, 31, 3, 11, 0, 15, 250],
		)
	})
})

describe('wallclock setters', () => {
	// native Date in a zone with the same fixed offset: Etc/GMT-9, Asia/Kathmandu, Pacific/Marquesas, Etc/GMT-14, Etc/GMT+12
	test('set* and with* change one wallclock field and keep the offset', () => {
		for (const [offset, method, value, expectedWallclock, expectedIso] of [
			[5.75, 'setFullYear', 2023, '2023-02-01T02:15:15.250', '2023-01-31T20:30:15.250Z'],
			[-9.5, 'setMonth', 11, '2024-12-31T11:00:15.250', '2024-12-31T20:30:15.250Z'],
			[14, 'setDate', 29, '2024-02-29T10:30:15.250', '2024-02-28T20:30:15.250Z'],
			[-12, 'setHours', 23, '2024-01-31T23:30:15.250', '2024-02-01T11:30:15.250Z'],
			[5.75, 'setMinutes', 0, '2024-02-01T02:00:15.250', '2024-01-31T20:15:15.250Z'],
			[-9.5, 'setSeconds', 0, '2024-01-31T11:00:00.250', '2024-01-31T20:30:00.250Z'],
			[14, 'setMilliseconds', 0, '2024-02-01T10:30:15.000', '2024-01-31T20:30:15.000Z'],
		] as const) {
			const message = `${method}(${value}) at ${offset}`
			const date = new OffsetDate(instant, {offset})
			const copy = date[method.replace('set', 'with') as WithMethod<typeof method>](value)
			strictEqual(date.toISOString(), '2024-01-31T20:30:15.250Z', message)
			date[method](value)
			for (const changed of [date, copy]) {
				strictEqual(wallclock(changed), expectedWallclock, message)
				strictEqual(changed.toISOString(), expectedIso, message)
				strictEqual(changed.offset, offset, message)
			}
		}
	})

	test('set* rolls out-of-range values over and truncates fractions like Date', () => {
		for (const [offset, method, value, expectedWallclock, expectedIso] of [
			[-12, 'setMonth', 12, '2025-01-31T08:30:15.250', '2025-01-31T20:30:15.250Z'],
			[5.75, 'setMonth', -1, '2023-12-01T02:15:15.250', '2023-11-30T20:30:15.250Z'],
			[-9.5, 'setMonth', 1, '2024-03-02T11:00:15.250', '2024-03-02T20:30:15.250Z'],
			[-9.5, 'setDate', 0, '2023-12-31T11:00:15.250', '2023-12-31T20:30:15.250Z'],
			[5.75, 'setDate', 0, '2024-01-31T02:15:15.250', '2024-01-30T20:30:15.250Z'],
			[14, 'setDate', 30, '2024-03-01T10:30:15.250', '2024-02-29T20:30:15.250Z'],
			[14, 'setHours', -1, '2024-01-31T23:30:15.250', '2024-01-31T09:30:15.250Z'],
			[-12, 'setHours', -1, '2024-01-30T23:30:15.250', '2024-01-31T11:30:15.250Z'],
			[-12, 'setHours', 24, '2024-02-01T00:30:15.250', '2024-02-01T12:30:15.250Z'],
			[9, 'setMinutes', 60, '2024-02-01T06:00:15.250', '2024-01-31T21:00:15.250Z'],
			[9, 'setSeconds', -1, '2024-02-01T05:29:59.250', '2024-01-31T20:29:59.250Z'],
			[9, 'setMilliseconds', 1000, '2024-02-01T05:30:16.000', '2024-01-31T20:30:16.000Z'],
			[9, 'setHours', 5.9, '2024-02-01T05:30:15.250', '2024-01-31T20:30:15.250Z'],
		] as const) {
			const date = new OffsetDate(instant, {offset})[method](value)
			const message = `${method}(${value}) at ${offset}`
			strictEqual(wallclock(date), expectedWallclock, message)
			strictEqual(date.toISOString(), expectedIso, message)
		}
	})

	test('wallclock accessors set the field at the offset', () => {
		for (const [name, value, expected] of [
			['fullYear', 2020, '2020-01-31T11:00:15.250'],
			['month', 6, '2024-07-31T11:00:15.250'],
			['date', 1, '2024-01-01T11:00:15.250'],
			['hours', 0, '2024-01-31T00:00:15.250'],
			['minutes', 59, '2024-01-31T11:59:15.250'],
			['seconds', 30, '2024-01-31T11:00:30.250'],
			['milliseconds', 0, '2024-01-31T11:00:15.000'],
		] as const) {
			const date = new OffsetDate(instant, {offset: -9.5})
			date[name] = value
			strictEqual(wallclock(date), expected, `${name} = ${value}`)
			strictEqual(date.offset, -9.5, `${name} = ${value}`)
		}
	})
})

describe('setter forms', () => {
	test('a function receives the old wallclock value and returns the new one', () => {
		// native Date under TZ=Asia/Kathmandu (+05:45) adding 1 to the field
		for (const [name, method, expected] of [
			['fullYear', 'setFullYear', '2025-01-01T02:15:15.250'],
			['month', 'setMonth', '2024-02-01T02:15:15.250'],
			['date', 'setDate', '2024-01-02T02:15:15.250'],
			['hours', 'setHours', '2024-01-01T03:15:15.250'],
			['minutes', 'setMinutes', '2024-01-01T02:16:15.250'],
			['seconds', 'setSeconds', '2024-01-01T02:15:16.250'],
			['milliseconds', 'setMilliseconds', '2024-01-01T02:15:15.251'],
		] as const) {
			const assigned = new OffsetDate(newYear, {offset: 5.75})
			assigned[name] = value => value + 1
			strictEqual(wallclock(assigned), expected, name)
			const set = new OffsetDate(newYear, {offset: 5.75})
			set[method](value => value + 1)
			strictEqual(wallclock(set), expected, method)
		}
	})

	test('undefined and a function returning undefined leave the date unchanged', () => {
		const date = new OffsetDate(instant, {offset: 9})
		for (const [name, method] of accessors) {
			date[name] = undefined
			date[name] = () => undefined
			strictEqual(date[method](undefined), date, method)
			strictEqual(date[method](() => undefined), date, method)
			strictEqual(date[method.replace('set', 'with') as WithMethod<typeof method>](undefined).toISOString(), '2024-01-31T20:30:15.250Z', method)
			strictEqual(date.toISOString(), '2024-01-31T20:30:15.250Z', name)
			strictEqual(date.offset, 9, name)
		}
	})

	test('set* returns the instance', () => {
		// README: date.setMonth(x => x + 1).setDate(1) === date
		const date = new OffsetDate(Date.UTC(2021, 8, 4, 5, 19, 52, 1), {offset: 9})
		strictEqual(date.setMonth(x => x + 1).setDate(1), date)
		strictEqual(wallclock(date), '2021-10-01T14:19:52.001')
		for (const [, method] of accessors) strictEqual(date[method](value => value), date, method)
		strictEqual(date.toISOString(), '2021-10-01T05:19:52.001Z')
		strictEqual(date.offset, 9)
	})
})

describe('multi-argument setters', () => {
	test('set* and with* apply the extra time arguments like Date', () => {
		// native Date in a zone with the same fixed offset
		for (const [offset, method, args, expectedWallclock, expectedIso] of [
			[9, 'setHours', [25, 61, 61, 1001], '2024-02-02T02:02:02.001', '2024-02-01T17:02:02.001Z'],
			[9, 'setMinutes', [30, -1], '2024-02-01T05:29:59.250', '2024-01-31T20:29:59.250Z'],
			[9, 'setSeconds', [59, 1000], '2024-02-01T05:31:00.000', '2024-01-31T20:31:00.000Z'],
			[-9.5, 'setHours', [0, 0, 0, 0], '2024-01-31T00:00:00.000', '2024-01-31T09:30:00.000Z'],
			[5.75, 'setHours', [0, 0, 0, 0], '2024-02-01T00:00:00.000', '2024-01-31T18:15:00.000Z'],
			[14, 'setHours', [23, 59, 59, 999], '2024-02-01T23:59:59.999', '2024-02-01T09:59:59.999Z'],
			[-12, 'setMinutes', [0, 0, 0], '2024-01-31T08:00:00.000', '2024-01-31T20:00:00.000Z'],
		] as const) {
			const message = `${method}(${args}) at ${offset}`
			const date = new OffsetDate(instant, {offset})
			const copy = date[method.replace('set', 'with') as WithMethod<typeof method>](...args)
			date[method](...args)
			for (const changed of [date, copy]) {
				strictEqual(wallclock(changed), expectedWallclock, message)
				strictEqual(changed.toISOString(), expectedIso, message)
			}
		}
	})

	test('setDate and setUTCDate also take hours, minutes, seconds and milliseconds', () => {
		// native setDate then setHours under TZ=Etc/GMT-9, and native setUTCDate then setUTCHours
		const date = new OffsetDate(instant, {offset: 9})
		date.setDate(15, 13, 35, 0, 250)
		strictEqual(wallclock(date), '2024-02-15T13:35:00.250')
		strictEqual(date.toISOString(), '2024-02-15T04:35:00.250Z')
		const utc = new OffsetDate(instant, {offset: 9})
		utc.setUTCDate(1, 12)
		strictEqual(utc.toISOString(), '2024-01-01T12:30:15.250Z')
	})

	test('each extra argument accepts a function or undefined', () => {
		const date = new OffsetDate(instant, {offset: 9})
		date.setDate(15, 13, minutes => minutes + 5, undefined, 250)
		strictEqual(wallclock(date), '2024-02-15T13:35:15.250')
		date.setHours(7, undefined, 0)
		strictEqual(wallclock(date), '2024-02-15T07:35:00.250')
	})

	test('setFullYear and setMonth apply their month and date arguments like Date', () => {
		// native Date under TZ=Etc/GMT-9
		for (const [epoch, method, args, expected] of [
			[Date.UTC(2024, 0, 10), 'setFullYear', [2024, 2, 0], '2024-02-29T00:00:00.000Z'],
			// from Jan 31: setting the month before the date would overflow into March
			[Date.UTC(2021, 0, 30, 20), 'setMonth', [1, 28], '2021-02-27T20:00:00.000Z'],
			[Date.UTC(2024, 0, 10), 'setUTCFullYear', [2023, 11, 31], '2023-12-31T00:00:00.000Z'],
			[Date.UTC(2024, 0, 10), 'setUTCMonth', [1, 29], '2024-02-29T00:00:00.000Z'],
		] as const) {
			const date = new OffsetDate(epoch, {offset: 9})
			date[method](...args)
			strictEqual(date.toISOString(), expected, `${method}(${args})`)
		}
	})

	test('setHours and setUTCHours combine their arguments before the range check like Date', () => {
		// native Date under TZ=Etc/GMT-9: 2.5e9 hours and -1.5e11 minutes cancel out
		for (const [method, expected] of [
			['setHours', '2023-12-31T15:00:00.000Z'],
			['setUTCHours', '2024-01-01T00:00:00.000Z'],
		] as const) {
			const date = new OffsetDate(Date.UTC(2024, 0, 1, 3), {offset: 9})
			date[method](2.5e9, -1.5e11)
			strictEqual(iso(date), expected, method)
		}
	})

	test('setDate and setUTCDate apply the date and the time together', () => {
		// native Date.UTC(2024, 0, 1e8, -2.4e9): each is out of range, and they cancel out
		for (const method of ['setDate', 'setUTCDate'] as const) strictEqual(iso(new OffsetDate(Date.UTC(2024, 0, 1))[method](1e8, -2.4e9)), '2023-12-31T00:00:00.000Z', method)
	})
})

describe('with*', () => {
	test('with* returns a new OffsetDate and leaves the original unchanged', () => {
		// native Date under TZ=Etc/GMT-9 making the same set* call
		const date = new OffsetDate(instant, {offset: 9})
		for (const [method, argument, expectedIso, expectedOffset] of [
			['withFullYear', 2023, '2023-01-31T20:30:15.250Z', 9],
			['withUTCFullYear', (year: number) => year - 1, '2023-01-31T20:30:15.250Z', 9],
			['withMonth', 0, '2023-12-31T20:30:15.250Z', 9],
			['withUTCMonth', 2, '2024-03-31T20:30:15.250Z', 9],
			['withDate', 15, '2024-02-14T20:30:15.250Z', 9],
			['withUTCDate', 15, '2024-01-15T20:30:15.250Z', 9],
			['withHours', 0, '2024-01-31T15:30:15.250Z', 9],
			['withUTCHours', 0, '2024-01-31T00:30:15.250Z', 9],
			['withMinutes', 0, '2024-01-31T20:00:15.250Z', 9],
			['withUTCMinutes', 45, '2024-01-31T20:45:15.250Z', 9],
			['withSeconds', 0, '2024-01-31T20:30:00.250Z', 9],
			['withUTCSeconds', 59, '2024-01-31T20:30:59.250Z', 9],
			['withMilliseconds', 0, '2024-01-31T20:30:15.000Z', 9],
			['withUTCMilliseconds', 999, '2024-01-31T20:30:15.999Z', 9],
			['withTimezoneOffset', 570, '2024-01-31T20:30:15.250Z', -9.5],
			['withOffset', -12, '2024-01-31T20:30:15.250Z', -12],
			['withTime', Date.UTC(2000, 0, 1), '2000-01-01T00:00:00.000Z', 9],
		] as const) {
			const result = date[method](argument)
			ok(result instanceof OffsetDate, method)
			notStrictEqual(result, date, method)
			strictEqual(result.toISOString(), expectedIso, method)
			strictEqual(result.offset, expectedOffset, method)
			strictEqual(date.toISOString(), '2024-01-31T20:30:15.250Z', method)
			strictEqual(date.offset, 9, method)
		}
	})
})

describe('UTC fields', () => {
	test('UTC getters read the instant in UTC at any offset', () => {
		for (const offset of [9, 5.75, -9.5, 14, -12]) {
			const date = new OffsetDate(instant, {offset})
			deepStrictEqual(
				[date.utcFullYear, date.utcMonth, date.utcDate, date.utcDay, date.utcHours, date.utcMinutes, date.utcSeconds, date.utcMilliseconds],
				[2024, 0, 31, 3, 20, 30, 15, 250],
				`offset ${offset}`,
			)
			deepStrictEqual(
				[date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCDay(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()],
				[2024, 0, 31, 3, 20, 30, 15, 250],
				`offset ${offset}`,
			)
		}
	})

	test('UTC setters change UTC fields and keep the offset', () => {
		// native Date setUTC* on the same instant
		for (const [method, args, expected] of [
			['setUTCFullYear', [2023], '2023-01-31T20:30:15.250Z'],
			['setUTCMonth', [1], '2024-03-02T20:30:15.250Z'],
			['setUTCDate', [0], '2023-12-31T20:30:15.250Z'],
			['setUTCHours', [-1], '2024-01-30T23:30:15.250Z'],
			['setUTCMinutes', [0], '2024-01-31T20:00:15.250Z'],
			['setUTCSeconds', [60], '2024-01-31T20:31:00.250Z'],
			['setUTCMilliseconds', [0], '2024-01-31T20:30:15.000Z'],
			['setUTCHours', [0, 0, 0, 0], '2024-01-31T00:00:00.000Z'],
			['setUTCMinutes', [59, 59, 999], '2024-01-31T20:59:59.999Z'],
			['setUTCSeconds', [0, 0], '2024-01-31T20:30:00.000Z'],
		] as const) {
			const date = new OffsetDate(instant, {offset: 9})[method](...args)
			strictEqual(date.toISOString(), expected, `${method}(${args})`)
			strictEqual(date.offset, 9, `${method}(${args})`)
		}
	})

	test('a function passed to a UTC setter receives the old UTC value', () => {
		// native Date setUTC* adding 1 to the UTC field
		for (const [name, method, expected] of [
			['utcFullYear', 'setUTCFullYear', '2024-12-31T20:30:15.250Z'],
			['utcMonth', 'setUTCMonth', '2024-01-31T20:30:15.250Z'],
			['utcDate', 'setUTCDate', '2024-01-01T20:30:15.250Z'],
			['utcHours', 'setUTCHours', '2023-12-31T21:30:15.250Z'],
			['utcMinutes', 'setUTCMinutes', '2023-12-31T20:31:15.250Z'],
			['utcSeconds', 'setUTCSeconds', '2023-12-31T20:30:16.250Z'],
			['utcMilliseconds', 'setUTCMilliseconds', '2023-12-31T20:30:15.251Z'],
		] as const) {
			const assigned = new OffsetDate(newYear, {offset: 5.75})
			assigned[name] = value => value + 1
			strictEqual(assigned.toISOString(), expected, name)
			const set = new OffsetDate(newYear, {offset: 5.75})
			set[method](value => value + 1)
			strictEqual(set.toISOString(), expected, method)
		}
	})
})

describe('offset and timezoneOffset', () => {
	test('offset is in hours and timezoneOffset in minutes with the opposite sign', () => {
		for (const [offset, timezoneOffset] of [
			[9, -540],
			[5.5, -330],
			[5.75, -345],
			[-3.5, 210],
			[-9.5, 570],
			[14, -840],
			[-12, 720],
		]) {
			const date = new OffsetDate(instant, {offset})
			const message = `offset ${offset}`
			strictEqual(date.offset, offset, message)
			strictEqual(date.getOffset(), offset, message)
			strictEqual(date.timezoneOffset, timezoneOffset, message)
			strictEqual(date.getTimezoneOffset(), timezoneOffset, message)
			strictEqual(new OffsetDate(instant).setTimezoneOffset(timezoneOffset).offset, offset, `timezoneOffset ${timezoneOffset}`)
		}
	})

	test('setOffset and setTimezoneOffset keep the instant and move the wallclock', () => {
		// Temporal: 2024-01-31T20:30:15.250Z at each new offset
		const date = new OffsetDate(instant, {offset: 9})
		strictEqual(date.setOffset(-9.5), date)
		strictEqual(wallclock(date), '2024-01-31T11:00:15.250')
		strictEqual(date.setTimezoneOffset(-345), date)
		strictEqual(date.offset, 5.75)
		strictEqual(wallclock(date), '2024-02-01T02:15:15.250')
		date.offset = 14
		strictEqual(wallclock(date), '2024-02-01T10:30:15.250')
		date.timezoneOffset = 720
		strictEqual(date.offset, -12)
		strictEqual(wallclock(date), '2024-01-31T08:30:15.250')
		date.setTimezoneOffset(0)
		strictEqual(wallclock(date), '2024-01-31T20:30:15.250')
		strictEqual(date.toISOString(), '2024-01-31T20:30:15.250Z')
	})

	test('offset and timezoneOffset accessors pass the old value to a function', () => {
		// Temporal: 2024-01-31T20:30:15.250Z at -09:15
		const date = new OffsetDate(instant, {offset: 9})
		date.offset = offset => offset - 18.5
		strictEqual(date.offset, -9.5)
		date.timezoneOffset = minutes => minutes - 15
		strictEqual(date.timezoneOffset, 555)
		strictEqual(date.offset, -9.25)
		strictEqual(wallclock(date), '2024-01-31T11:15:15.250')
		strictEqual(date.toISOString(), '2024-01-31T20:30:15.250Z')
	})

	test('a zero offset is +0', () => {
		strictEqual(new OffsetDate(instant).offset, 0)
		strictEqual(new OffsetDate(instant, {offset: 9}).withOffset(0).offset, 0)
	})

	test('setTimezoneOffset(0) gives an offset of +0', () => {
		strictEqual(new OffsetDate(instant, {offset: 9}).setTimezoneOffset(0).offset, 0)
	})

	test('getTimezoneOffset is +0 for a zero offset like Date in UTC', () => {
		strictEqual(new OffsetDate(instant).getTimezoneOffset(), 0)
		strictEqual(new OffsetDate(instant, {offset: 0}).timezoneOffset, 0)
	})

	test('a 65-minute offset gives exact wallclock fields near 1970', () => {
		// Temporal: 1970-01-01T00:00:01Z at +01:05
		const date = new OffsetDate(1000).setTimezoneOffset(-65)
		strictEqual(wallclock(date), '1970-01-01T01:05:01.000')
		date.setMilliseconds(milliseconds => milliseconds)
		strictEqual(date.toISOString(), '1970-01-01T00:00:01.000Z')
	})
})

describe('day and utcDay', () => {
	test('day is the weekday at the offset and utcDay the weekday in UTC', () => {
		// Temporal: dayOfWeek % 7
		for (const [instantIso, offset, day, utcDay] of [
			['2024-01-31T20:30:15.250Z', 9, 4, 3],
			['2024-01-31T20:30:15.250Z', -12, 3, 3],
			['2023-12-31T10:00:00.000Z', 14, 1, 0],
			['2024-01-01T11:59:59.999Z', -12, 0, 1],
			['2024-03-10T07:30:00.000Z', -9.5, 6, 0],
		] as const) {
			const date = new OffsetDate(Date.parse(instantIso), {offset})
			const message = `${instantIso} at ${offset}`
			strictEqual(date.day, day, message)
			strictEqual(date.getDay(), day, message)
			strictEqual(date.utcDay, utcDay, message)
			strictEqual(date.getUTCDay(), utcDay, message)
		}
	})

	test('day and utcDay are read-only', () => {
		const date = new OffsetDate(instant, {offset: 9})
		// @ts-expect-error day is read-only
		throws(() => date.day = 1, TypeError)
		// @ts-expect-error utcDay is read-only
		throws(() => date.utcDay = 1, TypeError)
		strictEqual(date.day, 4)
	})
})

describe('epoch time', () => {
	test('time, setTime and withTime set the instant and keep the offset', () => {
		const date = new OffsetDate(instant, {offset: 9})
		strictEqual(date.time, instant)
		strictEqual(date.setTime(Date.UTC(2000, 0, 1)), date)
		strictEqual(date.toISOString(), '2000-01-01T00:00:00.000Z')
		strictEqual(wallclock(date), '2000-01-01T09:00:00.000')
		date.time = time => time + 1000
		strictEqual(date.toISOString(), '2000-01-01T00:00:01.000Z')
		const copy = date.withTime(0)
		strictEqual(wallclock(copy), '1970-01-01T09:00:00.000')
		strictEqual(date.toISOString(), '2000-01-01T00:00:01.000Z')
		strictEqual(date.offset, 9)
	})
})

describe('Date protocol', () => {
	test('OffsetDate extends Date and keeps its static parse and UTC', () => {
		const date = new OffsetDate(instant, {offset: 9})
		ok(date instanceof Date)
		ok(date instanceof OffsetDate)
		strictEqual(Object.prototype.toString.call(date), '[object Date]')
		strictEqual(OffsetDate.parse, Date.parse)
		strictEqual(OffsetDate.UTC, Date.UTC)
	})

	test('serialization and number conversion give the UTC instant at any offset', () => {
		for (const offset of [0, 9, 5.75, -9.5, 14, -12]) {
			const date = new OffsetDate(instant, {offset})
			const message = `offset ${offset}`
			strictEqual(date.toISOString(), '2024-01-31T20:30:15.250Z', message)
			strictEqual(date.toJSON(), '2024-01-31T20:30:15.250Z', message)
			strictEqual(JSON.parse(JSON.stringify({date})).date, '2024-01-31T20:30:15.250Z', message)
			strictEqual(date.toUTCString(), 'Wed, 31 Jan 2024 20:30:15 GMT', message)
			strictEqual(date.getTime(), instant, message)
			strictEqual(date.valueOf(), instant, message)
			strictEqual(+date, instant, message)
			strictEqual(date[Symbol.toPrimitive]('number'), instant, message)
		}
	})

	test('comparison and subtraction use the instant, not the wallclock', () => {
		const east = new OffsetDate(instant, {offset: 14})
		const west = new OffsetDate(instant + 1, {offset: -12})
		ok(east < west)
		// @ts-expect-error arithmetic on Dates, which TypeScript allows only on numbers
		strictEqual(west - east, 1)
		// @ts-expect-error arithmetic on Dates, which TypeScript allows only on numbers
		deepStrictEqual([west, east].sort((a, b) => a - b).map(date => date.offset), [14, -12])
		strictEqual(new Date(east).toISOString(), '2024-01-31T20:30:15.250Z')
	})

	test('an OffsetDate has no own enumerable keys', () => {
		deepStrictEqual(Object.keys(new OffsetDate(instant, {offset: 9})), [])
	})

	test('for...in lists no keys, like Date', () => {
		const keys = []
		for (const key in new OffsetDate(instant, {offset: 9})) keys.push(key)
		deepStrictEqual(keys, [])
	})

	test('methods and accessors have the names of class members', () => {
		strictEqual(OffsetDate.prototype.withHours.name, 'withHours')
		strictEqual(Object.getOwnPropertyDescriptor(OffsetDate.prototype, 'hours')!.get!.name, 'get hours')
		strictEqual(Object.getOwnPropertyDescriptor(OffsetDate.prototype, 'utcHours')!.set!.name, 'set utcHours')
	})

	test('a with* call on another receiver throws TypeError, like a Date method', () => {
		const {withHours} = new OffsetDate(instant, {offset: 9})
		throws(() => withHours(5), TypeError)
		throws(() => withHours.call(new Date(instant), 5), TypeError)
	})
})

describe('runtime time zone', () => {
	test('getters, setters and the multi-number form do not depend on the runtime time zone', t => {
		restoreTimezoneAfter(t)
		// Tuesday 2024-12-31T07:30Z is 2024-12-31T16:30 at +09:00. Read in the runtime zone instead, that wallclock would
		// already be 2025 in Kiritimati and Lord Howe, and the instant would still be Monday in Pago Pago.
		const start = Date.UTC(2024, 11, 31, 7, 30)
		for (const timezone of ['UTC', 'America/New_York', 'Australia/Lord_Howe', 'Asia/Kathmandu', 'Pacific/Kiritimati', 'Pacific/Pago_Pago', 'America/St_Johns']) {
			process.env.TZ = timezone
			const date = new OffsetDate(start, {offset: 9})
			strictEqual(wallclock(date), '2024-12-31T16:30:00.000', timezone)
			deepStrictEqual([date.day, date.utcDay, date.timezoneOffset], [2, 2, -540], timezone)
			// Temporal: the changed wallclock at +09:00. withMonth(6) crosses the DST changes of New York, St. John's and Lord Howe.
			for (const [method, args, expected] of [
				['withFullYear', [2023], '2023-12-31T16:30:00.000'],
				['withMonth', [6], '2024-07-31T16:30:00.000'],
				['withDate', [1], '2024-12-01T16:30:00.000'],
				['withHours', [2, 15], '2024-12-31T02:15:00.000'],
			] as const) strictEqual(wallclock(date[method](...args)), expected, `${method}(${args}) under ${timezone}`)
			strictEqual(new OffsetDate(2024, 11, 31, 16, 30, {offset: 0}).toISOString(), '2024-12-31T16:30:00.000Z', timezone)
			// In 1800 these zones, apart from UTC, used local mean time, whose offsets have seconds, such as -04:56:02 in New York
			const meanTime = new OffsetDate(Date.UTC(1800, 0, 1, 12, 0, 30, 500), {offset: 9})
			strictEqual(wallclock(meanTime), '1800-01-01T21:00:30.500', timezone)
			strictEqual(wallclock(meanTime.withSeconds(0)), '1800-01-01T21:00:00.500', timezone)
		}
	})

	test('UTC setters do not depend on the runtime time zone', t => {
		restoreTimezoneAfter(t)
		// newYear is already 2024-01-01 in Kiritimati and Kathmandu, and its minutes differ from UTC in Kathmandu and St. John's
		for (const timezone of ['Pacific/Kiritimati', 'Asia/Kathmandu', 'America/St_Johns', 'America/New_York']) {
			process.env.TZ = timezone
			const date = new OffsetDate(newYear, {offset: 9})
			// native Date setUTC* on the same instant
			for (const [method, value, expected] of [
				['withUTCFullYear', 2022, '2022-12-31T20:30:15.250Z'],
				['withUTCMonth', 0, '2023-01-31T20:30:15.250Z'],
				['withUTCDate', 1, '2023-12-01T20:30:15.250Z'],
				['withUTCHours', 0, '2023-12-31T00:30:15.250Z'],
				['withUTCMinutes', 0, '2023-12-31T20:00:15.250Z'],
			] as const) strictEqual(date[method](value).toISOString(), expected, `${method}(${value}) under ${timezone}`)
		}
	})

	test('getYear and setYear read and write the year at the offset', t => {
		restoreTimezoneAfter(t)
		process.env.TZ = 'Pacific/Kiritimati'
		// 2023-12-31T20:30:15.250Z is 2023-12-31T19:30:15.250 at -01:00 and already 2024 in Kiritimati
		const date = new OffsetDate(newYear, {offset: -1})
		strictEqual(date.getYear(), 123)
		strictEqual(iso(date.setYear(99)), '1999-12-31T20:30:15.250Z')
		strictEqual(iso(date.setYear(2010)), '2010-12-31T20:30:15.250Z')
	})
})

describe('clock', () => {

	test('new OffsetDate() and OffsetDate.now() follow a mocked clock', t => {
		t.mock.timers.enable({apis: ['Date'], now: Date.UTC(2000, 0, 1, 12)})
		strictEqual(new OffsetDate().toISOString(), '2000-01-01T12:00:00.000Z')
		const date = new OffsetDate({offset: -9.5})
		strictEqual(date.toISOString(), '2000-01-01T12:00:00.000Z')
		strictEqual(wallclock(date), '2000-01-01T02:30:00.000')
		strictEqual(new Date(OffsetDate.now()).toISOString(), '2000-01-01T12:00:00.000Z')
	})
})

describe('negative and two-digit years', () => {
	test('getters read years before 1 CE', () => {
		// Temporal: Instant#toZonedDateTimeISO with the same fixed offset
		for (const [instantIso, offset, expectedWallclock, expectedDay] of [
			['-000001-12-31T20:00:00.000Z', 9, '0000-01-01T05:00:00.000', 6],
			['0000-01-01T05:00:00.000Z', -9.5, '-0001-12-31T19:30:00.000', 5],
		] as const) {
			const date = new OffsetDate(Date.parse(instantIso), {offset})
			strictEqual(wallclock(date), expectedWallclock, `${instantIso} at ${offset}`)
			strictEqual(date.day, expectedDay, `${instantIso} at ${offset}`)
		}
	})

	test('setFullYear sets years before 100 as given, like Date', () => {
		// native Date under TZ=Etc/GMT-9 and Temporal: unlike the multi-number form, setFullYear keeps 50 as the year 50
		for (const [year, expectedWallclock, expectedIso] of [
			[-44, '-0044-02-01T05:30:15.250', '-000044-01-31T20:30:15.250Z'],
			[50, '0050-02-01T05:30:15.250', '0050-01-31T20:30:15.250Z'],
		] as const) {
			const date = new OffsetDate(instant, {offset: 9})
			date.setFullYear(year)
			strictEqual(wallclock(date), expectedWallclock, `setFullYear(${year})`)
			strictEqual(date.toISOString(), expectedIso, `setFullYear(${year})`)
		}
	})
})

describe('invalid dates and range limits', () => {
	test('an invalid instant has NaN fields and set* keeps it invalid', () => {
		const date = new OffsetDate(NaN, {offset: 9})
		ok(Number.isNaN(date.getTime()))
		ok(Number.isNaN(date.hours))
		ok(Number.isNaN(date.utcHours))
		date.setMonth(3)
		date.setHours(1)
		date.setUTCDate(1)
		ok(Number.isNaN(date.getTime()))
		strictEqual(date.offset, 9)
		// as in Date, the setters still convert their values, in order
		const converted: string[] = []
		// @ts-expect-error an object that converts to a number is not a number
		date.setHours(convertedAs('hours', 1), convertedAs('minutes', 2))
		deepStrictEqual(converted, ['hours', 'minutes'])
		ok(Number.isNaN(date.getTime()))

		// A value whose conversion is recorded in converted
		function convertedAs(name: string, value: number) {
			return {
				valueOf() {
					converted.push(name)
					return value
				},
			}
		}
	})

	test('setFullYear on an invalid instant starts from midnight at the offset like Date', () => {
		// native Date under TZ=Etc/GMT-9 and TZ=Pacific/Marquesas
		for (const [offset, expected] of [
			[9, '2019-12-31T15:00:00.000Z'],
			[-9.5, '2020-01-01T09:30:00.000Z'],
		] as const) {
			const date = new OffsetDate(NaN, {offset})
			date.setFullYear(2020)
			strictEqual(date.toISOString(), expected, `offset ${offset}`)
		}
	})

	test('a NaN argument makes the date invalid', () => {
		for (const method of ['setFullYear', 'setMonth', 'setDate', 'setHours', 'setMinutes', 'setSeconds', 'setMilliseconds', 'setUTCDate', 'setUTCHours', 'setTime'] as const) {
			const date = new OffsetDate(instant, {offset: 9})
			date[method](NaN)
			ok(Number.isNaN(date.getTime()), method)
		}
	})

	test('the first and last instants have wallclock fields when the offset points inward', () => {
		// Temporal: +275760-09-13T00:00Z at -09:00 and -271821-04-20T00:00Z at +09:00
		strictEqual(wallclock(new OffsetDate(8.64e15, {offset: -9})), '275760-09-12T15:00:00.000')
		strictEqual(wallclock(new OffsetDate(-8.64e15, {offset: 9})), '-271821-04-20T09:00:00.000')
	})

	test('setFullYear without a year keeps an invalid date invalid', () => {
		const years: ValueSetter[] = [undefined, () => undefined, year => year + 1]
		for (const year of years) strictEqual(iso(new OffsetDate(NaN, {offset: 9}).setFullYear(year)), 'Invalid Date', String(year))
		let received
		new OffsetDate(NaN).setFullYear(year => {
			received = year
		})
		ok(Number.isNaN(received))
	})

	test('setters near the ends of the range work like Date', () => {
		// native Date under TZ=Etc/GMT-9 and TZ=Etc/GMT+11
		for (const [label, date, expected] of [
			['setHours(0) from the last instant', new OffsetDate(8.64e15, {offset: 9}).setHours(0), '+275760-09-12T15:00:00.000Z'],
			['setHours(33) up to the last instant', new OffsetDate(8.64e15 - 864e5, {offset: 9}).setHours(33), '+275760-09-13T00:00:00.000Z'],
			['setHours(34) past the last instant', new OffsetDate(8.64e15 - 864e5, {offset: 9}).setHours(34), 'Invalid Date'],
			['setFullYear to the other end', new OffsetDate(8.64e15, {offset: 9}).setFullYear(-271821, 3, 20), '-271821-04-20T00:00:00.000Z'],
			['setHours(23) from the first instant', new OffsetDate(-8.64e15, {offset: -11}).setHours(23), '-271821-04-20T10:00:00.000Z'],
		] as const) strictEqual(iso(date), expected, label)
		// a fractional year is truncated first: -0.5 is the year 0
		strictEqual(new OffsetDate(Date.UTC(2024, 0, 31)).setFullYear(-0.5).fullYear, 0)
	})

	test('wallclock fields exist for every valid instant', () => {
		// native Date under TZ=Etc/GMT-9 and TZ=Etc/GMT+11
		strictEqual(wallclock(new OffsetDate(8.64e15, {offset: 9})), '275760-09-13T09:00:00.000')
		strictEqual(wallclock(new OffsetDate(-8.64e15, {offset: -11})), '-271821-04-19T13:00:00.000')
	})
})

function wallclock(date: OffsetDate) {
	return `${pad(date.fullYear, 4)}-${pad(date.month + 1, 2)}-${pad(date.date, 2)}T${pad(date.hours, 2)}:${pad(date.minutes, 2)}:${pad(date.seconds, 2)}.${pad(date.milliseconds, 3)}`
}

function pad(value: number, length: number) {
	return `${value < 0 ? '-' : ''}${String(Math.abs(value)).padStart(length, '0')}`
}

function iso(date: OffsetDate) {
	return Number.isNaN(date.getTime()) ? 'Invalid Date' : date.toISOString()
}

function restoreTimezoneAfter(t: TestContext) {
	const previous = process.env.TZ
	t.after(() => {
		if (previous === undefined) delete process.env.TZ
		else process.env.TZ = previous
	})
}
