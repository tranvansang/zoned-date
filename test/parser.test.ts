import {ok, strictEqual, throws} from 'node:assert'
import {describe, test, type TestContext} from 'node:test'
import OffsetDate from 'zoned-date/OffsetDate'
import ZonedDate from 'zoned-date/ZonedDate'

// Options for both classes: OffsetDate reads offset, ZonedDate reads timezone (a zone that keeps that offset)
const utc = {offset: 0, timezone: 'UTC'}
const plusNine = {offset: 9, timezone: 'Asia/Tokyo'}
const plusFiveFortyFive = {offset: 5.75, timezone: 'Asia/Kathmandu'}
const plusFourteen = {offset: 14, timezone: 'Pacific/Kiritimati'}
const minusThree = {offset: -3, timezone: 'Etc/GMT+3'}
const minusNine = {offset: -9, timezone: 'Etc/GMT+9'}
const minusNineThirty = {offset: -9.5, timezone: 'Pacific/Marquesas'}
const minusTen = {offset: -10, timezone: 'Pacific/Honolulu'}
const minusEleven = {offset: -11, timezone: 'Pacific/Pago_Pago'}
const minusTwelve = {offset: -12, timezone: 'Etc/GMT+12'}
const invalidDateString = {name: 'Error', message: 'Invalid date string'}

