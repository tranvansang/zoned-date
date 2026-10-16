import {deepStrictEqual, notStrictEqual, ok, strictEqual, throws} from 'node:assert'
import {describe, test, type TestContext} from 'node:test'
import OffsetDate from 'zoned-date/OffsetDate'
import ZonedDate from 'zoned-date/ZonedDate'

// 2021-09-04T05:19:52.001Z, a Saturday, far from any DST transition of the zones used below
const epoch = Date.UTC(2021, 8, 4, 5, 19, 52, 1)
// 2021-08-31T20:19:52.001Z, a Tuesday: already September 1 in Kolkata and Tokyo, so their wallclock and UTC fields differ
const monthEnd = Date.UTC(2021, 7, 31, 20, 19, 52, 1)
const oneHour = 60 * 60_000
const offsetZonesSupported = isSupportedTimezone('+09:00')

// The number arguments of the ZonedDate constructor. TypeScript cannot match a spread of varying length with one of its
// overloads, so the tables below check theirs against WallclockFields and spread them as Required<WallclockFields>.
type WallclockFields = readonly [fullYear: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, milliseconds?: number]

describe('ZonedDate constructor', () => {
	test('an epoch keeps the instant and reads the wallclock in the zone', () => {
		// Temporal: Instant.fromEpochMilliseconds(epoch).toZonedDateTimeISO(timezone)
		for (const [timezone, wallclock] of [
			['UTC', '2021-09-04T05:19:52.001'],
			['Asia/Tokyo', '2021-09-04T14:19:52.001'],
			['Asia/Kathmandu', '2021-09-04T11:04:52.001'],
			['Pacific/Kiritimati', '2021-09-04T19:19:52.001'],
			['Pacific/Marquesas', '2021-09-03T19:49:52.001'],
			['Etc/GMT+12', '2021-09-03T17:19:52.001'],
		]) {
			const zd = new ZonedDate(epoch, {timezone})
			strictEqual(zd.timezone, timezone, timezone)
			strictEqual(wallclockOf(zd), wallclock, timezone)
			strictEqual(zd.time, epoch, timezone)
		}
	})

	test('a Date or an OffsetDate keeps the instant', () => {
		const fromDate = new ZonedDate(new Date(epoch), {timezone: 'Asia/Kolkata'})
		strictEqual(wallclockOf(fromDate), '2021-09-04T10:49:52.001')
		strictEqual(fromDate.time, epoch)

		const fromOffsetDate = new ZonedDate(new OffsetDate(epoch, {offset: 3}), {timezone: 'Asia/Tokyo'})
		strictEqual(wallclockOf(fromOffsetDate), '2021-09-04T14:19:52.001')
		strictEqual(fromOffsetDate.time, epoch)

		const withoutOptions = new ZonedDate(new Date(epoch))
		strictEqual(withoutOptions.timezone, 'UTC')
		strictEqual(withoutOptions.time, epoch)
	})

	test('numbers are a wallclock in the zone and overflow like Date', () => {
		// Temporal: PlainDateTime.toZonedDateTime(timezone) of the Date.UTC result
		for (const [args, timezone, wallclock, instant] of [
			[[2021, 8, 4, 14, 19, 52, 1], 'Asia/Tokyo', '2021-09-04T14:19:52.001', '2021-09-04T05:19:52.001Z'],
			[[2020, 0, 31, 25, 0], 'Asia/Tokyo', '2020-02-01T01:00:00.000', '2020-01-31T16:00:00.000Z'],
			[[2021, 0, 1, -1], 'Asia/Kathmandu', '2020-12-31T23:00:00.000', '2020-12-31T17:15:00.000Z'],
			[[2021, 1], 'Etc/GMT+12', '2021-02-01T00:00:00.000', '2021-02-01T12:00:00.000Z'],
			[[2021, 11, 31, 23, 59, 59, 999], 'Pacific/Kiritimati', '2021-12-31T23:59:59.999', '2021-12-31T09:59:59.999Z'],
		] as const) {
			const zd = new ZonedDate(...args satisfies WallclockFields as Required<WallclockFields>, {timezone})
			strictEqual(wallclockOf(zd), wallclock, `${args} ${timezone}`)
			strictEqual(instantOf(zd), instant, `${args} ${timezone}`)
		}
	})

	test('a copy keeps the timezone, the wallclock and the instant', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Kathmandu'})
		const copy = new ZonedDate(zd)
		notStrictEqual(copy, zd)
		strictEqual(copy.timezone, 'Asia/Kathmandu')
		strictEqual(wallclockOf(copy), '2021-09-04T11:04:52.001')
		strictEqual(copy.time, epoch)

		copy.setHours(0)
		strictEqual(zd.time, epoch)
	})

	test('a string without an offset is a wallclock in the zone', () => {
		strictEqual(instantOf(new ZonedDate('2021-09-04T05:19:52.001', {timezone: 'Etc/GMT+11'})), '2021-09-04T16:19:52.001Z')
		strictEqual(instantOf(new ZonedDate('2021-09-04', {timezone: 'Asia/Tokyo'})), '2021-09-03T15:00:00.000Z')
	})

	test('a string with an offset fixes the instant', () => {
		const zd = new ZonedDate('2021-09-04T05:19:52.001+09:00', {timezone: 'Asia/Kathmandu'})
		strictEqual(instantOf(zd), '2021-09-03T20:19:52.001Z')
		strictEqual(wallclockOf(zd), '2021-09-04T02:04:52.001')
	})

	test('no time argument reads the current time', t => {
		t.mock.timers.enable({apis: ['Date'], now: Date.parse('2030-06-15T12:00:00.000Z')})
		const zd = new ZonedDate()
		strictEqual(zd.timezone, 'UTC')
		strictEqual(instantOf(zd), '2030-06-15T12:00:00.000Z')

		// Temporal: 2030-06-16T02:00:00+14:00[Pacific/Kiritimati]
		const kiritimati = new ZonedDate({timezone: 'Pacific/Kiritimati'})
		strictEqual(wallclockOf(kiritimati), '2030-06-16T02:00:00.000')
		strictEqual(instantOf(kiritimati), '2030-06-15T12:00:00.000Z')
	})
})

