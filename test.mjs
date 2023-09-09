import OffsetDate from './OffsetDate.mjs'
import assert from 'node:assert'
import test, {describe} from 'node:test'
import ZonedDate from './ZonedDate.mjs'

describe('OffsetDate', () => {
	test('OffsetDate', () => {
		const date = new OffsetDate(Date.UTC(2020, 1, 2, 3, 4, 5, 6), {offset: 7.5})
		assert.strictEqual(date.fullYear, 2020)
		assert.strictEqual(date.month, 1)
		assert.strictEqual(date.date, 2)
		assert.strictEqual(date.hours - 7, 3)
		assert.strictEqual(date.minutes - 30, 4)
		assert.strictEqual(date.seconds, 5)
		assert.strictEqual(date.milliseconds, 6)
		assert.strictEqual(date.offset, 7.5)
		assert.strictEqual(date.timezoneOffset, -7.5 * 60)
	})
	test('utc method', () => {
		const date = new OffsetDate(Date.UTC(2020, 1, 2, 3, 4, 5, 6), {offset: 7.5})
		date.utcFullYear = 2000
		assert.strictEqual(date.utcFullYear, 2000)
		date.setUTCFullYear(2001)
		assert.strictEqual(date.utcFullYear, 2001)
	})

	test('string parser', () => {
		const cases = [
			['2021-09-04T05:19:52.001Z', {fullYear: 2021, month: 8, date: 4, hours: 5, minutes: 19, seconds: 52, milliseconds: 1}],
			['2021-09-04T05:19:52Z', {fullYear: 2021, month: 8, date: 4, hours: 5, minutes: 19, seconds: 52}],
			['2021-09-04T05:19Z', {fullYear: 2021, month: 8, date: 4, hours: 5, minutes: 19}],
			['2021-09-04T05Z', {fullYear: 2021, month: 8, date: 4, hours: 5}],
			['2021-09-04', {fullYear: 2021, month: 8, date: 4}],
			['2021-09T05:19:52.010Z', {fullYear: 2021, month: 8, hours: 5, minutes: 19, seconds: 52, milliseconds: 10}],
			['2021-09T05:19:52Z', {fullYear: 2021, month: 8, hours: 5, minutes: 19, seconds: 52}],
			['2021-09T05:19Z', {fullYear: 2021, month: 8, hours: 5, minutes: 19}],
			['2021-09T05Z', {fullYear: 2021, month: 8, hours: 5}],
			['2021-09', {fullYear: 2021, month: 8}],
			['2021T05:19:52.900Z', {fullYear: 2021, hours: 5, minutes: 19, seconds: 52, milliseconds: 900}],
			['2021T05:19:52Z', {fullYear: 2021, hours: 5, minutes: 19, seconds: 52}],
			['2021T05:19Z', {fullYear: 2021, hours: 5, minutes: 19}],
			['2021T05Z', {fullYear: 2021, hours: 5}],
			['2021', {fullYear: 2021}],
			['T05:19:52.120Z', {hours: 5, minutes: 19, seconds: 52, milliseconds: 120}],
			['T05:19:52Z', {hours: 5, minutes: 19, seconds: 52}],
			['T05:19Z', {hours: 5, minutes: 19}],
			['T05Z', {hours: 5}],
			['05:19:52.023Z', {hours: 5, minutes: 19, seconds: 52, milliseconds: 23}],
			['05:19:52Z', {hours: 5, minutes: 19, seconds: 52}],
			['05:19Z', {hours: 5, minutes: 19}],
			['05Z', {hours: 5}],
		]
		const zones = [
			['', undefined],
			['Z', 0],

			['+00:00', 0],
			['-00:00', 0],
			['+0000', 0],
			['-0000', 0],
			['+00', 0],
			['-00', 0],

			['+09:00', 9],
			['-09:00', -9],
			['+0900', 9],
			['-0900', -9],
			['+09', 9],
			['-09', -9],

			['+09:30', 9.5],
			['-09:30', -9.5],
			['+0930', 9.5],
			['-0930', -9.5],
		]

		const defaultOffsets = [
			0, 7, 7.5, -7, -7.5
		]

		for (const defaultOffset of defaultOffsets) {
			// OffsetDate.defaultOffset = defaultOffset
			for (const [dateStr, info] of cases) {
				for (let [zoneStr, zoneOffset] of zones) {
					// we disable offset because it does not show in the date string
					if (!dateStr.includes('Z')) zoneOffset = undefined

					const str = dateStr.replace('Z', zoneStr)
					const offsetDate = new OffsetDate(str, {offset: defaultOffset})

					// note: defaultOffset, not zoneOffset
					// must design a test case that fails if defaultOffset is not used
					const nowInUtcView = new Date(Date.now() + defaultOffset * 60 * 60 * 1000)
					// must have at least one test fails with the following uncommented
					// const nowInUtcView = new Date(Date.now() + (zoneOffset ?? defaultOffset) * 60 * 60 * 1000)

					const expected = Date.UTC(
						info.fullYear ?? nowInUtcView.getUTCFullYear(),
						info.month ?? nowInUtcView.getUTCMonth(),
						info.date ?? nowInUtcView.getUTCDate(),
						info.hours ?? 0,
						info.minutes ?? 0,
						info.seconds ?? 0,
						info.milliseconds ?? 0,
					) + (zoneOffset ?? defaultOffset) * 60 * 60 * 1000

					// console.log(
					// 	defaultOffset,
					// 	str,
					// 	'expected',
					// 	info.fullYear ?? nowInUtcView.getUTCFullYear(),
					// 	info.month ?? nowInUtcView.getUTCMonth(),
					// 	info.date ?? nowInUtcView.getUTCDate(),
					// 	info.hours ?? 0,
					// 	info.minutes ?? 0,
					// 	info.seconds ?? 0,
					// 	info.milliseconds ?? 0,
					// 	zoneOffset,
					// 	defaultOffset,
					// 	offsetDate,
					// 	new Date(expected),
					// )
					assert.strictEqual(offsetDate.time, expected)
					assert.strictEqual(offsetDate.offset, defaultOffset)
					assert.strictEqual(offsetDate.timezoneOffset, -60 * defaultOffset)
				}
			}
		}
	})

	test('special cases', () => {
		assert.strictEqual(new OffsetDate('28:30').hours, 4)
		assert.strictEqual(new OffsetDate('28:30').minutes, 30)
	})
})