describe('documented formats', () => {
	test('dated strings without a zone are a wallclock at the instance offset', () => {
		// [input, wallclock at any instance offset, instant at +09:00]
		for (const [input, expected, instantAtPlusNine] of [
			['2021-09-04T05:19:52.000', '2021-09-04T05:19:52.000', '2021-09-03T20:19:52.000Z'],
			['2021-09-04T05:19:52', '2021-09-04T05:19:52.000', '2021-09-03T20:19:52.000Z'],
			['2021-09-04T05:19', '2021-09-04T05:19:00.000', '2021-09-03T20:19:00.000Z'],
			['2021-09-04 05:19', '2021-09-04T05:19:00.000', '2021-09-03T20:19:00.000Z'],
			['2021-09-04T05', '2021-09-04T05:00:00.000', '2021-09-03T20:00:00.000Z'],
			['2021-09-04', '2021-09-04T00:00:00.000', '2021-09-03T15:00:00.000Z'],
			['2021-09T05:19:52.000', '2021-09-01T05:19:52.000', '2021-08-31T20:19:52.000Z'],
			['2021-09T05:19:52', '2021-09-01T05:19:52.000', '2021-08-31T20:19:52.000Z'],
			['2021-09T05:19', '2021-09-01T05:19:00.000', '2021-08-31T20:19:00.000Z'],
			['2021-09T05', '2021-09-01T05:00:00.000', '2021-08-31T20:00:00.000Z'],
			['2021-09', '2021-09-01T00:00:00.000', '2021-08-31T15:00:00.000Z'],
			['2021T05:19:52.000', '2021-01-01T05:19:52.000', '2020-12-31T20:19:52.000Z'],
			['2021T05:19:52', '2021-01-01T05:19:52.000', '2020-12-31T20:19:52.000Z'],
			['2021T05:19', '2021-01-01T05:19:00.000', '2020-12-31T20:19:00.000Z'],
			['2021T05', '2021-01-01T05:00:00.000', '2020-12-31T20:00:00.000Z'],
			['2021', '2021-01-01T00:00:00.000', '2020-12-31T15:00:00.000Z'],
		]) {
			for (const date of [...both(input, plusNine), ...both(input, minusNineThirty)]) strictEqual(wallclock(date), expected, label(date, input))
			for (const date of both(input, plusNine)) strictEqual(instant(date), instantAtPlusNine, label(date, input))
		}
	})

	test('time-only strings without a zone take today at the instance offset', t => {
		pinClock(t, '2026-10-14T20:00:00Z') // 2026-10-15 05:00 at +09:00, 2026-10-14 10:30 at -09:30
		// [input, wallclock at +09:00, wallclock at -09:30]
		for (const [input, atPlusNine, atMinusNineThirty] of [
			['T05:19:52.000', '2026-10-15T05:19:52.000', '2026-10-14T05:19:52.000'],
			['T05:19:52', '2026-10-15T05:19:52.000', '2026-10-14T05:19:52.000'],
			['T05:19', '2026-10-15T05:19:00.000', '2026-10-14T05:19:00.000'],
			['T05', '2026-10-15T05:00:00.000', '2026-10-14T05:00:00.000'],
			['05:19:52.000', '2026-10-15T05:19:52.000', '2026-10-14T05:19:52.000'],
			['05:19:52', '2026-10-15T05:19:52.000', '2026-10-14T05:19:52.000'],
			['05:19', '2026-10-15T05:19:00.000', '2026-10-14T05:19:00.000'],
			['05', '2026-10-15T05:00:00.000', '2026-10-14T05:00:00.000'],
			['28:30', '2026-10-16T04:30:00.000', '2026-10-15T04:30:00.000'],
		]) {
			for (const date of both(input, plusNine)) strictEqual(wallclock(date), atPlusNine, label(date, input))
			for (const date of both(input, minusNineThirty)) strictEqual(wallclock(date), atMinusNineThirty, label(date, input))
		}
	})

	test('time-only strings with a zone stay on today at the instance offset', t => {
		pinClock(t, '2026-10-14T20:00:00Z')
		assertInstants([
			['20:00Z', plusNine, '2026-10-14T20:00:00.000Z'], // the README example: 05:00 today (2026-10-15) at +09:00
			['T05:19:52.000Z', plusNine, '2026-10-15T05:19:52.000Z'], // 2026-10-15 14:19:52 at +09:00
			['T05:19:52+05:45', plusNine, '2026-10-14T23:34:52.000Z'],
			['T05:19-09:30', plusNine, '2026-10-15T14:49:00.000Z'],
			['T05+14', plusNine, '2026-10-14T15:00:00.000Z'], // 2026-10-15 00:00 at +09:00
			['05:19:52.000Z', minusNineThirty, '2026-10-15T05:19:52.000Z'], // 2026-10-14 19:49:52 at -09:30
			['05:19:52-1200', minusNineThirty, '2026-10-14T17:19:52.000Z'],
			['05:19+09:00', minusNineThirty, '2026-10-14T20:19:00.000Z'],
			['05-03', minusNineThirty, '2026-10-15T08:00:00.000Z'], // 2026-10-14 22:30 at -09:30
		])
	})

	test('dated strings with a zone give the exact instant', () => assertInstants([
		// Temporal.Instant.from, after filling in the missing month, day and minutes
		['2021-09-04T05:19:52.000Z', minusNineThirty, '2021-09-04T05:19:52.000Z'],
		['2021-09-04T05:19:52+09:00', minusNineThirty, '2021-09-03T20:19:52.000Z'],
		['2021-09-04T05:19-0930', plusNine, '2021-09-04T14:49:00.000Z'],
		['2021-09-04T05+05:45', plusNine, '2021-09-03T23:15:00.000Z'],
		['2021-09T05:19:52.000-12', plusNine, '2021-09-01T17:19:52.000Z'],
		['2021-09T05:19:52Z', plusNine, '2021-09-01T05:19:52.000Z'],
		['2021-09T05:19+14:00', minusNine, '2021-08-31T15:19:00.000Z'],
		['2021-09T05-0000', plusNine, '2021-09-01T05:00:00.000Z'],
		['2021T05:19:52.000+0545', minusThree, '2020-12-31T23:34:52.000Z'],
		['2021T05:19:52-03:30', plusNine, '2021-01-01T08:49:52.000Z'],
		['2021T05:19Z', plusNine, '2021-01-01T05:19:00.000Z'],
		['2021T05+13:45', utc, '2020-12-31T15:15:00.000Z'],
	]))

	test('without options a string is read at the default offset or time zone', t => {
		const {defaultOffset} = OffsetDate
		const {defaultTimezone} = ZonedDate
		t.after(() => {
			OffsetDate.defaultOffset = defaultOffset
			ZonedDate.defaultTimezone = defaultTimezone
		})
		OffsetDate.defaultOffset = 9
		ZonedDate.defaultTimezone = 'Asia/Tokyo'
		pinClock(t, '2026-10-14T20:00:00Z') // 2026-10-15 05:00 at +09:00
		for (const [input, expected] of [
			['2021-09-04T05:00', '2021-09-03T20:00:00.000Z'], // the README example
			['2021-09-04T05:00Z', '2021-09-04T05:00:00.000Z'],
			['05:00', '2026-10-14T20:00:00.000Z'],
			['20:00Z', '2026-10-14T20:00:00.000Z'],
		]) for (const date of [new OffsetDate(input), new ZonedDate(input)]) {
			strictEqual(instant(date), expected, label(date, input))
			strictEqual(date.offset, 9, label(date, input))
		}
	})
})

