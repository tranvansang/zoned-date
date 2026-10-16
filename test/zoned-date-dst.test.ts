import {describe, test} from 'node:test'
import {ok, strictEqual, throws} from 'node:assert'
import ZonedDate from 'zoned-date/ZonedDate'

// Every expected instant, wallclock and offset below comes from Temporal (Node 26.5, tzdata 2026b):
// - wallclock -> instant: Temporal.PlainDateTime.from(wall).toZonedDateTime(timezone, {disambiguation})
// - instant -> wallclock: Temporal.Instant.fromEpochMilliseconds(time).toZonedDateTimeISO(timezone)
// Only transitions from 2023 or earlier are used, so new tzdata rules cannot change the expectations.
// Offsets are compared with strictEqual, so a zero offset must be +0, as in Temporal and Date.

const disambiguations = ['compatible', 'earlier', 'later', 'reject'] as const
// README: 'reject' throws RangeError('Ambiguous time') when the instant is read
const ambiguousTime = {name: 'RangeError', message: 'Ambiguous time'}

describe('fold resolution', () => {
	test('compatible and earlier pick the first occurrence', () => {
		for (const [timezone, wall, instant, offset] of [
			['America/Los_Angeles', '2023-11-05T01:30', '2023-11-05T08:30:00.000Z', -7], // -07:00 -> -08:00
			['America/Los_Angeles', '2023-11-05T01:00', '2023-11-05T08:00:00.000Z', -7], // first ms of the fold
			['America/Los_Angeles', '2023-11-05T01:59:59.999', '2023-11-05T08:59:59.999Z', -7], // last ms of the fold
			['Australia/Sydney', '2023-04-02T02:30', '2023-04-01T15:30:00.000Z', 11], // +11:00 -> +10:00
			['Australia/Sydney', '2023-04-02T02:59:59.999', '2023-04-01T15:59:59.999Z', 11],
			['Europe/Paris', '2023-10-29T02:30', '2023-10-29T00:30:00.000Z', 2], // +02:00 -> +01:00
			['America/St_Johns', '2023-11-05T01:30', '2023-11-05T04:00:00.000Z', -2.5], // -02:30 -> -03:30
			['Australia/Adelaide', '2023-04-02T02:30', '2023-04-01T16:00:00.000Z', 10.5], // +10:30 -> +09:30
			['Pacific/Chatham', '2023-04-02T03:15', '2023-04-01T13:30:00.000Z', 13.75], // +13:45 -> +12:45
			['America/Sao_Paulo', '2019-02-16T23:30', '2019-02-17T01:30:00.000Z', -2], // -02:00 -> -03:00, 23:00-23:59 repeated
			['Atlantic/Azores', '2023-10-29T00:30', '2023-10-29T00:30:00.000Z', 0], // +00:00 -> -01:00
			['America/Caracas', '2007-12-09T02:45', '2007-12-09T06:45:00.000Z', -4], // -04:00 -> -04:30, a 30-minute fold
		] as const) for (const disambiguation of ['compatible', 'earlier'] as const) {
			const date = new ZonedDate(wall, {timezone, disambiguation})
			const message = `${timezone} ${wall} ${disambiguation}`
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
	})

	test('later picks the second occurrence', () => {
		for (const [timezone, wall, instant, offset] of [
			['America/Los_Angeles', '2023-11-05T01:30', '2023-11-05T09:30:00.000Z', -8],
			['America/Los_Angeles', '2023-11-05T01:00', '2023-11-05T09:00:00.000Z', -8],
			['America/Los_Angeles', '2023-11-05T01:59:59.999', '2023-11-05T09:59:59.999Z', -8],
			['Australia/Sydney', '2023-04-02T02:30', '2023-04-01T16:30:00.000Z', 10],
			['Australia/Sydney', '2023-04-02T02:59:59.999', '2023-04-01T16:59:59.999Z', 10],
			['Europe/Paris', '2023-10-29T02:30', '2023-10-29T01:30:00.000Z', 1],
			['America/St_Johns', '2023-11-05T01:30', '2023-11-05T05:00:00.000Z', -3.5],
			['Australia/Adelaide', '2023-04-02T02:30', '2023-04-01T17:00:00.000Z', 9.5],
			['Pacific/Chatham', '2023-04-02T03:15', '2023-04-01T14:30:00.000Z', 12.75],
			['America/Sao_Paulo', '2019-02-16T23:30', '2019-02-17T02:30:00.000Z', -3],
			['Europe/London', '2023-10-29T01:30', '2023-10-29T01:30:00.000Z', 0], // +01:00 -> +00:00
			['Australia/Lord_Howe', '2023-04-02T01:45', '2023-04-01T15:15:00.000Z', 10.5], // +11:00 -> +10:30, a 30-minute fold
		] as const) {
			const date = new ZonedDate(wall, {timezone, disambiguation: 'later'})
			strictEqual(iso(date.time), instant, `${timezone} ${wall}`)
			strictEqual(date.offset, offset, `${timezone} ${wall}`)
		}
	})

	test('reject throws RangeError for a wallclock that occurs twice', () => {
		for (const [timezone, wall] of [
			['America/Los_Angeles', '2023-11-05T01:00'],
			['America/Los_Angeles', '2023-11-05T01:59:59.999'],
			['Australia/Sydney', '2023-04-02T02:30'],
			['Europe/Paris', '2023-10-29T02:30'],
			['America/St_Johns', '2023-11-05T01:30'],
			['Pacific/Chatham', '2023-04-02T03:15'],
			['America/Sao_Paulo', '2019-02-16T23:30'],
			['Australia/Lord_Howe', '2023-04-02T01:45'],
			['America/Caracas', '2007-12-09T02:45'],
			['America/New_York', '1883-11-18T12:02'], // LMT -04:56:02 -> EST, 12:00:00-12:03:57 repeated
		]) throws(() => new ZonedDate(wall, {timezone, disambiguation: 'reject'}).time, ambiguousTime, `${timezone} ${wall}`)
	})

	test('the wallclocks just before and just after a fold are unique', () => {
		for (const [timezone, wall, instant, offset] of [
			['America/Los_Angeles', '2023-11-05T00:59:59.999', '2023-11-05T07:59:59.999Z', -7],
			['America/Los_Angeles', '2023-11-05T02:00', '2023-11-05T10:00:00.000Z', -8],
			['Australia/Sydney', '2023-04-02T01:59:59.999', '2023-04-01T14:59:59.999Z', 11],
			['Australia/Sydney', '2023-04-02T03:00', '2023-04-01T17:00:00.000Z', 10],
			['Europe/London', '2023-10-29T00:59:59.999', '2023-10-28T23:59:59.999Z', 1],
			['Europe/London', '2023-10-29T02:00', '2023-10-29T02:00:00.000Z', 0],
			['Australia/Lord_Howe', '2023-04-02T01:29:59.999', '2023-04-01T14:29:59.999Z', 11],
			['Australia/Lord_Howe', '2023-04-02T02:00', '2023-04-01T15:30:00.000Z', 10.5],
			['Antarctica/Troll', '2023-10-29T00:59:59.999', '2023-10-28T22:59:59.999Z', 2], // +02:00 -> +00:00, 01:00-02:59 repeated
			['Antarctica/Troll', '2023-10-29T03:00', '2023-10-29T03:00:00.000Z', 0],
			['Antarctica/Casey', '2010-03-04T22:59:59.999', '2010-03-04T11:59:59.999Z', 11], // +11:00 -> +08:00, 23:00-01:59 repeated
			['Antarctica/Casey', '2010-03-05T02:00', '2010-03-04T18:00:00.000Z', 8],
		] as const) for (const disambiguation of disambiguations) {
			const date = new ZonedDate(wall, {timezone, disambiguation})
			const message = `${timezone} ${wall} ${disambiguation}`
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
	})

	test('a fold with a +00:00 side honors disambiguation', () => {
		for (const [timezone, wall, disambiguation, instant, offset] of [
			['Europe/London', '2023-10-29T01:30', 'compatible', '2023-10-29T00:30:00.000Z', 1], // Temporal: 01:30+01:00
			['Europe/London', '2023-10-29T01:30', 'earlier', '2023-10-29T00:30:00.000Z', 1],
			['Atlantic/Azores', '2023-10-29T00:30', 'later', '2023-10-29T01:30:00.000Z', -1], // Temporal: 00:30-01:00
		] as const) {
			const date = new ZonedDate(wall, {timezone, disambiguation})
			const message = `${timezone} ${wall} ${disambiguation}`
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
		for (const [timezone, wall] of [
			['Europe/London', '2023-10-29T01:30'],
			['Atlantic/Azores', '2023-10-29T00:30'],
		]) throws(() => new ZonedDate(wall, {timezone, disambiguation: 'reject'}).time, ambiguousTime, `${timezone} ${wall}`)
	})

	test('a fold that is not one hour long resolves to one of its two instants', () => {
		for (const [timezone, wall, disambiguation, instant, offset] of [
			['Australia/Lord_Howe', '2023-04-02T01:45', 'compatible', '2023-04-01T14:45:00.000Z', 11], // Temporal: 01:45+11:00
			['Australia/Lord_Howe', '2023-04-02T01:45', 'earlier', '2023-04-01T14:45:00.000Z', 11],
			['America/Caracas', '2007-12-09T02:45', 'later', '2007-12-09T07:15:00.000Z', -4.5], // Temporal: 02:45-04:30
			['America/New_York', '1883-11-18T12:00', 'later', '1883-11-18T17:00:00.000Z', -5], // LMT -04:56:02 -> EST
			['Antarctica/Casey', '2010-03-04T23:30', 'compatible', '2010-03-04T12:30:00.000Z', 11], // +11:00 -> +08:00
		] as const) {
			const date = new ZonedDate(wall, {timezone, disambiguation})
			const message = `${timezone} ${wall} ${disambiguation}`
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
	})

	test('a fold longer than one hour is detected', () => {
		for (const [timezone, wall, disambiguation, instant, offset] of [
			['Antarctica/Casey', '2010-03-05T00:30', 'compatible', '2010-03-04T13:30:00.000Z', 11], // +11:00 -> +08:00, a 3-hour fold
			['America/Argentina/La_Rioja', '1991-02-28T22:30', 'later', '1991-03-01T02:30:00.000Z', -4], // -02:00 -> -04:00, a 2-hour fold
			['Pacific/Kwajalein', '1969-09-30T23:00', 'compatible', '1969-09-30T12:00:00.000Z', 11], // +11:00 -> -12:00, a 23-hour fold
			['Antarctica/Troll', '2023-10-29T02:30', 'compatible', '2023-10-29T00:30:00.000Z', 2], // +02:00 -> +00:00, a 2-hour fold with a +00:00 side
		] as const) {
			const date = new ZonedDate(wall, {timezone, disambiguation})
			const message = `${timezone} ${wall} ${disambiguation}`
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
		for (const [timezone, wall] of [
			['Antarctica/Casey', '2010-03-05T00:30'],
			['America/Argentina/La_Rioja', '1991-02-28T22:30'],
			['Pacific/Kwajalein', '1969-09-30T23:00'],
			['Antarctica/Troll', '2023-10-29T02:30'],
		]) throws(() => new ZonedDate(wall, {timezone, disambiguation: 'reject'}).time, ambiguousTime, `${timezone} ${wall}`)
	})
})

describe('gap resolution', () => {
	test('reject throws RangeError for a skipped wallclock', () => {
		for (const [timezone, wall] of [
			['America/Los_Angeles', '2023-03-12T02:00'], // -08:00 -> -07:00, 02:00-02:59 skipped
			['America/Los_Angeles', '2023-03-12T02:59:59.999'],
			['Europe/London', '2023-03-26T01:30'], // +00:00 -> +01:00
			['Atlantic/Azores', '2023-03-26T00:30'], // -01:00 -> +00:00
			['Australia/Sydney', '2023-10-01T02:30'], // +10:00 -> +11:00
			['America/St_Johns', '2023-03-12T02:30'], // -03:30 -> -02:30
			['Pacific/Chatham', '2023-09-24T03:00'], // +12:45 -> +13:45
			['Australia/Lord_Howe', '2023-10-01T02:15'], // +10:30 -> +11:00, a 30-minute gap
			['Asia/Kathmandu', '1986-01-01T00:10'], // +05:30 -> +05:45, a 15-minute gap
			['Antarctica/Troll', '2023-03-26T02:30'], // +00:00 -> +02:00, a 2-hour gap
		]) throws(() => new ZonedDate(wall, {timezone, disambiguation: 'reject'}).time, ambiguousTime, `${timezone} ${wall}`)
	})

	test('the wallclocks just before and just after a gap are unique', () => {
		for (const [timezone, wall, instant, offset] of [
			['America/Los_Angeles', '2023-03-12T01:59:59.999', '2023-03-12T09:59:59.999Z', -8],
			['America/Los_Angeles', '2023-03-12T03:00', '2023-03-12T10:00:00.000Z', -7],
			['Europe/London', '2023-03-26T00:59:59.999', '2023-03-26T00:59:59.999Z', 0],
			['Europe/London', '2023-03-26T02:00', '2023-03-26T01:00:00.000Z', 1],
			['Atlantic/Azores', '2023-03-25T23:59:59.999', '2023-03-26T00:59:59.999Z', -1],
			['Atlantic/Azores', '2023-03-26T01:00', '2023-03-26T01:00:00.000Z', 0],
			['Australia/Sydney', '2023-10-01T01:59:59.999', '2023-09-30T15:59:59.999Z', 10],
			['Australia/Sydney', '2023-10-01T03:00', '2023-09-30T16:00:00.000Z', 11],
			['Australia/Lord_Howe', '2023-10-01T01:59:59.999', '2023-09-30T15:29:59.999Z', 10.5],
			['Australia/Lord_Howe', '2023-10-01T02:30', '2023-09-30T15:30:00.000Z', 11],
			['Asia/Kathmandu', '1985-12-31T23:59:59.999', '1985-12-31T18:29:59.999Z', 5.5],
			['Asia/Kathmandu', '1986-01-01T00:15', '1985-12-31T18:30:00.000Z', 5.75],
			['Antarctica/Troll', '2023-03-26T00:59:59.999', '2023-03-26T00:59:59.999Z', 0],
			['Antarctica/Troll', '2023-03-26T03:00', '2023-03-26T01:00:00.000Z', 2],
		] as const) for (const disambiguation of disambiguations) {
			const date = new ZonedDate(wall, {timezone, disambiguation})
			const message = `${timezone} ${wall} ${disambiguation}`
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
	})

	test('a skipped wallclock gets the instant and offset after the gap, or before it with earlier', () => {
		// Temporal: the earlier and later instants, and the offsets before and after the one-hour gap
		for (const [timezone, wall, earlier, later, offsetBefore, offsetAfter] of [
			['America/Los_Angeles', '2023-03-12T02:30', '2023-03-12T09:30:00.000Z', '2023-03-12T10:30:00.000Z', -8, -7],
			['Europe/London', '2023-03-26T01:30', '2023-03-26T00:30:00.000Z', '2023-03-26T01:30:00.000Z', 0, 1],
			['Atlantic/Azores', '2023-03-26T00:30', '2023-03-26T00:30:00.000Z', '2023-03-26T01:30:00.000Z', -1, 0],
			['Australia/Sydney', '2023-10-01T02:30', '2023-09-30T15:30:00.000Z', '2023-09-30T16:30:00.000Z', 10, 11],
			['Australia/Adelaide', '2023-10-01T02:30', '2023-09-30T16:00:00.000Z', '2023-09-30T17:00:00.000Z', 9.5, 10.5],
			['America/St_Johns', '2023-03-12T02:30', '2023-03-12T05:00:00.000Z', '2023-03-12T06:00:00.000Z', -3.5, -2.5],
			['Pacific/Chatham', '2023-09-24T03:00', '2023-09-23T13:15:00.000Z', '2023-09-23T14:15:00.000Z', 12.75, 13.75],
			['America/Sao_Paulo', '2018-11-04', '2018-11-04T02:00:00.000Z', '2018-11-04T03:00:00.000Z', -3, -2], // midnight gap
		] as const) for (const disambiguation of ['compatible', 'earlier', 'later'] as const) {
			const date = new ZonedDate(wall, {timezone, disambiguation})
			const message = `${timezone} ${wall} ${disambiguation}`
			strictEqual(iso(date.time), disambiguation === 'earlier' ? earlier : later, message)
			strictEqual(date.offset, disambiguation === 'earlier' ? offsetBefore : offsetAfter, message)
		}
	})

	test('a skipped wallclock moves forward for compatible and later and back for earlier', () => {
		for (const [timezone, wall, disambiguation, instant, offset] of [
			['America/Los_Angeles', '2023-03-12T02:30', 'compatible', '2023-03-12T10:30:00.000Z', -7], // Temporal: 03:30-07:00
			['America/Los_Angeles', '2023-03-12T02:30', 'later', '2023-03-12T10:30:00.000Z', -7],
			['America/Los_Angeles', '2023-03-12T02:30', 'earlier', '2023-03-12T09:30:00.000Z', -8], // Temporal: 01:30-08:00
			['America/Los_Angeles', '2023-03-12T02:00', 'compatible', '2023-03-12T10:00:00.000Z', -7], // the first skipped wallclock, Temporal: 03:00-07:00
			['Europe/London', '2023-03-26T01:30', 'compatible', '2023-03-26T01:30:00.000Z', 1],
			['Australia/Sydney', '2023-10-01T02:30', 'earlier', '2023-09-30T15:30:00.000Z', 10],
			['America/Sao_Paulo', '2018-11-04', 'compatible', '2018-11-04T03:00:00.000Z', -2], // midnight gap
		] as const) {
			const date = new ZonedDate(wall, {timezone, disambiguation})
			const message = `${timezone} ${wall} ${disambiguation}`
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
		for (const [timezone, wall, readBack] of [
			['America/Los_Angeles', '2023-03-12T02:30', '2023-03-12T03:30:00.000'],
			['America/Sao_Paulo', '2018-11-04', '2018-11-04T01:00:00.000'],
		]) {
			const date = new ZonedDate(wall, {timezone})
			strictEqual(wallclock(new ZonedDate(date.time, {timezone})), readBack, `${timezone} ${wall}`)
		}
	})

	test('a gap that is not one hour long reports the real offsets', () => {
		for (const [timezone, wall, disambiguation, instant, offset] of [
			['Australia/Lord_Howe', '2023-10-01T02:15', 'compatible', '2023-09-30T15:45:00.000Z', 11], // Temporal: 02:45+11:00
			['Australia/Lord_Howe', '2023-10-01T02:15', 'earlier', '2023-09-30T15:15:00.000Z', 10.5], // Temporal: 01:45+10:30
			['Asia/Kathmandu', '1986-01-01T00:10', 'compatible', '1985-12-31T18:40:00.000Z', 5.75],
			['Asia/Kathmandu', '1986-01-01T00:10', 'earlier', '1985-12-31T18:25:00.000Z', 5.5],
			['Antarctica/Troll', '2023-03-26T01:30', 'compatible', '2023-03-26T01:30:00.000Z', 2],
			['Pacific/Apia', '2011-12-30T12:00', 'compatible', '2011-12-30T22:00:00.000Z', 14], // skipped day
			['Pacific/Apia', '2011-12-30T12:00', 'earlier', '2011-12-29T22:00:00.000Z', -10],
		] as const) {
			const date = new ZonedDate(wall, {timezone, disambiguation})
			const message = `${timezone} ${wall} ${disambiguation}`
			strictEqual(date.offset, offset, message)
			strictEqual(iso(date.time), instant, message)
		}
	})
})

describe('instant resolution', () => {
	test('an instant next to a transition round-trips with every disambiguation', () => {
		for (const [timezone, instant, wall, offset] of [
			['America/Los_Angeles', '2023-03-12T09:59:59.999Z', '2023-03-12T01:59:59.999', -8], // last instant before the gap
			['America/Los_Angeles', '2023-03-12T10:00:00.000Z', '2023-03-12T03:00:00.000', -7], // transition instant
			['America/Los_Angeles', '2023-11-05T07:59:59.999Z', '2023-11-05T00:59:59.999', -7], // last instant before the fold
			['America/Los_Angeles', '2023-11-05T10:00:00.000Z', '2023-11-05T02:00:00.000', -8], // first instant after the fold
			['Australia/Sydney', '2023-09-30T15:59:59.999Z', '2023-10-01T01:59:59.999', 10],
			['Australia/Sydney', '2023-09-30T16:00:00.000Z', '2023-10-01T03:00:00.000', 11],
			['Australia/Sydney', '2023-04-01T14:59:59.999Z', '2023-04-02T01:59:59.999', 11],
			['Australia/Sydney', '2023-04-01T17:00:00.000Z', '2023-04-02T03:00:00.000', 10],
			['Europe/London', '2023-03-26T00:59:59.999Z', '2023-03-26T00:59:59.999', 0],
			['Europe/London', '2023-03-26T01:00:00.000Z', '2023-03-26T02:00:00.000', 1],
			['Europe/London', '2023-10-28T23:59:59.999Z', '2023-10-29T00:59:59.999', 1],
			['Europe/London', '2023-10-29T02:00:00.000Z', '2023-10-29T02:00:00.000', 0],
			['Australia/Lord_Howe', '2023-09-30T15:29:59.999Z', '2023-10-01T01:59:59.999', 10.5],
			['Australia/Lord_Howe', '2023-09-30T15:30:00.000Z', '2023-10-01T02:30:00.000', 11],
			['Asia/Kathmandu', '1985-12-31T18:29:59.999Z', '1985-12-31T23:59:59.999', 5.5],
			['Asia/Kathmandu', '1985-12-31T18:30:00.000Z', '1986-01-01T00:15:00.000', 5.75],
			['Antarctica/Troll', '2023-03-26T00:59:59.999Z', '2023-03-26T00:59:59.999', 0],
			['Antarctica/Troll', '2023-03-26T01:00:00.000Z', '2023-03-26T03:00:00.000', 2],
		] as const) for (const disambiguation of disambiguations) {
			const date = new ZonedDate(Date.parse(instant), {timezone, disambiguation})
			const message = `${timezone} ${instant} ${disambiguation}`
			strictEqual(wallclock(date), wall, message)
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
	})

	test('wallclock getters follow an instant through both occurrences of a fold', () => {
		for (const [timezone, instant, wall] of [
			['America/Los_Angeles', '2023-11-05T08:00:00.000Z', '2023-11-05T01:00:00.000'], // first occurrence, -07:00
			['America/Los_Angeles', '2023-11-05T08:59:59.999Z', '2023-11-05T01:59:59.999'],
			['America/Los_Angeles', '2023-11-05T09:00:00.000Z', '2023-11-05T01:00:00.000'], // second occurrence, -08:00
			['America/Los_Angeles', '2023-11-05T09:59:59.999Z', '2023-11-05T01:59:59.999'],
			['Europe/London', '2023-10-29T00:30:00.000Z', '2023-10-29T01:30:00.000'],
			['Europe/London', '2023-10-29T01:30:00.000Z', '2023-10-29T01:30:00.000'],
			['America/Sao_Paulo', '2019-02-17T01:30:00.000Z', '2019-02-16T23:30:00.000'],
			['America/Sao_Paulo', '2019-02-17T02:30:00.000Z', '2019-02-16T23:30:00.000'],
			['Australia/Lord_Howe', '2023-04-01T14:45:00.000Z', '2023-04-02T01:45:00.000'],
			['Australia/Lord_Howe', '2023-04-01T15:15:00.000Z', '2023-04-02T01:45:00.000'],
			['Antarctica/Troll', '2023-10-29T00:30:00.000Z', '2023-10-29T02:30:00.000'],
			['Antarctica/Troll', '2023-10-29T02:30:00.000Z', '2023-10-29T02:30:00.000'],
			['Pacific/Kwajalein', '1969-09-30T12:59:59.999Z', '1969-09-30T23:59:59.999'], // +11:00 -> -12:00, 01:00-23:59 of 1969-09-30 repeated
			['Pacific/Kwajalein', '1969-09-30T13:00:00.000Z', '1969-09-30T01:00:00.000'],
			['Pacific/Kwajalein', '1969-10-01T11:59:59.999Z', '1969-09-30T23:59:59.999'],
			['Pacific/Kwajalein', '1969-10-01T12:00:00.000Z', '1969-10-01T00:00:00.000'],
		]) for (const disambiguation of disambiguations) {
			const date = new ZonedDate(Date.parse(instant), {timezone, disambiguation})
			strictEqual(wallclock(date), wall, `${timezone} ${instant} ${disambiguation}`)
		}
	})

	test('an instant in the first occurrence of a fold round-trips with compatible and earlier', () => {
		for (const [timezone, instant, offset] of [
			['America/Los_Angeles', '2023-11-05T08:00:00.000Z', -7],
			['America/Los_Angeles', '2023-11-05T08:59:59.999Z', -7],
			['Australia/Sydney', '2023-04-01T15:00:00.000Z', 11],
			['Australia/Sydney', '2023-04-01T15:59:59.999Z', 11],
			['Pacific/Chatham', '2023-04-01T13:30:00.000Z', 13.75],
			['America/Sao_Paulo', '2019-02-17T01:30:00.000Z', -2],
			['Atlantic/Azores', '2023-10-29T00:30:00.000Z', 0],
		] as const) for (const disambiguation of ['compatible', 'earlier'] as const) {
			const date = new ZonedDate(Date.parse(instant), {timezone, disambiguation})
			const message = `${timezone} ${instant} ${disambiguation}`
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
	})

	test('an instant in the second occurrence of a fold round-trips with later', () => {
		for (const [timezone, instant, offset] of [
			['America/Los_Angeles', '2023-11-05T09:00:00.000Z', -8], // transition instant
			['America/Los_Angeles', '2023-11-05T09:59:59.999Z', -8],
			['Australia/Sydney', '2023-04-01T16:00:00.000Z', 10], // transition instant
			['Australia/Sydney', '2023-04-01T16:59:59.999Z', 10],
			['Pacific/Chatham', '2023-04-01T14:30:00.000Z', 12.75],
			['America/Sao_Paulo', '2019-02-17T02:30:00.000Z', -3],
			['Europe/London', '2023-10-29T01:00:00.000Z', 0], // transition instant
			['Australia/Lord_Howe', '2023-04-01T15:15:00.000Z', 10.5],
		] as const) {
			const date = new ZonedDate(Date.parse(instant), {timezone, disambiguation: 'later'})
			strictEqual(iso(date.time), instant, `${timezone} ${instant}`)
			strictEqual(date.offset, offset, `${timezone} ${instant}`)
		}
	})

	test('an instant inside a fold keeps its epoch and offset', () => {
		for (const [timezone, instant, disambiguation, offset] of [
			['America/Los_Angeles', '2023-11-05T09:30:00.000Z', 'compatible', -8], // Temporal: 01:30-08:00
			['America/Los_Angeles', '2023-11-05T09:00:00.000Z', 'earlier', -8], // transition instant
			['America/Los_Angeles', '2023-11-05T08:30:00.000Z', 'later', -7], // Temporal: 01:30-07:00
			['Australia/Sydney', '2023-04-01T16:30:00.000Z', 'compatible', 10],
			['Europe/London', '2023-10-29T00:30:00.000Z', 'compatible', 1], // Temporal: 01:30+01:00
		] as const) {
			const date = new ZonedDate(Date.parse(instant), {timezone, disambiguation})
			const message = `${timezone} ${instant} ${disambiguation}`
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
		// Date: new Date('2023-11-05T09:30:00.000Z').getUTCHours() is 9
		strictEqual(new ZonedDate(Date.parse('2023-11-05T09:30:00.000Z'), {timezone: 'America/Los_Angeles'}).utcHours, 9, 'utcHours of 2023-11-05T09:30:00.000Z')
	})

	test('reject does not throw for an exact instant inside a fold', () => {
		for (const [timezone, instant, offset] of [
			['America/Los_Angeles', '2023-11-05T08:30:00.000Z', -7],
			['America/Los_Angeles', '2023-11-05T09:30:00.000Z', -8],
			['Australia/Sydney', '2023-04-01T15:30:00.000Z', 11],
		] as const) {
			const date = new ZonedDate(Date.parse(instant), {timezone, disambiguation: 'reject'})
			strictEqual(iso(date.time), instant, `${timezone} ${instant}`)
			strictEqual(date.offset, offset, `${timezone} ${instant}`)
		}
	})
})

describe('skipped days and midnight gaps', () => {
	test('the wallclocks around a skipped day or hour are unique', () => {
		for (const [timezone, wall, instant, offset, day] of [
			['Pacific/Apia', '2011-12-29T23:59:59.999', '2011-12-30T09:59:59.999Z', -10, 4], // -10:00 -> +14:00, Friday skipped
			['Pacific/Apia', '2011-12-31T00:00:00.000', '2011-12-30T10:00:00.000Z', 14, 6],
			['Pacific/Kwajalein', '1993-08-20T23:59:59.999', '1993-08-21T11:59:59.999Z', -12, 5], // -12:00 -> +12:00, Saturday skipped
			['Pacific/Kwajalein', '1993-08-22T00:00:00.000', '1993-08-21T12:00:00.000Z', 12, 0],
			['Pacific/Kiritimati', '1994-12-30T23:59:59.999', '1994-12-31T09:59:59.999Z', -10, 5], // -10:00 -> +14:00, Saturday skipped
			['Pacific/Kiritimati', '1995-01-01T00:00:00.000', '1994-12-31T10:00:00.000Z', 14, 0],
			['America/Sao_Paulo', '2018-11-03T23:59:59.999', '2018-11-04T02:59:59.999Z', -3, 6], // -03:00 -> -02:00 at midnight
			['America/Sao_Paulo', '2018-11-04T01:00:00.000', '2018-11-04T03:00:00.000Z', -2, 0],
		] as const) {
			for (const disambiguation of disambiguations) {
				const date = new ZonedDate(wall, {timezone, disambiguation})
				const message = `${timezone} ${wall} ${disambiguation}`
				strictEqual(iso(date.time), instant, message)
				strictEqual(date.offset, offset, message)
			}
			const fromInstant = new ZonedDate(Date.parse(instant), {timezone})
			strictEqual(wallclock(fromInstant), wall, `${timezone} ${instant}`)
			strictEqual(fromInstant.day, day, `${timezone} ${instant}`)
		}
	})

	test('reject throws RangeError for every wallclock of a skipped day or hour', () => {
		for (const [timezone, wall] of [
			['Pacific/Apia', '2011-12-30T00:00'],
			['Pacific/Apia', '2011-12-30T12:00'],
			['Pacific/Apia', '2011-12-30T23:59:59.999'],
			['Pacific/Kwajalein', '1993-08-21T00:00'],
			['Pacific/Kwajalein', '1993-08-21T12:00'],
			['Pacific/Kiritimati', '1994-12-31T12:00'],
			['America/Sao_Paulo', '2018-11-04'], // a date-only string means midnight
			['America/Sao_Paulo', '2018-11-04T00:30'],
			['America/Sao_Paulo', '2017-10-15'],
		]) throws(() => new ZonedDate(wall, {timezone, disambiguation: 'reject'}).time, ambiguousTime, `${timezone} ${wall}`)
	})
})

describe('fractional and fixed offsets', () => {
	test('a constant fractional offset converts both ways', () => {
		for (const [timezone, wall, instant, offset] of [
			['Asia/Kathmandu', '2023-06-15T12:00:00.000', '2023-06-15T06:15:00.000Z', 5.75],
			['Asia/Kathmandu', '2023-01-01T05:45:00.000', '2023-01-01T00:00:00.000Z', 5.75],
			['Australia/Eucla', '2023-06-15T12:00:00.000', '2023-06-15T03:15:00.000Z', 8.75],
			['Pacific/Marquesas', '2023-06-15T12:00:00.000', '2023-06-15T21:30:00.000Z', -9.5],
			['Pacific/Kiritimati', '1969-12-31T13:20:00.000', '1970-01-01T00:00:00.000Z', -10.666666666666666], // -10:40
			['Pacific/Kiritimati', '1970-01-01T00:00:00.000', '1970-01-01T10:40:00.000Z', -10.666666666666666],
		] as const) {
			for (const disambiguation of disambiguations) {
				const date = new ZonedDate(wall, {timezone, disambiguation})
				const message = `${timezone} ${wall} ${disambiguation}`
				strictEqual(iso(date.time), instant, message)
				strictEqual(date.offset, offset, message)
			}
			strictEqual(wallclock(new ZonedDate(Date.parse(instant), {timezone})), wall, `${timezone} ${instant}`)
		}
	})

	test('UTC and Etc zones resolve every wallclock with every disambiguation', () => {
		for (const [timezone, wall, instant, offset] of [
			['UTC', '2023-03-12T02:30:00.000', '2023-03-12T02:30:00.000Z', 0],
			['Etc/UTC', '2023-10-29T01:30:00.000', '2023-10-29T01:30:00.000Z', 0],
			['Etc/GMT+12', '2023-11-05T01:30:00.000', '2023-11-05T13:30:00.000Z', -12], // the Etc sign is inverted
			['Etc/GMT-14', '2023-03-26T01:30:00.000', '2023-03-25T11:30:00.000Z', 14],
		] as const) for (const disambiguation of disambiguations) {
			const message = `${timezone} ${wall} ${disambiguation}`
			const fromWall = new ZonedDate(wall, {timezone, disambiguation})
			strictEqual(iso(fromWall.time), instant, message)
			strictEqual(fromWall.offset, offset, message)
			const fromInstant = new ZonedDate(Date.parse(instant), {timezone, disambiguation})
			strictEqual(wallclock(fromInstant), wall, message)
			strictEqual(iso(fromInstant.time), instant, message)
		}
	})

	test('zones with unusual DST rules report their seasonal offsets', () => {
		for (const [timezone, instant, wall, offset] of [
			['Antarctica/Troll', '2023-01-01T00:00:00.000Z', '2023-01-01T00:00:00.000', 0],
			['Antarctica/Troll', '2023-07-01T00:00:00.000Z', '2023-07-01T02:00:00.000', 2], // two-hour DST
			['Europe/Dublin', '2023-01-01T12:00:00.000Z', '2023-01-01T12:00:00.000', 0], // negative DST in tzdata
			['Europe/Dublin', '2023-07-01T12:00:00.000Z', '2023-07-01T13:00:00.000', 1],
		] as const) {
			const date = new ZonedDate(Date.parse(instant), {timezone})
			strictEqual(wallclock(date), wall, `${timezone} ${instant}`)
			strictEqual(date.offset, offset, `${timezone} ${instant}`)
		}
	})
})

describe('setters across transitions', () => {
	test('a wallclock setter that lands in a fold resolves with the instance disambiguation', () => {
		for (const [message, date, instant, offset] of [
			['setHours(1) compatible', new ZonedDate('2023-11-05T00:30', {timezone: 'America/Los_Angeles'}).setHours(1), '2023-11-05T08:30:00.000Z', -7],
			['setHours(1) later', new ZonedDate('2023-11-05T00:30', {timezone: 'America/Los_Angeles', disambiguation: 'later'}).setHours(1), '2023-11-05T09:30:00.000Z', -8],
			['setDate(5) later', new ZonedDate('2023-11-04T01:30', {timezone: 'America/Los_Angeles', disambiguation: 'later'}).setDate(5), '2023-11-05T09:30:00.000Z', -8],
			['setMonth(10) later', new ZonedDate('2023-10-05T01:30', {timezone: 'America/Los_Angeles', disambiguation: 'later'}).setMonth(10), '2023-11-05T09:30:00.000Z', -8],
			['setDate(2) later', new ZonedDate('2023-04-01T02:30', {timezone: 'Australia/Sydney', disambiguation: 'later'}).setDate(2), '2023-04-01T16:30:00.000Z', 10],
			['setTimezone later', new ZonedDate('2023-11-05T01:30', {timezone: 'UTC', disambiguation: 'later'}).setTimezone('America/Los_Angeles'), '2023-11-05T09:30:00.000Z', -8],
			['setDisambiguation(later)', new ZonedDate('2023-11-05T01:30', {timezone: 'America/Los_Angeles'}).setDisambiguation('later'), '2023-11-05T09:30:00.000Z', -8],
		] as const) {
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
		const rejected = new ZonedDate('2023-11-05T00:30', {timezone: 'America/Los_Angeles', disambiguation: 'reject'}).setHours(1)
		strictEqual(wallclock(rejected), '2023-11-05T01:30:00.000', 'setHours(1) reject')
		throws(() => rejected.time, ambiguousTime, 'setHours(1) reject')
	})

	test('a wallclock setter that lands in a gap with reject throws when the instant is read', () => {
		for (const [message, date, wall] of [
			['setHours(2)', new ZonedDate('2023-03-12T01:30', {timezone: 'America/Los_Angeles', disambiguation: 'reject'}).setHours(2), '2023-03-12T02:30:00.000'],
			['setMinutes(60)', new ZonedDate('2023-03-12T01:59', {timezone: 'America/Los_Angeles', disambiguation: 'reject'}).setMinutes(60), '2023-03-12T02:00:00.000'],
			['setFullYear(2023)', new ZonedDate('2022-03-12T02:30', {timezone: 'America/Los_Angeles', disambiguation: 'reject'}).setFullYear(2023), '2023-03-12T02:30:00.000'],
			['setDate(4)', new ZonedDate('2018-11-03', {timezone: 'America/Sao_Paulo', disambiguation: 'reject'}).setDate(4), '2018-11-04T00:00:00.000'],
			['setTimezone', new ZonedDate('2023-03-12T02:30', {timezone: 'UTC', disambiguation: 'reject'}).setTimezone('America/Los_Angeles'), '2023-03-12T02:30:00.000'],
		] as const) {
			strictEqual(wallclock(date), wall, message)
			throws(() => date.time, ambiguousTime, message)
		}
	})

	test('a wallclock setter that leaves a fold or gap resolves uniquely', () => {
		for (const [message, date, instant, offset] of [
			['fold setHours(2)', new ZonedDate('2023-11-05T01:30', {timezone: 'America/Los_Angeles', disambiguation: 'reject'}).setHours(2), '2023-11-05T10:30:00.000Z', -8],
			['fold setHours(0)', new ZonedDate('2023-11-05T01:30', {timezone: 'America/Los_Angeles', disambiguation: 'reject'}).setHours(0), '2023-11-05T07:30:00.000Z', -7],
			['gap setHours(3)', new ZonedDate('2023-03-12T02:30', {timezone: 'America/Los_Angeles', disambiguation: 'reject'}).setHours(3), '2023-03-12T10:30:00.000Z', -7],
		] as const) {
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
	})

	test('a wallclock setter resolves the new wallclock, and an unchanged wallclock keeps its instant', () => {
		// 09:30Z is the second 01:30 in Los Angeles (-08:00)
		const second = Date.parse('2023-11-05T09:30:00.000Z')
		for (const [message, date, instant, offset] of [
			['setMinutes(minutes => minutes)', new ZonedDate(second, {timezone: 'America/Los_Angeles'}).setMinutes(minutes => minutes), '2023-11-05T09:30:00.000Z', -8],
			['setHours(1)', new ZonedDate(second, {timezone: 'America/Los_Angeles'}).setHours(1), '2023-11-05T09:30:00.000Z', -8],
			['setMinutes(31) compatible', new ZonedDate(second, {timezone: 'America/Los_Angeles'}).setMinutes(31), '2023-11-05T08:31:00.000Z', -7],
			['setMinutes(31) later', new ZonedDate(second, {timezone: 'America/Los_Angeles', disambiguation: 'later'}).setMinutes(31), '2023-11-05T09:31:00.000Z', -8],
		] as const) {
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
	})

	test('setTimezone to another name of the same zone keeps an instant in a repeated hour', () => {
		// 09:30Z is the second 01:30 in Los Angeles; the aliases show the same wallclock at that instant
		for (const timezone of ['US/Pacific', 'america/los_angeles']) {
			const date = new ZonedDate(Date.parse('2023-11-05T09:30:00.000Z'), {timezone: 'America/Los_Angeles'}).setTimezone(timezone)
			strictEqual(iso(date.time), '2023-11-05T09:30:00.000Z', timezone)
			strictEqual(new ZonedDate(new ZonedDate(Date.parse('2023-11-05T09:30:00.000Z'), {timezone: 'America/Los_Angeles'}), {timezone}).time, Date.parse('2023-11-05T09:30:00.000Z'), timezone)
		}
	})

	test('setDisambiguation resolves the current wallclock again', () => {
		const second = Date.parse('2023-11-05T09:30:00.000Z')
		for (const [disambiguation, instant] of [
			['later', '2023-11-05T09:30:00.000Z'],
			['earlier', '2023-11-05T08:30:00.000Z'],
		] as const) strictEqual(iso(new ZonedDate(second, {timezone: 'America/Los_Angeles'}).setDisambiguation(disambiguation).time), instant, disambiguation)
		// a wallclock that occurs once keeps its instant
		strictEqual(iso(new ZonedDate(Date.parse('2023-11-05T12:00:00.000Z'), {timezone: 'America/Los_Angeles'}).setDisambiguation('earlier').time), '2023-11-05T12:00:00.000Z')
	})

	test('setDate keeps the wallclock across a 23-hour and a 25-hour day', () => {
		for (const [wall, day, instant, offset] of [
			['2023-03-11T12:00', 12, '2023-03-12T19:00:00.000Z', -7], // 23 hours after 2023-03-11T20:00Z
			['2023-11-04T12:00', 5, '2023-11-05T20:00:00.000Z', -8], // 25 hours after 2023-11-04T19:00Z
		] as const) {
			const date = new ZonedDate(wall, {timezone: 'America/Los_Angeles'}).setDate(day)
			strictEqual(iso(date.time), instant, `${wall} setDate(${day})`)
			strictEqual(date.offset, offset, `${wall} setDate(${day})`)
		}
	})

	test('setTime and UTC setters move the instant across a gap', () => {
		for (const [message, date, instant, wall, offset] of [
			['setUTCHours(10) from 01:30 PST', new ZonedDate(Date.parse('2023-03-12T09:30:00.000Z'), {timezone: 'America/Los_Angeles'}).setUTCHours(10), '2023-03-12T10:30:00.000Z', '2023-03-12T03:30:00.000', -7],
			['setUTCHours(9) from 03:30 PDT', new ZonedDate(Date.parse('2023-03-12T10:30:00.000Z'), {timezone: 'America/Los_Angeles'}).setUTCHours(9), '2023-03-12T09:30:00.000Z', '2023-03-12T01:30:00.000', -8],
			['setTime(time => time + 1) from 01:59:59.999', new ZonedDate('2023-03-12T01:59:59.999', {timezone: 'America/Los_Angeles'}).setTime(time => time + 1), '2023-03-12T10:00:00.000Z', '2023-03-12T03:00:00.000', -7],
		] as const) {
			strictEqual(iso(date.time), instant, message)
			strictEqual(wallclock(date), wall, message)
			strictEqual(date.offset, offset, message)
		}
	})

	test('setTime and UTC setters that land in the matching occurrence of a fold keep the instant', () => {
		for (const [message, date, instant, offset] of [
			['setUTCHours(8) compatible', new ZonedDate(Date.parse('2023-11-05T07:30:00.000Z'), {timezone: 'America/Los_Angeles'}).setUTCHours(8), '2023-11-05T08:30:00.000Z', -7],
			['setTime(08:30Z) compatible', new ZonedDate('2023-11-05T00:00', {timezone: 'America/Los_Angeles'}).setTime(Date.parse('2023-11-05T08:30:00.000Z')), '2023-11-05T08:30:00.000Z', -7],
			['setUTCHours(9) later', new ZonedDate(Date.parse('2023-11-05T07:30:00.000Z'), {timezone: 'America/Los_Angeles', disambiguation: 'later'}).setUTCHours(9), '2023-11-05T09:30:00.000Z', -8],
			['setTime(09:30Z) later', new ZonedDate('2023-11-05T00:00', {timezone: 'America/Los_Angeles', disambiguation: 'later'}).setTime(Date.parse('2023-11-05T09:30:00.000Z')), '2023-11-05T09:30:00.000Z', -8],
		] as const) {
			strictEqual(iso(date.time), instant, message)
			strictEqual(wallclock(date), '2023-11-05T01:30:00.000', message)
			strictEqual(date.offset, offset, message)
		}
	})

	test('setTime and UTC setters that land in the other occurrence of a fold keep the instant', () => {
		for (const [message, date, instant, offset] of [
			['setTime(time => time + 1) from 00:59:59.999 later', new ZonedDate('2023-11-05T00:59:59.999', {timezone: 'America/Los_Angeles', disambiguation: 'later'}).setTime(time => time + 1), '2023-11-05T08:00:00.000Z', -7],
			['setUTCHours(9) from 07:30Z compatible', new ZonedDate(Date.parse('2023-11-05T07:30:00.000Z'), {timezone: 'America/Los_Angeles'}).setUTCHours(9), '2023-11-05T09:30:00.000Z', -8],
			['withUTCHours(9) from 10:15Z compatible', new ZonedDate(Date.parse('2023-11-05T10:15:00.000Z'), {timezone: 'America/Los_Angeles'}).withUTCHours(9), '2023-11-05T09:15:00.000Z', -8],
		] as const) {
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
	})
})

describe('explicit offsets in strings', () => {
	test('a string with an offset resolves to that instant', () => {
		for (const [string, disambiguation, instant, wall, offset] of [
			['2023-11-05T01:30:00-07:00', 'compatible', '2023-11-05T08:30:00.000Z', '2023-11-05T01:30:00.000', -7],
			['2023-11-05T01:30:00-08:00', 'later', '2023-11-05T09:30:00.000Z', '2023-11-05T01:30:00.000', -8],
			['2023-03-12T02:30:00-08:00', 'compatible', '2023-03-12T10:30:00.000Z', '2023-03-12T03:30:00.000', -7], // skipped wallclock, read back as 03:30
			['2023-03-12T02:30:00-07:00', 'compatible', '2023-03-12T09:30:00.000Z', '2023-03-12T01:30:00.000', -8],
			['2023-03-12T02:30:00-08:00', 'reject', '2023-03-12T10:30:00.000Z', '2023-03-12T03:30:00.000', -7],
		] as const) {
			const date = new ZonedDate(string, {timezone: 'America/Los_Angeles', disambiguation})
			const message = `${string} ${disambiguation}`
			strictEqual(iso(date.time), instant, message)
			strictEqual(wallclock(date), wall, message)
			strictEqual(date.offset, offset, message)
		}
	})

	test('an explicit offset selects the occurrence of a fold wallclock', () => {
		for (const [string, disambiguation, instant, offset] of [
			['2023-11-05T01:30:00-08:00', 'compatible', '2023-11-05T09:30:00.000Z', -8],
			['2023-11-05T01:30:00-08:00', 'earlier', '2023-11-05T09:30:00.000Z', -8],
			['2023-11-05T01:30:00-07:00', 'later', '2023-11-05T08:30:00.000Z', -7],
			['2023-11-05T09:30:00Z', 'compatible', '2023-11-05T09:30:00.000Z', -8],
			['2023-11-05T01:30:00-07:00', 'reject', '2023-11-05T08:30:00.000Z', -7],
		] as const) {
			const date = new ZonedDate(string, {timezone: 'America/Los_Angeles', disambiguation})
			const message = `${string} ${disambiguation}`
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
	})
})

describe('reject', () => {
	test('the RangeError is thrown when the instant is read, not at construction', () => {
		for (const [message, date, wall, day] of [
			['fold string', new ZonedDate('2023-11-05T01:30', {timezone: 'America/Los_Angeles', disambiguation: 'reject'}), '2023-11-05T01:30:00.000', 0],
			['gap parts', new ZonedDate(2023, 2, 12, 2, 30, {timezone: 'America/Los_Angeles', disambiguation: 'reject'}), '2023-03-12T02:30:00.000', 0],
		] as const) {
			strictEqual(wallclock(date), wall, message)
			strictEqual(date.day, day, message)
			throws(() => date.time, ambiguousTime, message)
			throws(() => date.getTime(), ambiguousTime, message)
			throws(() => date.offset, ambiguousTime, message)
			throws(() => date.timezoneOffset, ambiguousTime, message)
			throws(() => date.utcHours, ambiguousTime, message)
			throws(() => date.setUTCMinutes(0), ambiguousTime, message)
			throws(() => date.toDate(), ambiguousTime, message)
		}
	})
})

describe('offsets with seconds', () => {
	test('the wallclocks right after a seconds offset resolve exactly', () => {
		for (const [timezone, wall, instant, offset] of [
			['America/New_York', '1883-11-18T12:04', '1883-11-18T17:04:00.000Z', -5], // LMT -04:56:02 -> EST at 17:00Z
			['Africa/Monrovia', '1972-01-07T00:44:30', '1972-01-07T00:44:30.000Z', 0], // -00:44:30 -> +00:00
			['Africa/Monrovia', '1972-01-07T00:45', '1972-01-07T00:45:00.000Z', 0],
		] as const) for (const disambiguation of disambiguations) {
			const date = new ZonedDate(wall, {timezone, disambiguation})
			const message = `${timezone} ${wall} ${disambiguation}`
			strictEqual(iso(date.time), instant, message)
			strictEqual(date.offset, offset, message)
		}
		for (const [timezone, instant, wall] of [
			['America/New_York', '1883-11-18T17:00:00.000Z', '1883-11-18T12:00:00.000'],
			['Africa/Monrovia', '1972-01-07T00:44:30.000Z', '1972-01-07T00:44:30.000'],
		]) strictEqual(wallclock(new ZonedDate(Date.parse(instant), {timezone})), wall, `${timezone} ${instant}`)
	})

	test('offsets with seconds are not rounded to whole minutes', () => {
		for (const [timezone, wall, instant] of [
			['America/New_York', '1800-01-01T12:00', '1800-01-01T16:56:02.000Z'], // LMT -04:56:02
			['Africa/Monrovia', '1970-06-01T12:00', '1970-06-01T12:44:30.000Z'], // -00:44:30
		]) strictEqual(iso(new ZonedDate(wall, {timezone}).time), instant, `${timezone} ${wall}`)
		// the offset is compared in whole seconds, so the float that represents the hours does not matter
		for (const [timezone, instant, wall, offsetSeconds] of [
			['America/New_York', '1800-01-01T12:00:00.000Z', '1800-01-01T07:03:58.000', -17762],
			['Africa/Monrovia', '1970-01-01T00:00:00.000Z', '1969-12-31T23:15:30.000', -2670],
			['Africa/Monrovia', '1970-01-01T00:00:00.001Z', '1969-12-31T23:15:30.001', -2670],
		] as const) {
			const date = new ZonedDate(Date.parse(instant), {timezone})
			strictEqual(wallclock(date), wall, `${timezone} ${instant}`)
			strictEqual(Math.round(date.offset * 3600), offsetSeconds, `${timezone} ${instant}`)
		}
	})

	test('rounding does not move the edges of a transition from a seconds offset', () => {
		for (const [timezone, wall, disambiguation, instant] of [
			['America/New_York', '1883-11-18T12:03:58.500', 'reject', '1883-11-18T17:03:58.500Z'],
			['America/New_York', '1883-11-18T12:03:59.999', 'compatible', '1883-11-18T17:03:59.999Z'],
			['Asia/Kolkata', '1905-12-31T23:59:59', 'compatible', '1905-12-31T18:38:49.000Z'], // +05:21:10 -> +05:30 at 18:38:50Z
		] as const) strictEqual(iso(new ZonedDate(wall, {timezone, disambiguation}).time), instant, `${timezone} ${wall} ${disambiguation}`)
		throws(() => new ZonedDate('1972-01-07T00:00', {timezone: 'Africa/Monrovia', disambiguation: 'reject'}).time, ambiguousTime, 'Africa/Monrovia 1972-01-07T00:00 reject')
	})
})

function iso(time: number) {
	return new Date(time).toISOString()
}

function wallclock(date: ZonedDate) {
	return `${date.fullYear}-${pad(date.month + 1)}-${pad(date.date)}T${pad(date.hours)}:${pad(date.minutes)}:${pad(date.seconds)}.${pad(date.milliseconds, 3)}`
}

function pad(value: number, length = 2) {
	return String(value).padStart(length, '0')
}