describe('ZonedDate options', () => {
	test('the timezone and disambiguation options are kept', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo', disambiguation: 'later'})
		strictEqual(zd.timezone, 'Asia/Tokyo')
		strictEqual(zd.getTimezone(), 'Asia/Tokyo')
		strictEqual(zd.disambiguation, 'later')
		strictEqual(zd.getDisambiguation(), 'later')
	})

	test('empty, undefined and null option values use the defaults', () => {
		for (const [label, options] of [
			['empty', {}],
			['undefined values', {timezone: undefined, disambiguation: undefined}],
			['null values', {timezone: null, disambiguation: null}],
		] as const) {
			const zd = new ZonedDate(epoch, options)
			strictEqual(zd.timezone, 'UTC', label)
			strictEqual(zd.disambiguation, 'compatible', label)
			strictEqual(zd.time, epoch, label)
		}
	})

	test('defaultTimezone and defaultDisambiguation apply when the options omit them', t => {
		restoreDefaults(t)
		ZonedDate.defaultTimezone = 'Asia/Tokyo'
		ZonedDate.defaultDisambiguation = 'later'

		const zd = new ZonedDate(epoch, {})
		strictEqual(zd.timezone, 'Asia/Tokyo')
		strictEqual(zd.disambiguation, 'later')
		strictEqual(wallclockOf(zd), '2021-09-04T14:19:52.001')
		strictEqual(new ZonedDate(epoch).timezone, 'Asia/Tokyo')
		strictEqual(new ZonedDate(epoch, {timezone: 'UTC'}).disambiguation, 'later')
		strictEqual(instantOf(new ZonedDate(2021, 8, 4, 14, 19, 52, 1)), '2021-09-04T05:19:52.001Z')
		strictEqual(instantOf(new ZonedDate('2021-09-04T14:19:52.001', {})), '2021-09-04T05:19:52.001Z')
	})

	test('a copy takes the timezone and disambiguation options', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo'})
		strictEqual(new ZonedDate(zd, {timezone: undefined}).timezone, 'Asia/Tokyo')
		strictEqual(new ZonedDate(zd, {disambiguation: 'earlier'}).disambiguation, 'earlier')
	})

	test('an explicit undefined or null options argument is ignored', () => {
		for (const options of [undefined, null]) {
			const zd = new ZonedDate(epoch, options)
			strictEqual(zd.timezone, 'UTC', String(options))
			strictEqual(instantOf(zd), '2021-09-04T05:19:52.001Z', String(options))
		}
	})

	test('new ZonedDate(undefined) reads the current time like new ZonedDate()', t => {
		t.mock.timers.enable({apis: ['Date'], now: Date.parse('2030-06-15T12:00:00.000Z')})
		const zd = new ZonedDate(undefined)
		strictEqual(zd.timezone, 'UTC')
		strictEqual(instantOf(zd), '2030-06-15T12:00:00.000Z')
	})

	test('without an options object the default disambiguation applies', t => {
		restoreDefaults(t)
		strictEqual(new ZonedDate(epoch).disambiguation, 'compatible')

		ZonedDate.defaultDisambiguation = 'later'
		strictEqual(new ZonedDate(epoch).disambiguation, 'later')
		strictEqual(new ZonedDate(2021, 8, 4).disambiguation, 'later')
	})

	test('a copy treats null option values as missing and keeps its own', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo', disambiguation: 'later'})
		strictEqual(new ZonedDate(zd, {timezone: null}).timezone, 'Asia/Tokyo')
		strictEqual(new ZonedDate(zd, {disambiguation: null}).disambiguation, 'later')
	})

	test('new ZonedDate() truncates a fractional clock, like Date', t => {
		t.mock.timers.enable({apis: ['Date'], now: 1_700_000_000_000})
		t.mock.timers.tick(0.5)
		strictEqual(new ZonedDate().time, 1_700_000_000_000)
	})
})

describe('ZonedDate statics', () => {
	test('the defaults are UTC and compatible', () => {
		strictEqual(ZonedDate.defaultTimezone, 'UTC')
		strictEqual(ZonedDate.defaultDisambiguation, 'compatible')
	})

	test('UTC and parse work like Date.UTC and Date.parse', () => {
		strictEqual(new Date(ZonedDate.UTC(2021, 8, 4, 5, 19, 52, 1)).toISOString(), '2021-09-04T05:19:52.001Z')
		strictEqual(new Date(ZonedDate.parse('2021-09-04T05:19:52.001Z')).toISOString(), '2021-09-04T05:19:52.001Z')
	})

	test('now returns the current epoch like Date.now', () => {
		const before = Date.now()
		const now = ZonedDate.now()
		const after = Date.now()
		strictEqual(typeof now, 'number')
		ok(before <= now && now <= after, `${before} <= ${now} <= ${after}`)
	})

	test('now follows a mocked clock', t => {
		t.mock.timers.enable({apis: ['Date'], now: Date.parse('2030-06-15T12:00:00.000Z')})
		strictEqual(new Date(ZonedDate.now()).toISOString(), '2030-06-15T12:00:00.000Z')
	})
})