describe('zone designators', () => {
	test('every documented spelling sets the instant', () => {
		// Temporal.Instant.from('2021-09-04T05:19:52.000' + zone)
		for (const [zone, expected] of [
			['Z', '2021-09-04T05:19:52.000Z'],
			['z', '2021-09-04T05:19:52.000Z'],
			['+00', '2021-09-04T05:19:52.000Z'],
			['-00', '2021-09-04T05:19:52.000Z'],
			['+00:00', '2021-09-04T05:19:52.000Z'],
			['-00:00', '2021-09-04T05:19:52.000Z'],
			['+0000', '2021-09-04T05:19:52.000Z'],
			['-0000', '2021-09-04T05:19:52.000Z'],
			['+09', '2021-09-03T20:19:52.000Z'],
			['-09', '2021-09-04T14:19:52.000Z'],
			['+09:00', '2021-09-03T20:19:52.000Z'],
			['-09:00', '2021-09-04T14:19:52.000Z'],
			['+0900', '2021-09-03T20:19:52.000Z'],
			['-0900', '2021-09-04T14:19:52.000Z'],
			['+05:45', '2021-09-03T23:34:52.000Z'],
			['+0545', '2021-09-03T23:34:52.000Z'],
			['-09:30', '2021-09-04T14:49:52.000Z'],
			['-0930', '2021-09-04T14:49:52.000Z'],
			['+13:45', '2021-09-03T15:34:52.000Z'],
			['+1345', '2021-09-03T15:34:52.000Z'],
			['+14:00', '2021-09-03T15:19:52.000Z'],
			['-12:00', '2021-09-04T17:19:52.000Z'],
			['+23:59', '2021-09-03T05:20:52.000Z'],
			['-23:59', '2021-09-05T05:18:52.000Z'],
		]) for (const date of both(`2021-09-04T05:19:52.000${zone}`, minusThree)) strictEqual(instant(date), expected, label(date, zone))
	})

	test('the zone sets the instant but keeps the instance offset and timezone', () => {
		// [input, instant, hours at +09:00]; the first row is the README example
		for (const [input, expected, hours] of [
			['2021-09-04T05:19Z', '2021-09-04T05:19:00.000Z', 14],
			['2021-09-04T05:19:52-04:00', '2021-09-04T09:19:52.000Z', 18],
		] as const) for (const date of both(input, plusNine)) {
			strictEqual(instant(date), expected, label(date, input))
			strictEqual(date.offset, 9, label(date, input))
			strictEqual(date.hours, hours, label(date, input))
		}
		strictEqual(new ZonedDate('2021-09-04T05:19:52-04:00', plusNine).timezone, 'Asia/Tokyo')
	})

	test('offsets with seconds are applied exactly', () => assertInstants([
		// Temporal.Instant.from
		['1800-01-01 00:00:00-04:56:02', utc, '1800-01-01T04:56:02.000Z'],
		['2021-09-04T05:00:00+05:30:00', utc, '2021-09-03T23:30:00.000Z'],
	]))

	test('offsets with seconds can omit the colons like other offsets', () => assertInstants([
		// Temporal.Instant.from
		['1800-01-01T00:00:00-045602', utc, '1800-01-01T04:56:02.000Z'],
		['2021-09-04T05:00:00+053000', utc, '2021-09-03T23:30:00.000Z'],
	]))

	test('offsets mixing colons and no colons are rejected', () => assertRejected([
		'2021-09-04T05:00+05:3000',
		'2021-09-04T05:00+0530:00',
	]))

	test('a one-digit offset hour is rejected', () => assertRejected([
		'2021-09-04T05:00+5:30',
		'2021-09-04T05:00+530',
		'2021-09-04T05:00-9:30',
	]))

	test('offset hours above 23 and offset minutes above 59 are rejected', () => assertRejected([
		// native Date and Temporal reject all of these
		'2021-09-04T05:00+24:00',
		'2021-09-04T05:00-24:00',
		'2021-09-04T05:00+05:60',
		'2021-09-04T05:00+99:99',
	]))

	test('an offset with the U+2212 minus sign is rejected', () => assertRejected([
		'2021-09-04T05:00\u221205:00',
	]))

	test('offsets that are not whole quarter hours keep millisecond precision', () => assertInstants([
		// Temporal.Instant.from and native Date
		['1970-01-01T00:31:00.334+00:31', utc, '1970-01-01T00:00:00.334Z'],
		['1969-12-31T22:54:03.643-00:31', utc, '1969-12-31T23:25:03.643Z'],
	]))
})

