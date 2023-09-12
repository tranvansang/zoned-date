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
	test('hour parse', () => {
		const date = new OffsetDate('02:00', {offset: 9})
		assert.strictEqual(date.hours, 2)
		const todayGMT7	= new Date(Date.now() + 7 * 60 * 60 * 1000)
		assert.strictEqual(date.date, todayGMT7.getUTCDate())
	})
	test('hour parse neg', () => {
		const date = new OffsetDate('03:00Z', {offset: -3.5})
		assert.strictEqual(date.hours, 23)
		assert.strictEqual(date.minutes, 30)
		const todayGMT	= new Date(Date.now() - 3.5 * 60 * 60 * 1000)
		assert.strictEqual(date.date, todayGMT.getUTCDate())
	})
	test('get today: tricky', () => {
		let date

		// no timezone specified
		date = new OffsetDate('00:00', {offset: 9})
		assert.strictEqual(date.hours, 0)
		assert.strictEqual(date.date, new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDate())

		// z timezone
		date = new OffsetDate('00:00Z', {offset: 9})
		assert.strictEqual(date.hours, 9)
		assert.strictEqual(date.date, new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDate())

		// should stay in today even if 15 + 9 >= 24
		date = new OffsetDate('15:00Z', {offset: 9})
		assert.strictEqual(date.hours, 0)
		assert.strictEqual(date.date, new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDate())

		// tomorrow only when >= 24
		date = new OffsetDate('24:00Z', {offset: 9})
		assert.strictEqual(date.hours, 9)
		assert.strictEqual(date.date, 1 + new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDate())
		date = new OffsetDate('48:00Z', {offset: 9})
		assert.strictEqual(date.date, 2 + new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDate())
		date = new OffsetDate('71:00Z', {offset: 9})
		assert.strictEqual(date.date, 2 + new Date(Date.now() + 9 * 60 * 60 * 1000).getUTCDate())

		// repeat with half hour
		// no timezone specified
		date = new OffsetDate('00:00', {offset: 3.5})
		assert.strictEqual(date.hours, 0)
		assert.strictEqual(date.date, new Date(Date.now() + 3.5 * 60 * 60 * 1000).getUTCDate())

		// z timezone
		date = new OffsetDate('00:00Z', {offset: 3.5})
		assert.strictEqual(date.hours, 3)
		assert.strictEqual(date.minutes, 30)
		assert.strictEqual(date.date, new Date(Date.now() + 3.5 * 60 * 60 * 1000).getUTCDate())

		// should stay in today even if 15 + 3.5 >= 24
		date = new OffsetDate('23:29Z', {offset: 3.5})
		assert.strictEqual(date.hours, 2)
		assert.strictEqual(date.date, new Date(Date.now() + 3.5 * 60 * 60 * 1000).getUTCDate())
		date = new OffsetDate('23:30Z', {offset: 3.5})
		assert.strictEqual(date.hours, 3)
		assert.strictEqual(date.date, new Date(Date.now() + 3.5 * 60 * 60 * 1000).getUTCDate())

		// tomorrow only when >= 24
		date = new OffsetDate('24:00Z', {offset: 3.5})
		assert.strictEqual(date.hours, 3)
		assert.strictEqual(date.date, 1 + new Date(Date.now() + 3.5 * 60 * 60 * 1000).getUTCDate())
		date = new OffsetDate('48:00Z', {offset: 3.5})
		assert.strictEqual(date.date, 2 + new Date(Date.now() + 3.5 * 60 * 60 * 1000).getUTCDate())
		date = new OffsetDate('71:00Z', {offset: 3.5})
		assert.strictEqual(date.date, 2 + new Date(Date.now() + 3.5 * 60 * 60 * 1000).getUTCDate())

		// repeat with negative timezone
		// no timezone specified
		date = new OffsetDate('00:00', {offset: -9})
		assert.strictEqual(date.hours, 0)
		assert.strictEqual(date.date, new Date(Date.now() + -9 * 60 * 60 * 1000).getUTCDate())

		// z timezone
		date = new OffsetDate('00:00Z', {offset: -9})
		assert.strictEqual(date.hours, 15)
		assert.strictEqual(date.date, new Date(Date.now() + -9 * 60 * 60 * 1000).getUTCDate())

		// should stay in today even if 15 + 9 >= 24
		date = new OffsetDate('08:00Z', {offset: -9})
		assert.strictEqual(date.hours, 23)
		assert.strictEqual(date.date, new Date(Date.now() + -9 * 60 * 60 * 1000).getUTCDate())

		// tomorrow only when >= 24
		date = new OffsetDate('24:00Z', {offset: -9})
		assert.strictEqual(date.hours, 15)
		assert.strictEqual(date.date, 1 + new Date(Date.now() + -9 * 60 * 60 * 1000).getUTCDate())
		date = new OffsetDate('48:00Z', {offset: -9})
		assert.strictEqual(date.date, 2 + new Date(Date.now() + -9 * 60 * 60 * 1000).getUTCDate())
		date = new OffsetDate('71:00Z', {offset: -9})
		assert.strictEqual(date.date, 2 + new Date(Date.now() + -9 * 60 * 60 * 1000).getUTCDate())

		// repeat with half hour
		// no timezone specified
		date = new OffsetDate('00:00', {offset: -3.5})
		assert.strictEqual(date.hours, 0)
		assert.strictEqual(date.date, new Date(Date.now() + -3.5 * 60 * 60 * 1000).getUTCDate())

		// z timezone
		date = new OffsetDate('00:00Z', {offset: -3.5})
		assert.strictEqual(date.hours, 20)
		assert.strictEqual(date.minutes, 30)
		assert.strictEqual(date.date, new Date(Date.now() + -3.5 * 60 * 60 * 1000).getUTCDate())

		// should stay in today even if 15 + 3.5 >= 24
		date = new OffsetDate('23:29Z', {offset: -3.5})
		assert.strictEqual(date.hours, 19)
		assert.strictEqual(date.date, new Date(Date.now() + -3.5 * 60 * 60 * 1000).getUTCDate())
		date = new OffsetDate('23:30Z', {offset: -3.5})
		assert.strictEqual(date.hours, 20)
		assert.strictEqual(date.date, new Date(Date.now() + -3.5 * 60 * 60 * 1000).getUTCDate())

		// tomorrow only when >= 24
		date = new OffsetDate('24:00Z', {offset: -3.5})
		assert.strictEqual(date.hours, 20)
		assert.strictEqual(date.date, 1 + new Date(Date.now() + -3.5 * 60 * 60 * 1000).getUTCDate())
		date = new OffsetDate('48:00Z', {offset: -3.5})
		assert.strictEqual(date.date, 2 + new Date(Date.now() + -3.5 * 60 * 60 * 1000).getUTCDate())
		date = new OffsetDate('71:00Z', {offset: -3.5})
		assert.strictEqual(date.date, 2 + new Date(Date.now() + -3.5 * 60 * 60 * 1000).getUTCDate())
	})
	test('hourZ parse', () => {
		let date
		const offsetList = [0, 5.5, -3.5, 7, -9]
		for (const offset of offsetList) {
			const todayGMT	= new Date(Date.now() + offset * 60 * 60 * 1000)
			for (const i of Array(100).keys()) {
				for (const min of Array(1).keys()) {
					const hours = i.toString().padStart(2, '0')
					const mins = min.toString().padStart(2, '0')
					const timeStr = `${hours}:${mins}`

					date = new OffsetDate(`${timeStr}Z`, {offset})
					assert.strictEqual(date.hours, ((i + Math.floor(offset)) % 24 + 24) % 24)
					assert.strictEqual(date.date, todayGMT.getUTCDate() + Math.floor(i / 24))

					date = new OffsetDate(timeStr, {offset})
					assert.strictEqual(date.hours, i % 24)
					assert.strictEqual(date.date, todayGMT.getUTCDate() + Math.floor(i / 24))

					date = new OffsetDate(`${timeStr}${offsetToZoneStr(offset)}`, {offset})
					assert.strictEqual(date.hours, i % 24)
					assert.strictEqual(date.date, todayGMT.getUTCDate() + Math.floor(i / 24))

					for (const parsedOffset of offsetList) {
						date = new OffsetDate(`${timeStr}${offsetToZoneStr(parsedOffset)}`, {offset})
						assert.strictEqual(date.hours, ((i + Math.floor(offset - parsedOffset)) % 24 + 24) % 24)
						assert.strictEqual(date.date, todayGMT.getUTCDate() + Math.floor(i / 24))
					}
				}
			}
		}
		function offsetToZoneStr(offset) {
			return offset === 0 ? 'Z' : `${offset > 0 ? '+' : '-'}${Math.abs(Math.trunc(offset)).toString().padStart(2, '0')}${Math.random() > 0.5 ? ':' : ''}${
				((offset - Math.floor(offset)) * 60).toString().padStart(2, '0')
			}`
		}
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

					const expected = new Date(Date.UTC(
						info.fullYear ?? 2000,
						info.month ?? 0,
						info.date ?? 1,
						info.hours ?? 0,
						info.minutes ?? 0,
						info.seconds ?? 0,
						info.milliseconds ?? 0,
					) + (defaultOffset - (zoneOffset ?? defaultOffset)) * 60 * 60 * 1000)

					if (info.fullYear !== undefined && info.month !== undefined && info.date !== undefined) {
						assert.strictEqual(offsetDate.fullYear, expected.getUTCFullYear())
						assert.strictEqual(offsetDate.month, expected.getUTCMonth())
						assert.strictEqual(offsetDate.date, expected.getUTCDate())
					}
					if (info.hours !== undefined) assert.strictEqual(offsetDate.hours, expected.getUTCHours())
					if (info.minutes !== undefined) assert.strictEqual(offsetDate.minutes, expected.getUTCMinutes())
					if (info.seconds !== undefined) assert.strictEqual(offsetDate.seconds, expected.getUTCSeconds())
					if (info.milliseconds !== undefined) assert.strictEqual(offsetDate.milliseconds, expected.getUTCMilliseconds())

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
	test('hour parse', () => {
		const date = new ZonedDate('02:00', {timezone: 'Asia/Bangkok'})
		assert.strictEqual(date.hours, 2)
		const todayGMT7	= new Date(Date.now() + 7 * 60 * 60 * 1000)
		assert.strictEqual(date.date, todayGMT7.getUTCDate())
	})
	test('hour parse neg', () => {
		const date = new ZonedDate('23:00Z', {timezone: 'Asia/Bangkok'})
		assert.strictEqual(date.hours, 6)
		const todayGMT7	= new Date(Date.now() + 7 * 60 * 60 * 1000)
		assert.strictEqual(date.date, todayGMT7.getUTCDate())
	})
	test('hourZ parse', () => {
		let date
		const timezoneList = [
			['UTC', 0],
			['Asia/Bangkok', 7],
			// ['America/New_York', -4], // DST, so skipped
			['Asia/Tokyo', 9],
			['America/Caracas', -4],
			['Asia/Kathmandu', 5.75],
		]
		for (const [timezone, offset] of timezoneList) {
			const todayGMT	= new Date(Date.now() + offset * 60 * 60 * 1000)
			for (const i of Array(100).keys()) {
				for (const min of Array(1).keys()) {
					const hours = i.toString().padStart(2, '0')
					const mins = min.toString().padStart(2, '0')
					const timeStr = `${hours}:${mins}`

					date = new ZonedDate(`${timeStr}Z`, {timezone})
					assert.strictEqual(date.hours, ((i + Math.floor(offset)) % 24 + 24) % 24)
					assert.strictEqual(date.date, todayGMT.getUTCDate() + Math.floor(i / 24))

					date = new ZonedDate(timeStr, {timezone})
					assert.strictEqual(date.hours, i % 24)
					assert.strictEqual(date.date, todayGMT.getUTCDate() + Math.floor(i / 24))

					date = new ZonedDate(`${timeStr}${offsetToZoneStr(offset)}`, {timezone})
					assert.strictEqual(date.hours, i % 24)
					assert.strictEqual(date.date, todayGMT.getUTCDate() + Math.floor(i / 24))

					for (const [parsedTimezone, parsedOffset] of timezoneList) {
						date = new ZonedDate(`${timeStr}${offsetToZoneStr(parsedOffset)}`, {timezone})
						assert.strictEqual(date.hours, ((i + Math.floor(offset - parsedOffset)) % 24 + 24) % 24)
						assert.strictEqual(date.date, todayGMT.getUTCDate() + Math.floor(i / 24))
					}
				}
			}
		}
		function offsetToZoneStr(offset) {
			return offset === 0 ? 'Z' : `${offset > 0 ? '+' : '-'}${Math.abs(Math.trunc(offset)).toString().padStart(2, '0')}${Math.random() > 0.5 ? ':' : ''}${
				((offset - Math.floor(offset)) * 60).toString().padStart(2, '0')
			}`
		}
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
			['Australia/ACT', '2023-10-01T02:30:00.000'],
			['Australia/ACT', '2023-04-02T02:30:00.000'],
			['America/Los_Angeles', '2023-03-12T02:00:00.000'],
			['America/Los_Angeles', '2023-11-05T01:00:00.000'],
		]) {
			const date = new ZonedDate(wallclock, {timezone, disambiguation: 'reject'})
			assert.throws(() => date.time)
		}
	})
})