describe('ZonedDate wallclock fields', () => {
	test('getters read the wallclock in the zone', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Kathmandu'})
		for (const [field, getter, value] of [
			['fullYear', 'getFullYear', 2021],
			['month', 'getMonth', 8],
			['date', 'getDate', 4],
			['hours', 'getHours', 11],
			['minutes', 'getMinutes', 4],
			['seconds', 'getSeconds', 52],
			['milliseconds', 'getMilliseconds', 1],
		] as const) {
			strictEqual(zd[field], value, field)
			strictEqual(zd[getter](), value, getter)
		}
	})

	test('with* returns a changed copy and set* changes the instance and returns it', () => {
		// Temporal: ZonedDateTime.with(field) on 2021-09-04T10:49:52.001+05:30[Asia/Kolkata]
		for (const [field, value, wallclock, instant] of [
			['FullYear', 2020, '2020-09-04T10:49:52.001', '2020-09-04T05:19:52.001Z'],
			['Month', 0, '2021-01-04T10:49:52.001', '2021-01-04T05:19:52.001Z'],
			['Date', 30, '2021-09-30T10:49:52.001', '2021-09-30T05:19:52.001Z'],
			['Hours', 23, '2021-09-04T23:49:52.001', '2021-09-04T18:19:52.001Z'],
			['Minutes', 0, '2021-09-04T10:00:52.001', '2021-09-04T04:30:52.001Z'],
			['Seconds', 0, '2021-09-04T10:49:00.001', '2021-09-04T05:19:00.001Z'],
			['Milliseconds', 999, '2021-09-04T10:49:52.999', '2021-09-04T05:19:52.999Z'],
		] as const) {
			const zd = new ZonedDate(epoch, {timezone: 'Asia/Kolkata'})
			const copy = zd[`with${field}`](value)
			notStrictEqual(copy, zd, field)
			strictEqual(copy.timezone, 'Asia/Kolkata', field)
			strictEqual(wallclockOf(copy), wallclock, field)
			strictEqual(instantOf(copy), instant, field)
			strictEqual(zd.time, epoch, field)

			strictEqual(zd[`set${field}`](value), zd, field)
			strictEqual(wallclockOf(zd), wallclock, field)
			strictEqual(instantOf(zd), instant, field)
		}
	})

	test('the accessors take a value, a function or undefined', () => {
		// the README forms: fullYear = y => y + 1, = 2020, = undefined, = () => undefined
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Kolkata'})
		zd.fullYear = year => year + 1
		strictEqual(zd.fullYear, 2022)
		zd.fullYear = 2020
		strictEqual(zd.fullYear, 2020)
		zd.fullYear = undefined
		zd.fullYear = () => undefined
		strictEqual(wallclockOf(zd), '2020-09-04T10:49:52.001')
		strictEqual(zd.setSeconds(undefined), zd)
		strictEqual(wallclockOf(zd), '2020-09-04T10:49:52.001')
	})

	test('function setters receive the current value of their field', () => {
		// native Date: the field plus one, on 2021-09-01T01:49:52.001+05:30 or on 2021-08-31T20:19:52.001Z
		const fields = [
			['fullYear', 2021, '2022-08-31T20:19:52.001Z'],
			['month', 8, '2021-09-30T20:19:52.001Z'],
			['date', 1, '2021-09-01T20:19:52.001Z'],
			['hours', 1, '2021-08-31T21:19:52.001Z'],
			['minutes', 49, '2021-08-31T20:20:52.001Z'],
			['seconds', 52, '2021-08-31T20:19:53.001Z'],
			['milliseconds', 1, '2021-08-31T20:19:52.002Z'],
			['utcFullYear', 2021, '2022-08-31T20:19:52.001Z'],
			['utcMonth', 7, '2021-10-01T20:19:52.001Z'],
			['utcDate', 31, '2021-09-01T20:19:52.001Z'],
			['utcHours', 20, '2021-08-31T21:19:52.001Z'],
			['utcMinutes', 19, '2021-08-31T20:20:52.001Z'],
			['utcSeconds', 52, '2021-08-31T20:19:53.001Z'],
			['utcMilliseconds', 1, '2021-08-31T20:19:52.002Z'],
		] as const
		for (const [field, current, instant] of fields) {
			const zd = new ZonedDate(monthEnd, {timezone: 'Asia/Kolkata'})
			strictEqual(increment(zd, field), current, field)
			strictEqual(instantOf(zd), instant, field)
		}

		// the wallclock year is not the UTC year, east and west of UTC
		// Temporal: 2023-01-01T01:49:52.001+05:30 and 2022-12-31T18:00:00-12:00
		for (const [instant, timezone, current, expected] of [
			['2021-12-31T20:19:52.001Z', 'Asia/Kolkata', 2022, '2022-12-31T20:19:52.001Z'],
			['2022-01-01T06:00:00.000Z', 'Etc/GMT+12', 2021, '2023-01-01T06:00:00.000Z'],
		] as const) {
			const zd = new ZonedDate(Date.parse(instant), {timezone})
			strictEqual(increment(zd, 'fullYear'), current, timezone)
			strictEqual(instantOf(zd), expected, timezone)
		}

		function increment(zd: ZonedDate, field: typeof fields[number][0]) {
			let seen: number | undefined
			zd[field] = value => {
				seen = value
				return value + 1
			}
			return seen
		}
	})

	test('setters overflow like Date', () => {
		// native Date: the same setUTC* call on the wallclock; Temporal for the instant
		for (const [label, start, timezone, update, wallclock, instant] of [
			['setMonth(1) on January 31', [2021, 0, 31, 12], 'Asia/Tokyo', (zd: ZonedDate) => zd.setMonth(1), '2021-03-03T12:00:00.000', '2021-03-03T03:00:00.000Z'],
			['setHours(25, 70, 70, 1001)', [2021, 8, 4, 14, 19, 52, 1], 'Asia/Tokyo', (zd: ZonedDate) => zd.setHours(25, 70, 70, 1001), '2021-09-05T02:11:11.001', '2021-09-04T17:11:11.001Z'],
			['setDate(0)', [2021, 2, 15, 10], 'Pacific/Kiritimati', (zd: ZonedDate) => zd.setDate(0), '2021-02-28T10:00:00.000', '2021-02-27T20:00:00.000Z'],
			['setFullYear(2021) on February 29', [2020, 1, 29, 10], 'Asia/Kolkata', (zd: ZonedDate) => zd.setFullYear(2021), '2021-03-01T10:00:00.000', '2021-03-01T04:30:00.000Z'],
			['setMilliseconds(-1) at midnight', [2022, 0, 1], 'Etc/GMT+12', (zd: ZonedDate) => zd.setMilliseconds(-1), '2021-12-31T23:59:59.999', '2022-01-01T11:59:59.999Z'],
			['setMonth(12)', [2021, 11, 15, 8], 'Asia/Kathmandu', (zd: ZonedDate) => zd.setMonth(12), '2022-01-15T08:00:00.000', '2022-01-15T02:15:00.000Z'],
			['setMinutes(60) before midnight', [2021, 11, 31, 23, 59], 'Asia/Kathmandu', (zd: ZonedDate) => zd.setMinutes(60), '2022-01-01T00:00:00.000', '2021-12-31T18:15:00.000Z'],
		] as const) {
			const zd = new ZonedDate(...start satisfies WallclockFields as Required<WallclockFields>, {timezone})
			update(zd)
			strictEqual(wallclockOf(zd), wallclock, label)
			strictEqual(instantOf(zd), instant, label)
		}
	})

	test('multi-argument setters apply their fields together, like Date', () => {
		strictEqual(wallclockOf(new ZonedDate(2021, 0, 31, 12, {timezone: 'Asia/Tokyo'}).setMonth(1, 28)), '2021-02-28T12:00:00.000')
		const zd = new ZonedDate(2021, 0, 1, 9, {timezone: 'Asia/Tokyo'})
		zd.setDate(15, 13, minutes => minutes + 5, undefined, 250)
		strictEqual(wallclockOf(zd), '2021-01-15T13:05:00.250')
		strictEqual(instantOf(zd), '2021-01-15T04:05:00.250Z')

		// a half-hour offset, so that a cascade into the UTC minutes would show
		const kolkata = new ZonedDate(epoch, {timezone: 'Asia/Kolkata'})
		strictEqual(wallclockOf(kolkata.withHours(undefined, 7)), '2021-09-04T10:07:52.001')
		strictEqual(wallclockOf(kolkata.withHours(hours => hours + 1, minutes => minutes + 1, () => undefined, milliseconds => milliseconds + 1)), '2021-09-04T11:50:52.002')
		strictEqual(wallclockOf(kolkata.withMinutes(0, 0, 0)), '2021-09-04T10:00:00.000')
	})

	test('setFullYear and setMonth take the optional month and date arguments', () => {
		// native Date (TZ=Asia/Tokyo) from 2021-09-04T20:00Z, which is 2021-09-05T05:00 in Tokyo
		for (const [method, args, instant] of [
			['setFullYear', [2020, 1, 29], '2020-02-28T20:00:00.000Z'],
			['setMonth', [0, 31], '2021-01-30T20:00:00.000Z'],
			['setUTCFullYear', [2020, 1, 29], '2020-02-29T20:00:00.000Z'],
			['setUTCMonth', [0, 31], '2021-01-31T20:00:00.000Z'],
		] as const) {
			const zd = new ZonedDate(Date.UTC(2021, 8, 4, 20), {timezone: 'Asia/Tokyo'})
			zd[method](...args)
			strictEqual(instantOf(zd), instant, method)
		}
	})

	test('a NaN wallclock field makes the instance invalid, like Date', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo'}).setHours(NaN)
		ok(Number.isNaN(zd.time))
		ok(Number.isNaN(zd.hours))
		// as in Date, the setters of an invalid instance still convert their values
		// @ts-expect-error a BigInt is not a number
		throws(() => zd.setHours(5n), TypeError)
		// @ts-expect-error a BigInt is not a number
		throws(() => zd.setUTCMinutes(1, 5n), TypeError)
		ok(Number.isNaN(zd.setMinutes(30).time))
	})

	test('a wallclock far past the Date range gives an invalid instance under every disambiguation, like Date', () => {
		// native Date gives NaN: hours that overflow to Infinity, milliseconds past 2 ** 60 at +09:00, and a day past the range
		for (const disambiguation of ['compatible', 'earlier', 'later', 'reject'] as const) for (const [label, zd] of [
			['hours 1e308', new ZonedDate(2021, 0, 1, 1e308, {timezone: 'UTC', disambiguation})],
			['milliseconds 2 ** 60', new ZonedDate(2021, 0, 1, 0, 0, 0, 2 ** 60, {timezone: 'Etc/GMT-9', disambiguation})],
			['setDate(2e10)', new ZonedDate(epoch, {timezone: 'Etc/GMT-9', disambiguation}).setDate(2e10)],
		] as const) ok(Number.isNaN(zd.time), `${label}, ${disambiguation}`)
	})

	test('setters near the ends of the range work like Date', () => {
		// native Date under TZ=Etc/GMT-9
		strictEqual(instantOf(new ZonedDate(8.64e15, {timezone: 'Asia/Tokyo'}).setHours(0)), '+275760-09-12T15:00:00.000Z')
		strictEqual(instantOf(new ZonedDate(8.64e15, {timezone: 'Etc/GMT-9'}).setFullYear(-271821, 3, 20)), '-271821-04-20T00:00:00.000Z')
	})
})