describe('separators and case', () => {
	test('lower-case t and z work like T and Z', () => assertInstants([
		['2021-09-04t05:19:52.5z', plusNine, '2021-09-04T05:19:52.500Z'],
		['1985-04-12t23:20:50.52z', plusNine, '1985-04-12T23:20:50.520Z'],
		['2021-09t05:19z', plusNine, '2021-09-01T05:19:00.000Z'],
		['2021t05', plusNine, '2020-12-31T20:00:00.000Z'],
	]))

	test('a space can replace the T between the date and the time', () => assertInstants([
		['2021-09-04 05:19:52', plusNine, '2021-09-03T20:19:52.000Z'],
		['2021-09-04 05:19:52.001-03:30', plusNine, '2021-09-04T08:49:52.001Z'],
		['2021-09 05:19Z', plusNine, '2021-09-01T05:19:00.000Z'],
		['2021 05', plusNine, '2020-12-31T20:00:00.000Z'],
	]))

	test('a time-only string may start with T, t or one space', t => {
		pinClock(t, '2026-10-14T12:00:00Z') // 2026-10-14 21:00 at +09:00
		assertInstants([
			['T05:19', plusNine, '2026-10-13T20:19:00.000Z'],
			['t05:19', plusNine, '2026-10-13T20:19:00.000Z'],
			[' 05:19', plusNine, '2026-10-13T20:19:00.000Z'],
			['t05:19z', plusNine, '2026-10-14T05:19:00.000Z'],
			[' 05:19Z', plusNine, '2026-10-14T05:19:00.000Z'],
		])
	})
})

describe('fractional seconds', () => {
	test('one to three digits are milliseconds', () => {
		for (const [fraction, expected] of [
			['5', '2021-09-04T05:19:52.500Z'],
			['05', '2021-09-04T05:19:52.050Z'],
			['52', '2021-09-04T05:19:52.520Z'],
			['001', '2021-09-04T05:19:52.001Z'],
			['010', '2021-09-04T05:19:52.010Z'],
			['123', '2021-09-04T05:19:52.123Z'],
			['999', '2021-09-04T05:19:52.999Z'],
			['000', '2021-09-04T05:19:52.000Z'],
		]) for (const date of both(`2021-09-04T05:19:52.${fraction}Z`, plusNine)) strictEqual(instant(date), expected, label(date, fraction))
		assertInstants([['2021-09-04T05:19:52.52', plusNine, '2021-09-03T20:19:52.520Z']])
	})

	test('digits after the millisecond are truncated', () => assertInstants([
		// Temporal.Instant.from(...).epochMilliseconds and native Date truncate
		['2021-01-01T00:00:00.9995Z', utc, '2021-01-01T00:00:00.999Z'],
		['2021-12-31T23:59:59.9999Z', utc, '2021-12-31T23:59:59.999Z'],
		['2021-01-01T00:00:00.0005Z', utc, '2021-01-01T00:00:00.000Z'],
	]))

	test('a comma decimal mark is rejected', () => assertRejected([
		'2021-09-04T05:19:52,5Z',
		'2021-09-04T05:19:52,123456789+09:00',
	]))
})

describe('database and RFC 3339 output', () => {
	// Temporal.Instant.from, or the wallclock at the instance offset when there is no zone
	test('PostgreSQL date, timestamp and timestamptz give the exact instant', () => assertInstants([
		['2023-10-05', minusThree, '2023-10-05T03:00:00.000Z'],
		['2023-10-29 01:44:45', minusThree, '2023-10-29T04:44:45.000Z'],
		['2023-10-25 01:44:59.32+11', minusThree, '2023-10-24T14:44:59.320Z'],
		['2023-10-25 01:44:59+05:45', minusThree, '2023-10-24T19:59:59.000Z'],
		['2023-10-25 01:44:59-03:30', minusThree, '2023-10-25T05:14:59.000Z'],
		['2023-10-25 01:44:59.123456+00', minusThree, '2023-10-25T01:44:59.123Z'],
	]))

	test('PostgreSQL time and timetz take today at the instance offset', t => {
		pinClock(t, '2026-10-14T12:00:00Z') // 2026-10-14 09:00 at -03:00
		assertInstants([
			['17:00:00', minusThree, '2026-10-14T20:00:00.000Z'],
			['03:20:00+11', minusThree, '2026-10-14T16:20:00.000Z'], // 13:20 at -03:00
		])
	})

	test('MySQL DATETIME gives the exact instant from its minimum to its maximum', () => assertInstants([
		['1000-01-01 00:00:00', utc, '1000-01-01T00:00:00.000Z'],
		['2023-10-29 01:44:45.123', minusThree, '2023-10-29T04:44:45.123Z'],
		['9999-12-31 23:59:59', utc, '9999-12-31T23:59:59.000Z'],
	]))

	test('the RFC 3339 examples give their exact instants', () => assertInstants([
		['1985-04-12T23:20:50.52Z', plusNine, '1985-04-12T23:20:50.520Z'],
		['1996-12-19T16:39:57-08:00', plusNine, '1996-12-20T00:39:57.000Z'],
		['1937-01-01T12:00:27.87+00:20', plusNine, '1937-01-01T11:40:27.870Z'],
	]))
})