describe('zoned date', () => {
	test('simple', () => {
		const date = new ZonedDate('2021-09-04T05:19:52.001Z')
		assert.strictEqual(date.fullYear, 2021)
		assert.strictEqual(date.month, 8)
		assert.strictEqual(date.date, 4)
		assert.strictEqual(date.hours, 5)
		assert.strictEqual(date.minutes, 19)
		assert.strictEqual(date.seconds, 52)
		assert.strictEqual(date.milliseconds, 1)
		assert.ok(date.offset === 0) // 0 vs -0
		assert.strictEqual(date.timezone, 'UTC')
		assert.ok(date.timezoneOffset === 0)
	})

	test('with timezone', () => {
		const abs = new Date('2021-09-04T05:19:52.001Z')
		for (const [timezone, offset] of [
			['Asia/Tokyo', 9],
			['America/New_York', -4],
		]) {
			for (const isStr of [true, false]) {
				const date = new ZonedDate(
					isStr ? abs.toISOString() : abs.getTime(),
					{timezone}
				)
				assert.strictEqual(date.fullYear, 2021)
				assert.strictEqual(date.month, 8)
				assert.strictEqual(date.date, 4)
				assert.strictEqual(date.hours, 5 + offset)
				assert.strictEqual(date.minutes, 19)
				assert.strictEqual(date.seconds, 52)
				assert.strictEqual(date.milliseconds, 1)
				assert.strictEqual(date.offset, offset)
				assert.strictEqual(date.timezone, timezone)
				assert.strictEqual(date.timezoneOffset, -offset * 60)
			}
		}
	})

	test('with timezone no timezone specified in str', () => {
		for (const [timezone, offset] of [
			['Asia/Tokyo', 9],
			['America/New_York', -4],
		]) {
			const date = new ZonedDate('2021-09-04T05:19:52.001', {timezone})
			assert.strictEqual(date.fullYear, 2021)
			assert.strictEqual(date.month, 8)
			assert.strictEqual(date.date, 4)
			assert.strictEqual(date.hours, 5)
			assert.strictEqual(date.minutes, 19)
			assert.strictEqual(date.seconds, 52)
			assert.strictEqual(date.milliseconds, 1)
			assert.strictEqual(date.offset, offset)
			assert.strictEqual(date.timezone, timezone)
			assert.strictEqual(date.timezoneOffset, -offset * 60)
		}
	})

	test('change timezone', () => {
		const date = new ZonedDate('2021-09-04T05:19:52.001', {timezone: 'Asia/Tokyo'})
		assert.strictEqual(date.hours, 5)
		date.timezone = 'Asia/Bangkok'
		assert.strictEqual(date.hours, 5 - 9 + 7)
		date.timezone = 'UTC'
		assert.strictEqual(date.hours, 5 - 9 + 24)
		date.timezone = 'America/New_York'
		assert.strictEqual(date.hours, 5 - 9 + -4 + 24)
	})

	test('dst option', () => {
		for (const [timezone, wallclock, disambiguation, expected] of [
			// positive dst
			// forward, dst starts
			['Australia/ACT', '2023-10-01T02:00:00.000', undefined, 11],
			['Australia/ACT', '2023-10-01T02:30:00.000', undefined, 11],
			['Australia/ACT', '2023-10-01T02:30:00.000', 'compatible', 11],
			['Australia/ACT', '2023-10-01T02:30:00.000', 'earlier', 10],
			['Australia/ACT', '2023-10-01T02:30:00.000', 'later', 11],
			// backward, dst ends
			['Australia/ACT', '2023-04-02T02:00:00.000', undefined, 11],
			['Australia/ACT', '2023-04-02T02:30:00.000', undefined, 11],
			['Australia/ACT', '2023-04-02T02:30:00.000', 'compatible', 11],
			['Australia/ACT', '2023-04-02T02:30:00.000', 'earlier', 11],
			['Australia/ACT', '2023-04-02T02:30:00.000', 'later', 10],

			// negative dst
			// forward, dst starts
			['America/Los_Angeles', '2023-03-12T02:00:00.000', undefined, -7],
			['America/Los_Angeles', '2023-03-12T02:30:00.000', undefined, -7],
			['America/Los_Angeles', '2023-03-12T02:30:00.000', 'compatible', -7],
			['America/Los_Angeles', '2023-03-12T02:30:00.000', 'earlier', -8],
			['America/Los_Angeles', '2023-03-12T02:30:00.000', 'later', -7],
			// backward, dst ends
			['America/Los_Angeles', '2023-11-05T01:00:00.000', undefined, -7],
			['America/Los_Angeles', '2023-11-05T01:30:00.000', undefined, -7],
			['America/Los_Angeles', '2023-11-05T01:30:00.000', 'compatible', -7],
			['America/Los_Angeles', '2023-11-05T01:30:00.000', 'earlier', -7],
			['America/Los_Angeles', '2023-11-05T01:30:00.000', 'later', -8],
		]) {
			const date = new ZonedDate(wallclock, {timezone, disambiguation})
			assert.strictEqual(date.offset, expected)
		}

		for (const [timezone, wallclock, disambiguation, expected] of [
			['Australia/ACT', '2023-10-01T02:30:00.000', 'reject'],
			['Australia/ACT', '2023-04-02T02:30:00.000', 'reject'],
			['America/Los_Angeles', '2023-03-12T02:00:00.000', 'reject'],
			['America/Los_Angeles', '2023-11-05T01:00:00.000', 'reject'],
		]) {
			const date = new ZonedDate(wallclock, {timezone, disambiguation})
			assert.throws(() => date.time)
		}
	})
})