describe('ZonedDate UTC fields', () => {
	test('UTC getters read the instant', () => {
		const zd = new ZonedDate(monthEnd, {timezone: 'Asia/Tokyo'})
		strictEqual(wallclockOf(zd), '2021-09-01T05:19:52.001')
		for (const [field, getter, value] of [
			['utcFullYear', 'getUTCFullYear', 2021],
			['utcMonth', 'getUTCMonth', 7],
			['utcDate', 'getUTCDate', 31],
			['utcHours', 'getUTCHours', 20],
			['utcMinutes', 'getUTCMinutes', 19],
			['utcSeconds', 'getUTCSeconds', 52],
			['utcMilliseconds', 'getUTCMilliseconds', 1],
		] as const) {
			strictEqual(zd[field], value, field)
			strictEqual(zd[getter](), value, getter)
		}
	})

	test('withUTC* returns a changed copy and setUTC* changes the instance and returns it', () => {
		// native Date: setUTC* on 2021-09-04T05:19:52.001Z
		for (const [field, value, instant] of [
			['UTCFullYear', 2020, '2020-09-04T05:19:52.001Z'],
			['UTCMonth', 0, '2021-01-04T05:19:52.001Z'],
			['UTCDate', 30, '2021-09-30T05:19:52.001Z'],
			['UTCHours', 23, '2021-09-04T23:19:52.001Z'],
			['UTCMinutes', 0, '2021-09-04T05:00:52.001Z'],
			['UTCSeconds', 0, '2021-09-04T05:19:00.001Z'],
			['UTCMilliseconds', 999, '2021-09-04T05:19:52.999Z'],
		] as const) {
			const zd = new ZonedDate(epoch, {timezone: 'Asia/Kathmandu'})
			const copy = zd[`with${field}`](value)
			notStrictEqual(copy, zd, field)
			strictEqual(instantOf(copy), instant, field)
			strictEqual(zd.time, epoch, field)

			strictEqual(zd[`set${field}`](value), zd, field)
			strictEqual(instantOf(zd), instant, field)
			strictEqual(zd.timezone, 'Asia/Kathmandu', field)
		}
	})

	test('UTC setters overflow like Date', () => {
		// native Date: the same setUTC* call
		for (const [label, start, update, instant] of [
			['setUTCMonth(1) on January 31', Date.UTC(2021, 0, 31, 12), (zd: ZonedDate) => zd.setUTCMonth(1), '2021-03-03T12:00:00.000Z'],
			['setUTCFullYear(2023) on February 29', Date.UTC(2024, 1, 29, 12), (zd: ZonedDate) => zd.setUTCFullYear(2023), '2023-03-01T12:00:00.000Z'],
			['setUTCDate(0)', epoch, (zd: ZonedDate) => zd.setUTCDate(0), '2021-08-31T05:19:52.001Z'],
			['setUTCHours(24)', epoch, (zd: ZonedDate) => zd.setUTCHours(24), '2021-09-05T00:19:52.001Z'],
			['setUTCMilliseconds(1000)', epoch, (zd: ZonedDate) => zd.setUTCMilliseconds(1000), '2021-09-04T05:19:53.000Z'],
		] as const) {
			const zd = new ZonedDate(start, {timezone: 'Pacific/Kiritimati'})
			update(zd)
			strictEqual(instantOf(zd), instant, label)
		}
	})

	test('multi-argument UTC setters apply their fields together, like Date', () => {
		strictEqual(instantOf(new ZonedDate(Date.UTC(2021, 0, 31, 12), {timezone: 'Asia/Tokyo'}).setUTCMonth(1, 28)), '2021-02-28T12:00:00.000Z')
		// a half-hour offset, so that a cascade into the wallclock minutes would show
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Kolkata'})
		strictEqual(zd.setUTCDate(15, 3, 4, 5, 6), zd)
		strictEqual(instantOf(zd), '2021-09-15T03:04:05.006Z')
		strictEqual(wallclockOf(zd), '2021-09-15T08:34:05.006')
		strictEqual(instantOf(zd.withUTCHours(undefined, 30)), '2021-09-15T03:30:05.006Z')
		zd.utcMinutes = undefined
		strictEqual(instantOf(zd), '2021-09-15T03:04:05.006Z')
	})
})

describe('ZonedDate and the runtime time zone', () => {
	test('the wallclock and UTC fields ignore the runtime time zone', t => {
		// at the runtime's +05:45, 2021-08-31T20:19:52.001Z (22:19 at +02:00) is already Wednesday 2021-09-01T02:04
		setRuntimeTimezone(t, 'Asia/Kathmandu')
		const zd = new ZonedDate(monthEnd, {timezone: 'Africa/Johannesburg'})
		strictEqual(wallclockOf(zd), '2021-08-31T22:19:52.001')
		deepStrictEqual([zd.day, zd.utcMonth, zd.utcDate, zd.utcHours, zd.utcMinutes, zd.utcDay], [2, 7, 31, 20, 19, 2])
		// native Date: the same setUTC* call on the wallclock at +02:00 or on the instant
		for (const [label, copy, instant] of [
			['withMonth(0)', zd.withMonth(0), '2021-01-31T20:19:52.001Z'],
			['withDate(15)', zd.withDate(15), '2021-08-15T20:19:52.001Z'],
			['withHours(23)', zd.withHours(23), '2021-08-31T21:19:52.001Z'],
			['withMinutes(0)', zd.withMinutes(0), '2021-08-31T20:00:52.001Z'],
			['withUTCMonth(0)', zd.withUTCMonth(0), '2021-01-31T20:19:52.001Z'],
			['withUTCDate(15)', zd.withUTCDate(15), '2021-08-15T20:19:52.001Z'],
			['withUTCHours(23)', zd.withUTCHours(23), '2021-08-31T23:19:52.001Z'],
			['withUTCMinutes(0)', zd.withUTCMinutes(0), '2021-08-31T20:00:52.001Z'],
		] as const) strictEqual(instantOf(copy), instant, label)
	})

	test('utcFullYear is the UTC year in any runtime time zone', t => {
		setRuntimeTimezone(t, 'Asia/Tokyo')
		const zd = new ZonedDate(Date.UTC(2021, 11, 31, 23, 30), {timezone: 'UTC'})
		strictEqual(zd.utcFullYear, 2021)
		strictEqual(zd.getUTCFullYear(), 2021)
		strictEqual(instantOf(zd.withUTCFullYear(year => year)), '2021-12-31T23:30:00.000Z')
	})
})

describe('ZonedDate time', () => {
	test('time, getTime, setTime and withTime work on the epoch', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo'})
		strictEqual(zd.time, epoch)
		strictEqual(zd.getTime(), epoch)
		strictEqual(zd.setTime(Date.UTC(2000, 0, 1)), zd)
		strictEqual(wallclockOf(zd), '2000-01-01T09:00:00.000')

		zd.time = time => time + oneHour
		strictEqual(instantOf(zd), '2000-01-01T01:00:00.000Z')
		zd.time = undefined
		strictEqual(instantOf(zd), '2000-01-01T01:00:00.000Z')

		const copy = zd.withTime(0)
		notStrictEqual(copy, zd)
		strictEqual(wallclockOf(copy), '1970-01-01T09:00:00.000')
		strictEqual(instantOf(zd), '2000-01-01T01:00:00.000Z')
	})

	test('setTime coerces a Date to its epoch', () => {
		const zd = new ZonedDate(0, {timezone: 'Asia/Tokyo'})
		// @ts-expect-error a Date where a number is declared
		zd.setTime(new Date(epoch))
		strictEqual(instantOf(zd), '2021-09-04T05:19:52.001Z')
	})
})

