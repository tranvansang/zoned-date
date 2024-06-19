import OffsetDate from './OffsetDate.mjs'
import assert from 'node:assert'
import test, {describe} from 'node:test'
import ZonedDate from './ZonedDate.mjs'

function day(n) {
	return n * 24 * 60 * 60 * 1000
}

describe('OffsetDate', () => {
	test('null args', () => {
		assert.ok(new OffsetDate(null) instanceof OffsetDate)
	})
	test('no month', () => {
		assert.strictEqual(new OffsetDate('2021').time, new OffsetDate('2021-01-01T00:00:00.000').time)
		assert.strictEqual(new OffsetDate('2021-02').time, new OffsetDate('2021-02-01T00:00:00.000').time)

		assert.strictEqual(new OffsetDate('2021-09-04T05:19:52.000').time, new OffsetDate('2021-09-04T05:19:52.000').time)
		assert.strictEqual(new OffsetDate('2021-09-04T05:19:52').time, new OffsetDate('2021-09-04T05:19:52.000').time)
		assert.strictEqual(new OffsetDate('2021-09-04T05:19').time, new OffsetDate('2021-09-04T05:19:00.000').time)
		assert.strictEqual(new OffsetDate('2021-09-04T05').time, new OffsetDate('2021-09-04T05:00:00.000').time)
		assert.strictEqual(new OffsetDate('2021-09-04').time, new OffsetDate('2021-09-04T00:00:00.000').time)
		assert.strictEqual(new OffsetDate('2021-09T05:19:52.000').time, new OffsetDate('2021-09-01T05:19:52.000').time)
		assert.strictEqual(new OffsetDate('2021-09T05:19:52').time, new OffsetDate('2021-09-01T05:19:52.000').time)
		assert.strictEqual(new OffsetDate('2021-09T05:19').time, new OffsetDate('2021-09-01T05:19:00.000').time)
		assert.strictEqual(new OffsetDate('2021-09T05').time, new OffsetDate('2021-09-01T05:00:00.000').time)
		assert.strictEqual(new OffsetDate('2021-09').time, new OffsetDate('2021-09-01T00:00:00.000').time)
		assert.strictEqual(new OffsetDate('2021T05:19:52.000').time, new OffsetDate('2021-01-01T05:19:52.000').time)
		assert.strictEqual(new OffsetDate('2021T05:19:52').time, new OffsetDate('2021-01-01T05:19:52.000').time)
		assert.strictEqual(new OffsetDate('2021T05:19').time, new OffsetDate('2021-01-01T05:19:00.000').time)
		assert.strictEqual(new OffsetDate('2021T05').time, new OffsetDate('2021-01-01T05:00:00.000').time)
		assert.strictEqual(new OffsetDate('2021').time, new OffsetDate('2021-01-01T00:00:00.000').time)

		const today = new OffsetDate
		const todayStr = `${today.fullYear}-${(today.month + 1).toString().padStart(2, '0')}-${today.date.toString().padStart(2, '0')}`
		assert.strictEqual(new OffsetDate('T05:19:52.000').time, new OffsetDate(`${todayStr}T05:19:52.000`).time)
		assert.strictEqual(new OffsetDate('T05:19:52').time, new OffsetDate(`${todayStr}T05:19:52.000`).time)
		assert.strictEqual(new OffsetDate('T05:19').time, new OffsetDate(`${todayStr}T05:19:00.000`).time)
		assert.strictEqual(new OffsetDate('T05').time, new OffsetDate(`${todayStr}T05:00:00.000`).time)
		assert.strictEqual(new OffsetDate('05:19:52.000').time, new OffsetDate(`${todayStr}T05:19:52.000`).time)
		assert.strictEqual(new OffsetDate('05:19:52').time, new OffsetDate(`${todayStr}T05:19:52.000`).time)
		assert.strictEqual(new OffsetDate('05:19').time, new OffsetDate(`${todayStr}T05:19:00.000`).time)
		assert.strictEqual(new OffsetDate('05').time, new OffsetDate(`${todayStr}T05:00:00.000`).time)
	})
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
	test('getter setter', () => {
		const date = new OffsetDate('2020-01-01T00:00:00.000', {offset: 7.5})
		assert.strictEqual(date.fullYear, 2020)
		assert.strictEqual(date.getFullYear(), 2020)
		assert.strictEqual(date.withFullYear(2021).fullYear, 2021)
		assert.strictEqual(date.utcFullYear, 2019)
		assert.strictEqual(date.getUTCFullYear(), 2019)
		assert.strictEqual(date.withUTCFullYear(2021).utcFullYear, 2021)
		date.fullYear = 2022
		assert.strictEqual(date.fullYear, 2022)
	})
	test('hour parse', () => {
		const date = new OffsetDate('02:00', {offset: 7})
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
	test('pg-node result parser', () => {
		let date
		const offset = -3
		const now = new OffsetDate({offset})

		// date: 1082
		// 2023-10-05
		date = new OffsetDate('2023-10-05', {offset})
		assert.strictEqual(date.fullYear, 2023)
		assert.strictEqual(date.month, 9)
		assert.strictEqual(date.date, 5)
		assert.strictEqual(date.hours, 0)
		assert.strictEqual(date.minutes, 0)
		assert.strictEqual(date.seconds, 0)
		assert.strictEqual(date.milliseconds, 0)

		// time: 1083
		// 17:00:00
		date = new OffsetDate('17:00:00', {offset})
		assert.strictEqual(date.fullYear, now.fullYear)
		assert.strictEqual(date.month, now.month)
		assert.strictEqual(date.date, now.date)
		assert.strictEqual(date.hours, 17)
		assert.strictEqual(date.minutes, 0)
		assert.strictEqual(date.seconds, 0)
		assert.strictEqual(date.milliseconds, 0)

		// timetz: 1266
		// 03:20:00+00
		date = new OffsetDate('03:20:00+11', {offset})
		assert.strictEqual(date.fullYear, now.fullYear)
		assert.strictEqual(date.month, now.month)
		assert.strictEqual(date.date, now.date)
		assert.strictEqual(date.withOffset(11).hours, 3)
		assert.strictEqual(date.withOffset(11).minutes, 20)
		assert.strictEqual(date.withOffset(11).seconds, 0)
		assert.strictEqual(date.withOffset(11).milliseconds, 0)

		// timestamp: 1114
		// 2023-10-29 01:44:45
		date = new OffsetDate('2023-10-29 01:44:45', {offset})
		assert.strictEqual(date.fullYear, 2023)
		assert.strictEqual(date.month, 9)
		assert.strictEqual(date.date, 29)
		assert.strictEqual(date.hours, 1)
		assert.strictEqual(date.minutes, 44)
		assert.strictEqual(date.seconds, 45)
		assert.strictEqual(date.milliseconds, 0)

		// timestamptz: 1184
		// 2023-10-25 01:44:59.32+00
		date = new OffsetDate('2023-10-25 01:44:59.32+11', {offset}).withOffset(11)
		assert.strictEqual(date.fullYear, 2023)
		assert.strictEqual(date.month, 9)
		assert.strictEqual(date.date, 25)
		assert.strictEqual(date.hours, 1)
		assert.strictEqual(date.minutes, 44)
		assert.strictEqual(date.seconds, 59)
		assert.strictEqual(date.milliseconds, 320)

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
					assert.strictEqual(date.date, new Date(todayGMT.getTime() + day(Math.floor(i / 24))).getUTCDate())

					date = new OffsetDate(timeStr, {offset})
					assert.strictEqual(date.hours, i % 24)
					assert.strictEqual(date.date, new Date(todayGMT.getTime() + day(Math.floor(i / 24))).getUTCDate())

					date = new OffsetDate(`${timeStr}${offsetToZoneStr(offset)}`, {offset})
					assert.strictEqual(date.hours, i % 24)
					assert.strictEqual(date.date, new Date(todayGMT.getTime() + day(Math.floor(i / 24))).getUTCDate())

					for (const parsedOffset of offsetList) {
						date = new OffsetDate(`${timeStr}${offsetToZoneStr(parsedOffset)}`, {offset})
						assert.strictEqual(date.hours, ((i + Math.floor(offset - parsedOffset)) % 24 + 24) % 24)
						assert.strictEqual(date.date, new Date(todayGMT.getTime() + day(Math.floor(i / 24))).getUTCDate())
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
	test('null args', () => {
		assert.ok(new ZonedDate(null) instanceof ZonedDate)
	})
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
					assert.strictEqual(date.date, new Date(todayGMT.getTime() + day(Math.floor(i / 24))).getUTCDate())

					date = new ZonedDate(timeStr, {timezone})
					assert.strictEqual(date.hours, i % 24)
					assert.strictEqual(date.date, new Date(todayGMT.getTime() + day(Math.floor(i / 24))).getUTCDate())

					date = new ZonedDate(`${timeStr}${offsetToZoneStr(offset)}`, {timezone})
					assert.strictEqual(date.hours, i % 24)
					assert.strictEqual(date.date, new Date(todayGMT.getTime() + day(Math.floor(i / 24))).getUTCDate())

					for (const [parsedTimezone, parsedOffset] of timezoneList) {
						date = new ZonedDate(`${timeStr}${offsetToZoneStr(parsedOffset)}`, {timezone})
						assert.strictEqual(date.hours, ((i + Math.floor(offset - parsedOffset)) % 24 + 24) % 24)
						assert.strictEqual(date.date, new Date(todayGMT.getTime() + day(Math.floor(i / 24))).getUTCDate())
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
		const ONE_HOUR = 60 * 60 * 1000

		// GMT+9
		const date = new ZonedDate('2021-09-04T05:19:52.001', {timezone: 'Asia/Tokyo'})
		assert.strictEqual(date.hours, 5)

		// GMT+7
		assert.strictEqual(date.withTimezone('Asia/Bangkok').hours, 5)
		assert.strictEqual(date.withTimezone('Asia/Bangkok').time + 7 * ONE_HOUR, date.time + 9 * ONE_HOUR)
		assert.strictEqual(new ZonedDate(date.time, {timezone: 'Asia/Bangkok'}).hours - 7, date.hours - 9)

		// UTC
		assert.strictEqual(date.withTimezone('UTC').hours, 5)
		assert.strictEqual(date.withTimezone('UTC').time + 0 * ONE_HOUR, date.time + 9 * ONE_HOUR)
		assert.strictEqual(new ZonedDate(date.time, {timezone: 'UTC'}).hour - 0, date.hour - 9 + 24)

		// GMT-4
		assert.strictEqual(date.withTimezone('America/New_York').hours, 5)
		assert.strictEqual(date.withTimezone('America/New_York').time - 4 * ONE_HOUR, date.time + 9 * ONE_HOUR)
		assert.strictEqual(new ZonedDate(date.time, {timezone: 'America/New_York'}).hours + 4, date.hours - 9 + 24)

		// ['America/Caracas', -4],
		assert.strictEqual(date.withTimezone('America/Caracas').hours, 5)
		assert.strictEqual(date.withTimezone('America/Caracas').time - 4 * ONE_HOUR, date.time + 9 * ONE_HOUR)
		assert.strictEqual(new ZonedDate(date.time, {timezone: 'America/Caracas'}).hours + 4, date.hours - 9 + 24)

		// ['Asia/Kathmandu', 5.75],
		assert.strictEqual(date.withTimezone('Asia/Kathmandu').hours, 5)
		assert.strictEqual(date.withTimezone('Asia/Kathmandu').time + 5.75 * ONE_HOUR, date.time + 9 * ONE_HOUR)
		assert.strictEqual(new ZonedDate(date.time, {timezone: 'Asia/Kathmandu'}).hours - 5, date.hours - 9 + 1)
		assert.strictEqual(new ZonedDate(date.time, {timezone: 'Asia/Kathmandu'}).minutes - 45, date.minutes - 60)
	})

	test('for readme', () => {
		const date = new ZonedDate('2021-09-04T05:19:52.001', {timezone: 'Asia/Tokyo'}) // GMT+9
		assert.strictEqual(date.hours, 5) // 5

// GMT+7
		assert.strictEqual(new ZonedDate(date.time, {timezone: 'Asia/Bangkok'}).hours, 3) // 3 = 5 - 9 + 7

// UTC
		assert.strictEqual(new ZonedDate(date.time, {timezone: 'UTC'}).hours, 20) // 20 = 5 - 9 + 24)

// GMT-4
		assert.strictEqual(new ZonedDate(date.time, {timezone: 'America/New_York'}).hours, 16) // 16 = 5 - 9 + -4 + 24)
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

		for (const [timezone, wallclock] of [
			['Australia/ACT', '2023-10-01T02:30:00.000'], // forward, dst starts
			['Australia/ACT', '2023-04-02T02:30:00.000'], // backward, dst ends
			['America/Los_Angeles', '2023-03-12T02:00:00.000'], // forward, dst starts
			['America/Los_Angeles', '2023-11-05T01:00:00.000'], // backward, dst ends
		]) {
			const date = new ZonedDate(wallclock, {timezone, disambiguation: 'reject'})
			assert.throws(() => date.time)
		}
	})

	test('DST backward', () => {
		assert.strictEqual(new ZonedDate('2023-11-05T00:59:59.999', {timezone: 'America/Los_Angeles', disambiguation: 'reject'}).offset, -7)
		assert.throws(() => new ZonedDate('2023-11-05T00:59:59.999', {timezone: 'America/Los_Angeles', disambiguation: 'reject'}).setTime(t => t + 1).offset)
		assert.strictEqual(new ZonedDate('2023-11-05T00:59:59.999', {timezone: 'America/Los_Angeles', disambiguation: 'earlier'}).setTime(t => t + 1).offset, -7)
		assert.strictEqual(new ZonedDate('2023-11-05T00:59:59.999', {timezone: 'America/Los_Angeles', disambiguation: 'compatible'}).setTime(t => t + 1).offset, -7)
		assert.strictEqual(new ZonedDate('2023-11-05T00:59:59.999', {timezone: 'America/Los_Angeles', disambiguation: 'later'}).setTime(t => t + 1).offset, -8)

		assert.strictEqual(new ZonedDate('2023-04-02T01:59:59.999', {timezone: 'Australia/ACT', disambiguation: 'reject'}).offset, 11)
		assert.throws(() => new ZonedDate('2023-04-02T01:59:59.999', {timezone: 'Australia/ACT', disambiguation: 'reject'}).setTime(t => t + 1).offset)
		assert.strictEqual(new ZonedDate('2023-04-02T01:59:59.999', {timezone: 'Australia/ACT', disambiguation: 'earlier'}).setTime(t => t + 1).offset, 11)
		assert.strictEqual(new ZonedDate('2023-04-02T01:59:59.999', {timezone: 'Australia/ACT', disambiguation: 'compatible'}).setTime(t => t + 1).offset, 11)
		assert.strictEqual(new ZonedDate('2023-04-02T01:59:59.999', {timezone: 'Australia/ACT', disambiguation: 'later'}).setTime(t => t + 1).offset, 10)
	})

	test('GMT -0456', () => {
		// https://dev.to/yoursunny/where-does-gmt-0456-timezone-come-from-38m1
		const eps = 1e-8

		// before
		assert.ok(Math.abs(new ZonedDate('1883-11-18T11:58:59.999', {timezone: 'America/New_York', disambiguation: 'reject'}).offset - -4.933333333333334) < eps)

		// ambiguous
		assert.throws(() => new ZonedDate('1883-11-18T12:00:00.000', {timezone: 'America/New_York', disambiguation: 'reject'}).offset)
		assert.ok(Math.abs(new ZonedDate('1883-11-18T12:00:00.000', {timezone: 'America/New_York', disambiguation: 'earlier'}).offset - -4.933333333333334) < eps)
		assert.strictEqual(new ZonedDate('1883-11-18T12:00:00.000', {timezone: 'America/New_York', disambiguation: 'later'}).offset, -5)

		// after
		assert.strictEqual(new ZonedDate('1883-11-18T12:04:00.000', {timezone: 'America/New_York', disambiguation: 'reject'}).offset, -5)

		// try moving time
		assert.strictEqual(
			new ZonedDate('1883-11-18T12:04:00.000', {timezone: 'America/New_York'}).time -
			new ZonedDate('1883-11-18T12:03:59.999', {timezone: 'America/New_York'}).time,
			240001
		)
		assert.throws(() => new ZonedDate('1883-11-18T12:03:59.999', {timezone: 'America/New_York', disambiguation: 'reject'}).setTime(t => t + 1).offset)
		assert.ok(Math.abs(new ZonedDate('1883-11-18T12:03:59.999', {timezone: 'America/New_York', disambiguation: 'earlier'}).setTime(t => t + 1).offset - -4.933333333333334) < eps)
		assert.strictEqual(new ZonedDate('1883-11-18T12:03:59.999', {timezone: 'America/New_York', disambiguation: 'later'}).setTime(t => t + 1).offset, -5)
	})
})