describe('years', () => {
	test('the expanded years of toISOString() are read back', () => {
		// Temporal.Instant.from
		assertInstants([
			['+002021-09-04', utc, '2021-09-04T00:00:00.000Z'],
			['+002021-09-04T05:19:52Z', utc, '2021-09-04T05:19:52.000Z'],
			['+010000-01-01T04:59:59.000Z', plusNine, '+010000-01-01T04:59:59.000Z'],
			['-000100-06-15T12:00:00.000Z', utc, '-000100-06-15T12:00:00.000Z'],
			['+275760-09-13T00:00:00.000Z', utc, '+275760-09-13T00:00:00.000Z'],
			['-271821-04-20T00:00:00.000Z', utc, '-271821-04-20T00:00:00.000Z'],
		])
		// the year 0 has no negative form, and an expanded year has six digits
		assertRejected(['-000000-01-01T00:00Z', '+2021-09-04', '+0002021-09-04', '-02021'])
	})

	test('four-digit years from 0100 to 9999 are exact', () => assertInstants([
		['0100-01-01', utc, '0100-01-01T00:00:00.000Z'],
		['1969-12-31T23:59:59.999Z', utc, '1969-12-31T23:59:59.999Z'],
		['9999-12-31T23:59:59.999Z', utc, '9999-12-31T23:59:59.999Z'],
	]))

	test('years 0001 to 0099 keep their century', () => {
		// Temporal.PlainDateTime.from
		for (const [input, expected] of [
			['0001-01-01', '0001-01-01T00:00:00.000'],
			['0050-06-15T12:00', '0050-06-15T12:00:00.000'],
			['0099-12-31T23:59:59.999', '0099-12-31T23:59:59.999'],
		]) for (const date of both(input, plusNine)) strictEqual(wallclock(date), expected, label(date, input))
		// Temporal.Instant.from
		assertInstants([
			['0099-12-31T23:59:59.999Z', plusNine, '0099-12-31T23:59:59.999Z'],
			['0050-06-15T12:00:00+09:00', plusNine, '0050-06-15T03:00:00.000Z'],
		])
	})
})