describe('ZonedDate timezone', () => {
	test('setTimezone keeps the wallclock and moves the instant', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo'})
		strictEqual(zd.setTimezone('Asia/Kolkata'), zd)
		strictEqual(zd.timezone, 'Asia/Kolkata')
		strictEqual(wallclockOf(zd), '2021-09-04T14:19:52.001')
		// Temporal: 2021-09-04T14:19:52.001+05:30[Asia/Kolkata]
		strictEqual(instantOf(zd), '2021-09-04T08:49:52.001Z')
	})

	test('withTimezone keeps the wallclock and leaves the receiver unchanged', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo'})
		const copy = zd.withTimezone('Etc/GMT+12')
		notStrictEqual(copy, zd)
		strictEqual(copy.timezone, 'Etc/GMT+12')
		strictEqual(wallclockOf(copy), '2021-09-04T14:19:52.001')
		strictEqual(instantOf(copy), '2021-09-05T02:19:52.001Z')
		strictEqual(zd.timezone, 'Asia/Tokyo')
		strictEqual(zd.time, epoch)
	})

	test('a copy with a timezone option keeps the wallclock', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo'})
		const copy = new ZonedDate(zd, {timezone: 'Pacific/Kiritimati'})
		strictEqual(copy.timezone, 'Pacific/Kiritimati')
		strictEqual(wallclockOf(copy), '2021-09-04T14:19:52.001')
		strictEqual(instantOf(copy), '2021-09-04T00:19:52.001Z')
	})

	test('setting the current timezone again changes nothing', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo'})
		strictEqual(zd.setTimezone('Asia/Tokyo'), zd)
		strictEqual(wallclockOf(zd), '2021-09-04T14:19:52.001')
		strictEqual(zd.time, epoch)
	})

	test('the timezone accessor sets the timezone and setTimezone(fn) receives the current one', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo'})
		zd.timezone = 'Asia/Kathmandu'
		strictEqual(zd.getTimezone(), 'Asia/Kathmandu')

		let seen: string | undefined
		strictEqual(zd.setTimezone(timezone => {
			seen = timezone
			return 'UTC'
		}), zd)
		strictEqual(seen, 'Asia/Kathmandu')
		strictEqual(zd.timezone, 'UTC')
		strictEqual(wallclockOf(zd), '2021-09-04T14:19:52.001')
	})

	test('setTimezone(undefined) keeps the timezone', () => {
		for (const timezone of [undefined, () => undefined]) {
			const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo'})
			zd.setTimezone(timezone)
			strictEqual(zd.timezone, 'Asia/Tokyo', String(timezone))
			strictEqual(instantOf(zd), '2021-09-04T05:19:52.001Z', String(timezone))
			strictEqual(instantOf(zd.withMinutes(0)), '2021-09-04T05:00:52.001Z', String(timezone))
		}
	})
})

describe('ZonedDate time zone ids', () => {
	test('aliases and Etc zones resolve like their target zone', () => {
		// Temporal: the offset of each zone on 2021-09-04
		assertZones([
			['Asia/Calcutta', 5.5, '2021-09-04T10:49:52.001'],
			['Asia/Katmandu', 5.75, '2021-09-04T11:04:52.001'],
			['US/Hawaii', -10, '2021-09-03T19:19:52.001'],
			['Etc/UTC', 0, '2021-09-04T05:19:52.001'],
			['GMT', 0, '2021-09-04T05:19:52.001'],
			['Etc/GMT-14', 14, '2021-09-04T19:19:52.001'],
			['Etc/GMT+12', -12, '2021-09-03T17:19:52.001'],
		])
	})

	test('time zone names are case-insensitive', () => {
		assertZones([
			['asia/tokyo', 9, '2021-09-04T14:19:52.001'],
			['ASIA/KOLKATA', 5.5, '2021-09-04T10:49:52.001'],
			['utc', 0, '2021-09-04T05:19:52.001'],
			['etc/gmt+12', -12, '2021-09-03T17:19:52.001'],
		])
	})

	test('offset strings are fixed-offset zones', {skip: !offsetZonesSupported && 'this Intl rejects offset time zones'}, () => {
		assertZones([
			['+09:00', 9, '2021-09-04T14:19:52.001'],
			['-03:30', -3.5, '2021-09-04T01:49:52.001'],
			['+0530', 5.5, '2021-09-04T10:49:52.001'],
			['+05', 5, '2021-09-04T10:19:52.001'],
		])
	})

	function assertZones(rows: [timezone: string, offset: number, wallclock: string][]) {
		for (const [timezone, offset, wallclock] of rows) {
			const zd = new ZonedDate(epoch, {timezone})
			// README: timezone returns the name as given
			strictEqual(zd.timezone, timezone, timezone)
			strictEqual(zd.offset, offset, timezone)
			strictEqual(wallclockOf(zd), wallclock, timezone)
			strictEqual(zd.time, epoch, timezone)
		}
	}
})

describe('ZonedDate disambiguation', () => {
	test('every disambiguation value works away from transitions', () => {
		for (const disambiguation of ['compatible', 'earlier', 'later', 'reject'] as const) {
			const zd = new ZonedDate('2021-09-04T14:19:52.001', {timezone: 'Asia/Tokyo', disambiguation})
			strictEqual(zd.disambiguation, disambiguation, disambiguation)
			strictEqual(instantOf(zd), '2021-09-04T05:19:52.001Z', disambiguation)
			strictEqual(instantOf(zd.setHours(0)), '2021-09-03T15:19:52.001Z', disambiguation)
		}
	})

	test('setDisambiguation takes a value, a function or undefined and returns the instance', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo', disambiguation: 'later'})
		strictEqual(zd.setDisambiguation('earlier'), zd)
		strictEqual(zd.getDisambiguation(), 'earlier')
		zd.setDisambiguation(undefined)
		strictEqual(zd.disambiguation, 'earlier')

		let seen: ZonedDate.Disambiguation | undefined
		zd.setDisambiguation(disambiguation => {
			seen = disambiguation
			return 'reject'
		})
		strictEqual(seen, 'earlier')
		strictEqual(zd.disambiguation, 'reject')

		zd.disambiguation = 'compatible'
		zd.disambiguation = () => undefined
		strictEqual(zd.disambiguation, 'compatible')
		strictEqual(zd.time, epoch)
	})

	test('withDisambiguation returns a copy and leaves the receiver unchanged', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo', disambiguation: 'later'})
		const copy = zd.withDisambiguation('reject')
		notStrictEqual(copy, zd)
		strictEqual(copy.disambiguation, 'reject')
		strictEqual(copy.timezone, 'Asia/Tokyo')
		strictEqual(copy.time, epoch)
		strictEqual(zd.disambiguation, 'later')
	})

	test('with*() and copies keep a non-default disambiguation', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo', disambiguation: 'reject'})
		strictEqual(zd.withMinutes(0).disambiguation, 'reject')
		strictEqual(new ZonedDate(zd).disambiguation, 'reject')
	})
})