describe('today for time-only strings', () => {
	test('a time without a zone is today at the instance offset', t => {
		pinClock(t, '2026-10-14T12:00:00Z')
		assertInstants([
			['05:00', utc, '2026-10-14T05:00:00.000Z'],
			['05:00', plusNine, '2026-10-13T20:00:00.000Z'], // 2026-10-14 21:00 at +09:00
			['05:00', minusNine, '2026-10-14T14:00:00.000Z'], // 2026-10-14 03:00 at -09:00
			['00:00', plusNine, '2026-10-13T15:00:00.000Z'],
			['23:59:59.999', minusNine, '2026-10-15T08:59:59.999Z'],
			['T05:19:52.120', minusNineThirty, '2026-10-14T14:49:52.120Z'],
			['05', minusThree, '2026-10-14T08:00:00.000Z'],
		])
	})

	test('a time with a zone stays on today at the instance offset', t => {
		pinClock(t, '2026-10-14T12:00:00Z')
		assertInstants([
			['15:00Z', plusNine, '2026-10-13T15:00:00.000Z'], // 2026-10-14 00:00 at +09:00
			['14:59Z', plusNine, '2026-10-14T14:59:00.000Z'], // 2026-10-14 23:59 at +09:00
			['08:00Z', minusNine, '2026-10-15T08:00:00.000Z'], // 2026-10-14 23:00 at -09:00
			['09:00Z', minusNine, '2026-10-14T09:00:00.000Z'], // 2026-10-14 00:00 at -09:00
			['T05:19:52.120+05:45', minusNineThirty, '2026-10-14T23:34:52.120Z'], // 2026-10-14 14:04:52.120 at -09:30
			['21:00+05:45', plusFiveFortyFive, '2026-10-14T15:15:00.000Z'],
			['02:00-09:30', plusFiveFortyFive, '2026-10-14T11:30:00.000Z'], // 2026-10-14 17:15 at +05:45
			['00:00+14:00', minusTen, '2026-10-14T10:00:00.000Z'], // 24 h apart: 2026-10-14 00:00 at -10:00
			['23:59-10:00', plusFourteen, '2026-10-15T09:59:00.000Z'], // 24 h apart: 2026-10-15 23:59 at +14:00
		])
	})

	test('hours of 24 and more move to the following days', t => {
		pinClock(t, '2026-10-14T12:00:00Z')
		assertInstants([
			['24:00', plusNine, '2026-10-14T15:00:00.000Z'], // 2026-10-15 00:00 at +09:00
			['24:00Z', plusNine, '2026-10-15T00:00:00.000Z'], // 2026-10-15 09:00 at +09:00
			['47:59', plusNine, '2026-10-15T14:59:00.000Z'],
			['48:00', plusNine, '2026-10-15T15:00:00.000Z'],
			['71:00Z', minusNine, '2026-10-16T23:00:00.000Z'], // 2026-10-16 14:00 at -09:00
			['99:00-09:30', minusThree, '2026-10-18T12:30:00.000Z'], // 2026-10-18 09:30 at -03:00
			['28:30', utc, '2026-10-15T04:30:00.000Z'],
		])
	})

	for (const [name, now, rows] of [
		['today rolls over at the end of a year', '2026-12-31T23:30:00Z', [
			['05:00', utc, '2026-12-31T05:00:00.000Z'],
			['05:00', plusNine, '2026-12-31T20:00:00.000Z'], // 2027-01-01 05:00 at +09:00
			['23:30Z', plusNine, '2026-12-31T23:30:00.000Z'], // 2027-01-01 08:30 at +09:00
			['03:00Z', minusThree, '2026-12-31T03:00:00.000Z'], // 2026-12-31 00:00 at -03:00
			['24:00', minusThree, '2027-01-01T03:00:00.000Z'],
			['00:00', plusFourteen, '2026-12-31T10:00:00.000Z'],
			['10:00+14:00', minusThree, '2026-12-31T20:00:00.000Z'], // 2026-12-31 17:00 at -03:00
		]],
		['today rolls over at the end of a month', '2026-10-31T23:30:00Z', [
			['24:00', utc, '2026-11-01T00:00:00.000Z'],
			['24:00Z', minusNine, '2026-11-02T00:00:00.000Z'], // 2026-11-01 15:00 at -09:00
			['48:00', plusNine, '2026-11-02T15:00:00.000Z'], // 2026-11-03 00:00 at +09:00
			['00:30', minusTwelve, '2026-10-31T12:30:00.000Z'],
			['15:00Z', plusNine, '2026-10-31T15:00:00.000Z'], // 2026-11-01 00:00 at +09:00
			['14:59Z', plusNine, '2026-11-01T14:59:00.000Z'], // 2026-11-01 23:59 at +09:00
		]],
		['today rolls over into a leap day', '2028-02-28T12:00:00Z', [
			['24:00', utc, '2028-02-29T00:00:00.000Z'],
			['12:00Z', plusFourteen, '2028-02-28T12:00:00.000Z'], // 2028-02-29 02:00 at +14:00
			['23:30', minusTwelve, '2028-02-29T11:30:00.000Z'],
		]],
		['today rolls over after a leap day', '2028-02-29T12:00:00Z', [
			['24:00', utc, '2028-03-01T00:00:00.000Z'],
			['23:30', minusTwelve, '2028-03-01T11:30:00.000Z'], // 2028-02-29 23:30 at -12:00
			['05:00', plusFourteen, '2028-02-29T15:00:00.000Z'], // 2028-03-01 05:00 at +14:00
			['00:30+14:00', utc, '2028-02-29T10:30:00.000Z'],
			['23:00Z', minusEleven, '2028-02-29T23:00:00.000Z'], // 2028-02-29 12:00 at -11:00
		]],
	] as const) test(name, t => {
		pinClock(t, now)
		assertInstants(rows)
	})

	// Temporal: the wallclock on today's date in the zone, at the offset in force then
	for (const [name, now, timezone, rows] of [
		['ZonedDate takes today in its zone on a spring-forward day', '2024-03-10T09:30:00Z', 'America/Los_Angeles', [
			['00:30', '2024-03-10T08:30:00.000Z'], // -08:00, before the gap
			['12:00', '2024-03-10T19:00:00.000Z'], // -07:00
			['06:30Z', '2024-03-11T06:30:00.000Z'], // 23:30 at -07:00
			['23:30-07:00', '2024-03-11T06:30:00.000Z'],
		]],
		['ZonedDate takes today in its zone on a fall-back day', '2024-11-03T07:30:00Z', 'America/Los_Angeles', [
			['12:00', '2024-11-03T20:00:00.000Z'], // -08:00
			['23:30', '2024-11-04T07:30:00.000Z'],
			['03:30-08:00', '2024-11-03T11:30:00.000Z'],
			['22:30-08:00', '2024-11-04T06:30:00.000Z'],
		]],
		['ZonedDate takes today in its zone on a day that starts at 01:00', '2024-09-08T15:00:00Z', 'America/Santiago', [
			['01:30', '2024-09-08T04:30:00.000Z'], // -03:00
			['00:30-04:00', '2024-09-08T04:30:00.000Z'],
			['23:30', '2024-09-09T02:30:00.000Z'],
		]],
		['ZonedDate takes today in its zone on a 30-minute DST day', '2024-10-05T14:00:00Z', 'Australia/Lord_Howe', [
			['01:00', '2024-10-05T14:30:00.000Z'], // +10:30
			['12:00', '2024-10-06T01:00:00.000Z'], // +11:00
		]],
	] as const) test(name, t => {
		pinClock(t, now)
		for (const [input, expected] of rows) strictEqual(instant(new ZonedDate(input, {timezone})), expected, input)
	})

	// Temporal. In Los Angeles, 07:30Z falls on 2024-03-09 (23:30 -08:00) and 2024-03-11 (00:30 -07:00), never on the
	// 23-hour 2024-03-10, and twice on the 25-hour 2024-11-03 (00:30 -07:00 and 23:30 -08:00)
	for (const [now, expected] of [
		['2024-03-10T08:30:00Z', '2024-03-11T07:30:00.000Z'], // 00:30 -08:00, before the change
		['2024-03-10T20:00:00Z', '2024-03-11T07:30:00.000Z'], // 13:00 -07:00, after it
		['2024-11-03T07:15:00Z', '2024-11-03T07:30:00.000Z'], // 00:15 -07:00
		['2024-11-03T20:00:00Z', '2024-11-03T07:30:00.000Z'], // 12:00 -08:00
	]) test(`on a DST day, a time with a zone takes the first instant on or after today (now ${now})`, t => {
		pinClock(t, now)
		strictEqual(instant(new ZonedDate('07:30Z', {timezone: 'America/Los_Angeles'})), expected)
	})

	test('an invalid clock gives an invalid date for a time-only string, like new Date()', t => {
		// NaN, or a time outside the Date range, which Date.now() never returns
		let clock = NaN
		t.mock.method(Date, 'now', () => clock)
		for (const now of [NaN, 8.64e15 + 1, -Infinity]) {
			clock = now
			for (const input of ['00:00', '09:00', '09:00Z']) for (const date of both(input, plusNine)) ok(Number.isNaN(date.time), `${label(date, input)}, clock ${now}`)
		}
	})

	test('the runtime time zone does not decide today', t => {
		useRuntimeTimezone(t, 'Pacific/Kiritimati')
		pinClock(t, '2026-12-31T23:00:00Z') // already 2027-01-01 13:00 in the runtime zone
		assertInstants([
			['05:00', utc, '2026-12-31T05:00:00.000Z'],
			['05:00', minusNine, '2026-12-31T14:00:00.000Z'],
			['23:30', minusTwelve, '2027-01-01T11:30:00.000Z'], // 2026-12-31 23:30 at -12:00
		])
	})

	test('a zone more than 24 hours from the instance offset still gives today', t => {
		pinClock(t, '2026-10-14T12:00:00Z') // 2026-10-15 02:00 at +14:00, 2026-10-14 00:00 at -12:00
		assertInstants([
			['22:00-12:00', plusFourteen, '2026-10-14T10:00:00.000Z'], // 2026-10-15 00:00 at +14:00
			['23:00-11:00', plusFourteen, '2026-10-14T10:00:00.000Z'],
			['00:00+14:00', minusTwelve, '2026-10-15T10:00:00.000Z'], // 2026-10-14 22:00 at -12:00
		])
	})

	test('a minute or second of 60 is rejected', t => {
		pinClock(t, '2026-10-14T12:00:00Z')
		// native Date rejects the leap second 23:59:60 too
		assertRejected(['23:60Z', '23:60', '2021-09-04T05:60', '2021-12-31T23:59:60Z'])
	})
})

describe('malformed strings', () => {
	test('malformed strings throw Error with the message Invalid date string', () => assertRejected([
		'',
		' ',
		'T',
		'Z',
		'abc',
		'2021-09-04T',
		'2021-09-04 ',
		'2021-09-04  05:00',
		'2021-09-04 05:00 +09:00',
		'2021-09-04T05:00T',
		'infinity',
		'-infinity',
		'0044-03-15 BC',
		'0044-03-15 12:00:00+00 BC',
		'2021-W35-6',
		'2021-xx-04',
		'2021-09-04-01',
		'-0044-03-15',
		'2021-09-04T05::52',
		'2021-09-04T05:19:52:00',
		'2021-09-04T-05:00',
		'2021-09-04T05:00ZZ',
		'2021-09-04T05:00+',
		'2021-09-04T05:00+09:xx',
		'Sat, 04 Sep 2021 05:19:52 GMT',
		'2021-09-04T05:19:52.000Z\n',
		'２０２１-09-04',
		'-838:59:59',
		'05:19:xx',
	]))

	test('months and days outside their ranges are rejected', () => assertRejected([
		// native Date and Temporal reject all of these; a day past the end of a shorter month, such as 2021-02-30, is left out because native Date rolls it over
		'2021-13-45',
		'2021-00-10',
		'2021-09-00',
		'2021-09-32',
		'0000-00-00 00:00:00',
	]))

	test('a day past the end of its month and an hour past 23 after a date are rejected', () => {
		// Temporal rejects all of these
		assertRejected(['2021-02-29', '2021-04-31', '1900-02-29', '2021-09-04T24:00', '2021-09-04 25:00Z'])
		// leap days
		assertInstants([
			['2024-02-29', utc, '2024-02-29T00:00:00.000Z'],
			['2000-02-29T12:00Z', plusNine, '2000-02-29T12:00:00.000Z'],
		])
	})

	test('trailing characters are rejected', () => assertRejected([
		'2021-09-04abc',
		'2021-09-04T05:19abc',
		'2021-09-04T05:19:52xyz',
		'2021-09-0405:19Z',
		'2021-09-04T05:00Z+09:00',
	]))

	test('a zone after a date without a time is rejected', () => assertRejected([
		'2021-09-04+09:00',
		'2021-09Z',
		'2021Z',
	]))

	test('a T followed by four digits is rejected', t => {
		pinClock(t, '2026-10-14T12:00:00Z')
		assertRejected(['T2021', 'T0519', 't2021Z'])
	})

	test('ISO 8601 basic format and ordinal dates are rejected', () => assertRejected([
		'2021-09-04T0519Z',
		'2021-09-04T051952Z',
		'20210904',
		'20210904T051952Z',
		'2021-247',
	]))

	test('dates that do not start with a four-digit year are rejected', t => {
		pinClock(t, '2026-10-14T12:00:00Z')
		assertRejected(['21-09-04', '04-09-2021', '09-04-2021', '99-12-31'])
	})

	test('leading whitespace before a date is rejected', t => {
		pinClock(t, '2026-10-14T12:00:00Z')
		assertRejected([' 2021-09-04', '\t2021-09-04', '\n2021-09-04', '\u00a02021-09-04'])
	})

	test('slash, dot and week dates are rejected', () => assertRejected([
		'2021/09/04',
		'2021/09/04 05:19:52',
		'2021.09.04',
		'2021W356',
	]))

	test('a 12-hour clock suffix is rejected', () => assertRejected([
		'2021-09-04T05:00PM',
		'2021-09-04T05:00 PM',
		'2021-09-04 5PM',
	]))

	test('a bracketed time zone annotation is rejected', () => assertRejected([
		'2021-09-04T05:00:00+09:00[Asia/Seoul]',
		'2021-09-04T05:00:00+09:00[Asia/Tokyo]',
		'2021-09-04T05:00+02:00[!Europe/Berlin]',
		'2021-09-04T05:00Z[UTC]',
	]))
})