describe('ZonedDate offset and timezoneOffset', () => {
	test('offset is in hours and timezoneOffset in minutes with the sign reversed', () => {
		// Temporal: the offset of each zone on 2021-09-04
		for (const [timezone, offset, timezoneOffset] of [
			['Asia/Tokyo', 9, -540],
			['Asia/Kolkata', 5.5, -330],
			['Asia/Kathmandu', 5.75, -345],
			['Australia/Eucla', 8.75, -525],
			['Pacific/Kiritimati', 14, -840],
			['Pacific/Marquesas', -9.5, 570],
			['Etc/GMT+12', -12, 720],
		] as const) {
			const zd = new ZonedDate(epoch, {timezone})
			strictEqual(zd.offset, offset, timezone)
			strictEqual(zd.getOffset(), offset, timezone)
			strictEqual(zd.timezoneOffset, timezoneOffset, timezone)
			strictEqual(zd.getTimezoneOffset(), timezoneOffset, timezone)
		}
		strictEqual(new ZonedDate(epoch, {timezone: 'UTC'}).offset, 0)
	})

	test('offset follows DST far from the transitions', () => {
		// Temporal: -05:00 and +11:00 in January, -04:00 and +10:00 in July
		for (const [instant, timezone, offset] of [
			['2021-01-15T12:00:00.000Z', 'America/New_York', -5],
			['2021-07-15T12:00:00.000Z', 'America/New_York', -4],
			['2021-01-15T12:00:00.000Z', 'Australia/Sydney', 11],
			['2021-07-15T12:00:00.000Z', 'Australia/Sydney', 10],
		] as const) strictEqual(new ZonedDate(Date.parse(instant), {timezone}).offset, offset, `${instant} ${timezone}`)
	})

	test('timezoneOffset is +0 in a zero-offset zone', () => {
		for (const timezone of ['UTC', 'Africa/Abidjan']) {
			const zd = new ZonedDate(epoch, {timezone})
			strictEqual(zd.timezoneOffset, 0, timezone)
			strictEqual(zd.getTimezoneOffset(), 0, timezone)
		}
	})

	test('timezoneOffset is exact to the second', () => {
		// Temporal: 1936-10-15T20:20:00+08:20[Asia/Kuching], and the local mean time of New York in 1800, -04:56:02
		strictEqual(new ZonedDate(Date.UTC(1936, 9, 15, 12), {timezone: 'Asia/Kuching'}).timezoneOffset, -500)
		strictEqual(new ZonedDate(Date.UTC(1800, 0, 1), {timezone: 'America/New_York'}).timezoneOffset, 17_762 / 60)
	})
})

describe('ZonedDate day and utcDay', () => {
	test('day is the wallclock weekday and utcDay the UTC weekday', () => {
		for (const [instant, timezone, day, utcDay] of [
			['2021-09-04T20:00:00.000Z', 'Asia/Tokyo', 0, 6],
			['2021-09-05T06:00:00.000Z', 'Etc/GMT+12', 6, 0],
			['2021-12-31T10:00:00.000Z', 'Pacific/Kiritimati', 6, 5],
			['2024-02-29T23:45:06.789Z', 'Asia/Kolkata', 5, 4],
		] as const) {
			const zd = new ZonedDate(Date.parse(instant), {timezone})
			strictEqual(zd.day, day, instant)
			strictEqual(zd.getDay(), day, instant)
			strictEqual(zd.utcDay, utcDay, instant)
			strictEqual(zd.getUTCDay(), utcDay, instant)
		}
	})
})

describe('ZonedDate members', () => {
	test('offset, timezoneOffset, day and utcDay are read-only', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo'})
		for (const field of ['offset', 'timezoneOffset', 'day', 'utcDay'] as const) throws(() => {
			// @ts-expect-error these accessors are read-only
			zd[field] = 1
		}, TypeError, field)
		strictEqual(zd.offset, 9)
		strictEqual(zd.day, 6)
	})

	test('there are no offset setters', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo'})
		// @ts-expect-error ZonedDate has none of these methods
		for (const method of ['setOffset', 'withOffset', 'setTimezoneOffset', 'withTimezoneOffset'] as const) strictEqual(zd[method], undefined, method)
	})

	test('for...in over a ZonedDate finds no methods', () => {
		const keys = []
		for (const key in new ZonedDate(epoch)) keys.push(key)
		deepStrictEqual(keys, [])
	})
})

describe('ZonedDate toDate and the Date protocol', () => {
	test('a ZonedDate is not a Date', () => {
		strictEqual(new ZonedDate(epoch) instanceof Date, false)
	})

	test('toDate returns a new Date at the same instant', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo'})
		const date = zd.toDate()
		ok(date instanceof Date)
		strictEqual(date.toISOString(), '2021-09-04T05:19:52.001Z')
		notStrictEqual(zd.toDate(), date)

		date.setTime(0)
		strictEqual(zd.time, epoch)
	})

	test('toISOString formats the instant like a Date', () => {
		strictEqual(new ZonedDate(epoch, {timezone: 'Asia/Tokyo'}).toISOString(), '2021-09-04T05:19:52.001Z')
	})

	test('toJSON and JSON.stringify serialize the instant like a Date', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo'})
		deepStrictEqual(JSON.parse(JSON.stringify({at: zd})), {at: '2021-09-04T05:19:52.001Z'})
		strictEqual(zd.toJSON(), '2021-09-04T05:19:52.001Z')
	})

	test('valueOf returns the epoch', () => {
		strictEqual(new ZonedDate(epoch, {timezone: 'Asia/Tokyo'}).valueOf(), epoch)
	})

	test('String() and template literals format like a Date', t => {
		setRuntimeTimezone(t, 'UTC')
		const zd = new ZonedDate(epoch, {timezone: 'UTC'})
		strictEqual(String(zd), 'Sat Sep 04 2021 05:19:52 GMT+0000 (Coordinated Universal Time)')
		strictEqual(`${zd}`, 'Sat Sep 04 2021 05:19:52 GMT+0000 (Coordinated Universal Time)')
	})

	test('new Date(zonedDate) keeps the instant, and + with a string gives the ISO string', t => {
		setRuntimeTimezone(t, 'Asia/Tokyo')
		// Temporal: the instants of the milliseconds, the year 50, 6 BC (the year -5) and the local mean time of New York
		for (const time of [Date.parse('2024-03-01T03:34:56.789Z'), Date.parse('0050-06-15T12:00:00.000Z'), Date.parse('-000005-06-15T12:00:00.000Z'), Date.parse('1850-06-15T12:00:00.000Z')]) {
			const zd = new ZonedDate(time, {timezone: 'America/New_York'})
			// @ts-expect-error the Date types take no ZonedDate, which converts through Symbol.toPrimitive
			strictEqual(new Date(zd).getTime(), time, zd.toISOString())
			strictEqual(zd + '', zd.toISOString())
			strictEqual(String(zd), zd.toDate().toString())
		}
		// @ts-expect-error the Date types take no ZonedDate, which converts through Symbol.toPrimitive
		ok(Number.isNaN(new Date(new ZonedDate(NaN)).getTime()))
	})

	test('the conversions have the names of class members', () => {
		strictEqual(ZonedDate.prototype.toISOString.name, 'toISOString')
		strictEqual(ZonedDate.prototype[Symbol.toPrimitive].name, '[Symbol.toPrimitive]')
		strictEqual(ZonedDate.prototype.withTimezone.name, 'withTimezone')
	})

	test('a with* call on another receiver throws TypeError, like a Date method', () => {
		const {withTimezone} = new ZonedDate(epoch)
		throws(() => withTimezone('Asia/Tokyo'), TypeError)
		throws(() => withTimezone.call({}, 'Asia/Tokyo'), TypeError)
	})

	test('< compares the instants and - subtracts them', () => {
		// the earlier instant has the later wallclock
		const earlier = new ZonedDate(epoch, {timezone: 'Pacific/Kiritimati'})
		const later = new ZonedDate(epoch + oneHour, {timezone: 'Etc/GMT+12'})
		strictEqual(earlier < later, true)
		// @ts-expect-error TypeScript takes no objects in arithmetic, though a ZonedDate converts to its epoch
		strictEqual(later - earlier, oneHour)
	})

	test('Object.prototype.toString tags it as a ZonedDate', () => {
		strictEqual(Object.prototype.toString.call(new ZonedDate(epoch)), '[object ZonedDate]')
	})

	test('toLocaleString takes the time zone option like a Date', () => {
		strictEqual(new ZonedDate(epoch, {timezone: 'Asia/Tokyo'}).toLocaleString('en-GB', {timeZone: 'Asia/Tokyo'}), '04/09/2021, 14:19:52')
	})

	test('each conversion of Date gives what it gives on toDate(), for a valid and an invalid instant', t => {
		setRuntimeTimezone(t, 'America/New_York')
		const locale = ['en-GB', {timeZone: 'Asia/Tokyo'}] as const
		for (const zd of [new ZonedDate(epoch, {timezone: 'Asia/Tokyo'}), new ZonedDate(NaN, {timezone: 'Asia/Tokyo'})]) {
			const date = zd.toDate()
			for (const name of ['valueOf', 'toJSON', 'toString', 'toDateString', 'toTimeString', 'toUTCString'] as const) deepStrictEqual(zd[name](), date[name](), `${name} of ${date}`)
			for (const name of ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'] as const) deepStrictEqual(zd[name](...locale), date[name](...locale), `${name} of ${date}`)
		}
	})

	test('an invalid instant has NaN fields and converts like an Invalid Date', () => {
		for (const zd of [new ZonedDate(NaN, {timezone: 'Asia/Tokyo'}), new ZonedDate(epoch, {timezone: 'Asia/Tokyo'}).setTime(NaN)]) {
			for (const field of ['time', 'fullYear', 'hours', 'utcHours', 'day', 'offset', 'timezoneOffset'] as const) ok(Number.isNaN(zd[field]), field)
			strictEqual(String(zd), 'Invalid Date')
			strictEqual(zd.toJSON(), null)
			throws(() => zd.toISOString(), RangeError)
		}
	})
})

describe('ZonedDate validation', () => {
	test('an unknown timezone throws RangeError', () => {
		throws(() => new ZonedDate({timezone: 'Mars/Olympus'}), {name: 'RangeError', message: 'Invalid time zone specified: Mars/Olympus'})
		for (const timezone of ['Foo/Bar', '', ' Asia/Tokyo']) throws(() => new ZonedDate(epoch, {timezone}), RangeError, timezone)
	})

	test('setTimezone and withTimezone with an unknown timezone throw RangeError and change nothing', () => {
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo'})
		throws(() => zd.setTimezone('Mars/Olympus'), RangeError)
		throws(() => zd.withTimezone('Mars/Olympus'), RangeError)
		strictEqual(zd.timezone, 'Asia/Tokyo')
		strictEqual(zd.time, epoch)
	})

	test('an unknown disambiguation throws Invalid disambiguation option and changes nothing', () => {
		// the message only: the README documents a plain Error, while Temporal throws RangeError for this option
		// @ts-expect-error an unknown disambiguation
		throws(() => new ZonedDate(epoch, {disambiguation: 'forward'}), {message: 'Invalid disambiguation option'})
		const zd = new ZonedDate(epoch, {timezone: 'Asia/Tokyo', disambiguation: 'later'})
		// @ts-expect-error an unknown disambiguation
		throws(() => zd.setDisambiguation('backward'), {message: 'Invalid disambiguation option'})
		// @ts-expect-error an unknown disambiguation
		throws(() => zd.withDisambiguation('forward'), {message: 'Invalid disambiguation option'})
		strictEqual(zd.disambiguation, 'later')
	})

	test('an undefined defaultTimezone throws RangeError instead of using the runtime time zone', t => {
		restoreDefaults(t)
		// @ts-expect-error defaultTimezone is a string
		ZonedDate.defaultTimezone = undefined
		throws(() => new ZonedDate(epoch), RangeError)
	})
})

describe('ZonedDate range limits', () => {
	test('years 100 to 275760 keep their wallclock and instant', () => {
		// Temporal (proleptic Gregorian, so 1582-10-10 exists)
		for (const [instant, timezone, wallclock] of [
			['0100-01-01T00:00:00.000Z', 'UTC', '0100-01-01T00:00:00.000'],
			['0500-06-15T12:00:00.000Z', 'Etc/GMT+12', '0500-06-15T00:00:00.000'],
			['1582-10-10T12:00:00.000Z', 'UTC', '1582-10-10T12:00:00.000'],
			['+010000-01-01T00:00:00.000Z', 'Etc/GMT+12', '9999-12-31T12:00:00.000'],
			['+010000-06-15T12:34:56.789Z', 'Asia/Tokyo', '10000-06-15T21:34:56.789'],
			['+275759-06-15T12:34:56.789Z', 'Asia/Tokyo', '275759-06-15T21:34:56.789'],
			['+275760-09-13T00:00:00.000Z', 'Etc/GMT+11', '275760-09-12T13:00:00.000'],
		]) {
			const zd = new ZonedDate(Date.parse(instant), {timezone})
			strictEqual(wallclockOf(zd), wallclock, instant)
			strictEqual(instantOf(zd), instant, instant)
		}
	})

	test('the largest instant reads back in a positive-offset zone', () => {
		// Temporal: +275760-09-13T09:00:00+09:00[Asia/Tokyo]
		const zd = new ZonedDate(8.64e15, {timezone: 'Asia/Tokyo'})
		strictEqual(wallclockOf(zd), '275760-09-13T09:00:00.000')
		strictEqual(instantOf(zd), '+275760-09-13T00:00:00.000Z')
	})

	test('years before 1 CE keep their sign', () => {
		// Temporal: the year of -000100-06-15T12:00:00Z is -100
		const zd = new ZonedDate(Date.parse('-000100-06-15T12:00:00.000Z'), {timezone: 'UTC'})
		strictEqual(zd.fullYear, -100)
		strictEqual(instantOf(zd), '-000100-06-15T12:00:00.000Z')
	})

	test('years 1 to 99 stay in the first century', () => {
		const zd = new ZonedDate(Date.parse('0050-06-15T12:00:00.000Z'), {timezone: 'UTC'})
		strictEqual(zd.fullYear, 50)
		strictEqual(instantOf(zd), '0050-06-15T12:00:00.000Z')
	})
})