function both(input: string, zone: Zone) {
	return [new OffsetDate(input, zone), new ZonedDate(input, zone)]
}

function instant(date: OffsetDate | ZonedDate) {
	return new Date(date.time).toISOString()
}

function wallclock(date: OffsetDate | ZonedDate) {
	return `${pad(date.fullYear, 4)}-${pad(date.month + 1)}-${pad(date.date)}T${pad(date.hours)}:${pad(date.minutes)}:${pad(date.seconds)}.${pad(date.milliseconds, 3)}`
}

function pad(value: number, length = 2) {
	return String(value).padStart(length, '0')
}

function label(date: OffsetDate | ZonedDate, input: string) {
	return `${date.constructor.name} ${JSON.stringify(input)}`
}

function assertInstants(rows: readonly (readonly [string, Zone, string])[]) {
	for (const [input, zone, expected] of rows) for (const date of both(input, zone)) strictEqual(instant(date), expected, label(date, input))
}

function assertRejected(inputs: string[]) {
	for (const input of inputs) {
		throws(() => new OffsetDate(input, plusNine), invalidDateString, `OffsetDate ${JSON.stringify(input)}`)
		throws(() => new ZonedDate(input, plusNine), invalidDateString, `ZonedDate ${JSON.stringify(input)}`)
	}
}

function pinClock(t: TestContext, iso: string) {
	t.mock.timers.enable({apis: ['Date'], now: Date.parse(iso)})
}

function useRuntimeTimezone(t: TestContext, timezone: string) {
	const previous = process.env.TZ
	process.env.TZ = timezone
	t.after(() => {
		if (previous === undefined) delete process.env.TZ
		else process.env.TZ = previous
	})
}

// The option constants at the top, which both() passes to both classes
interface Zone {
	offset: number
	timezone: string
}