describe('ZonedDate engine fallbacks', () => {
	// Temporal; midnight and noon are where 12-hour and 24-hour formats differ
	const cases = [
		['2007-07-23T15:00:00.000Z', 'Asia/Tokyo', '2007-07-24T00:00:00.000'],
		['2021-09-04T03:00:00.000Z', 'Asia/Tokyo', '2021-09-04T12:00:00.000'],
		['2021-05-05T18:15:00.000Z', 'Asia/Kathmandu', '2021-05-06T00:00:00.000'],
		['2021-09-04T12:00:00.000Z', 'Etc/GMT+12', '2021-09-04T00:00:00.000'],
		['2021-09-03T23:59:59.999Z', 'Pacific/Kiritimati', '2021-09-04T13:59:59.999'],
		['2023-07-04T04:00:00.000Z', 'America/New_York', '2023-07-04T00:00:00.000'],
	]

	test('without hourCycle support the formatter uses hour12: false', t => {
		const construct = t.mock.method(Intl, 'DateTimeFormat')
		// an engine that ignores hourCycle formats the probe 2000-11-23T00:00Z in 12-hour style
		t.mock.method(Intl.DateTimeFormat.prototype, 'format', () => twelveHourProbe, {getter: true})
		assertCases()
		ok(construct.mock.calls.some(call => call.arguments[1]!.hour12 === false))

		function twelveHourProbe() {
			return '11/23/2000, 12:00:00 AM'
		}
	})

	test('without formatToParts the wallclock is parsed from format()', t => {
		const {DateTimeFormat} = Intl
		t.mock.method(Intl, 'DateTimeFormat', withoutFormatToParts)
		const formatToParts = t.mock.method(DateTimeFormat.prototype, 'formatToParts')
		assertCases()
		strictEqual(formatToParts.mock.callCount(), 0)

		function withoutFormatToParts(locale: string, options: Intl.DateTimeFormatOptions) {
			const format = new DateTimeFormat(locale, options)
			// @ts-expect-error an engine without formatToParts
			format.formatToParts = undefined
			return format
		}
	})

	function assertCases() {
		for (const [instant, timezone, wallclock] of cases) {
			const zd = new ZonedDate(Date.parse(instant), {timezone})
			strictEqual(wallclockOf(zd), wallclock, `${instant} ${timezone}`)
			strictEqual(instantOf(zd), instant, `${instant} ${timezone}`)
			strictEqual(instantOf(zd.withTimezone('UTC').withTimezone(timezone)), instant, `${instant} ${timezone}`)
		}
	}
})

describe('ZonedDate formatters', () => {
	test('one formatter per time zone serves every instance', t => {
		const construct = t.mock.method(Intl, 'DateTimeFormat')
		for (const index of Array(50).keys()) ok(new ZonedDate(epoch + index * oneHour, {timezone: 'Asia/Tokyo'}).withTimezone('Asia/Kolkata').hours >= 0)
		// the hourCycle check, then one formatter for each time zone
		strictEqual(construct.mock.callCount(), 3)
	})
})

describe('ZonedDate README examples', () => {
	test('the ZonedDate example prints 5 9, 3, 20 and 16', () => {
		const date = new ZonedDate('2021-09-04T05:19:52.001', {timezone: 'Asia/Tokyo'})
		strictEqual(date.hours, 5)
		strictEqual(date.offset, 9)
		strictEqual(new ZonedDate(date.time, {timezone: 'Asia/Bangkok'}).hours, 3)
		strictEqual(new ZonedDate(date.time, {timezone: 'UTC'}).hours, 20)
		strictEqual(new ZonedDate(date.time, {timezone: 'America/New_York'}).hours, 16)
	})

	test('the usage example reads an OffsetDate in New York', () => {
		const newYork = new ZonedDate(new OffsetDate('2021-09-04T05:19:52', {offset: 9}), {timezone: 'America/New_York'})
		strictEqual(newYork.hours, 16)
		strictEqual(newYork.offset, -4)
		newYork.hours = hours => hours + 1
		strictEqual(newYork.toDate().toISOString(), '2021-09-03T21:19:52.000Z')
	})

	test('the changing-the-zone example prints 5 false and 20 true', () => {
		const zonedDate = new ZonedDate('2021-09-04T05:00', {timezone: 'Asia/Tokyo'})
		const sameWallclock = zonedDate.withTimezone('UTC')
		deepStrictEqual([sameWallclock.hours, sameWallclock.time === zonedDate.time], [5, false])
		const sameInstant = new ZonedDate(zonedDate.time, {timezone: 'UTC'})
		deepStrictEqual([sameInstant.hours, sameInstant.time === zonedDate.time], [20, true])
	})

	test('the daylight saving time example', () => {
		const timezone = 'America/Los_Angeles'
		const first = new ZonedDate('2023-11-05T01:30', {timezone, disambiguation: 'earlier'})
		const second = new ZonedDate('2023-11-05T01:30', {timezone, disambiguation: 'later'})
		deepStrictEqual([first.toDate().toISOString(), first.offset], ['2023-11-05T08:30:00.000Z', -7])
		deepStrictEqual([second.toDate().toISOString(), second.offset], ['2023-11-05T09:30:00.000Z', -8])
		const skipped = new ZonedDate('2023-03-12T02:30', {timezone})
		deepStrictEqual([skipped.hours, skipped.offset], [3, -7])
		const fromInstant = new ZonedDate(Date.parse('2023-11-05T09:30Z'), {timezone})
		deepStrictEqual([fromInstant.hours, fromInstant.offset], [1, -8])
		const strict = new ZonedDate('2023-11-05T01:30', {timezone, disambiguation: 'reject'})
		strictEqual(strict.hours, 1)
		throws(() => strict.time, {name: 'RangeError', message: 'Ambiguous time'})
	})

	test('the conversion example compares, subtracts, serializes and formats', () => {
		const tokyo = new ZonedDate('2021-09-04T05:00', {timezone: 'Asia/Tokyo'})
		const utc = new ZonedDate('2021-09-04T05:00', {timezone: 'UTC'})
		strictEqual(tokyo < utc, true)
		// @ts-expect-error TypeScript takes no objects in arithmetic, though a ZonedDate converts to its epoch
		strictEqual(utc - tokyo, 9 * oneHour)
		deepStrictEqual(JSON.parse(JSON.stringify({at: tokyo, timezone: tokyo.timezone})), {at: '2021-09-03T20:00:00.000Z', timezone: 'Asia/Tokyo'})
		strictEqual(tokyo.toLocaleString('en-GB', {timeZone: tokyo.timezone}), '04/09/2021, 05:00:00')
	})
})

function wallclockOf(zd: ZonedDate) {
	return `${pad(zd.fullYear, 4)}-${pad(zd.month + 1, 2)}-${pad(zd.date, 2)}T${pad(zd.hours, 2)}:${pad(zd.minutes, 2)}:${pad(zd.seconds, 2)}.${pad(zd.milliseconds, 3)}`
}

function instantOf(zd: ZonedDate) {
	return new Date(zd.time).toISOString()
}

function pad(value: number, length: number) {
	return String(value).padStart(length, '0')
}

function restoreDefaults(t: TestContext) {
	const {defaultTimezone, defaultDisambiguation} = ZonedDate
	t.after(() => {
		ZonedDate.defaultTimezone = defaultTimezone
		ZonedDate.defaultDisambiguation = defaultDisambiguation
	})
}

function setRuntimeTimezone(t: TestContext, timezone: string) {
	const previous = process.env.TZ
	t.after(() => {
		if (previous === undefined) delete process.env.TZ
		else process.env.TZ = previous
	})
	process.env.TZ = timezone
}

function isSupportedTimezone(timezone: string) {
	try {
		new Intl.DateTimeFormat('en-US', {timeZone: timezone})
		return true
	} catch {
		return false
	}
}
