import Dateo from './dateo.mjs'
import assert from 'node:assert'
import test from 'node:test'

test('Dateo', () => {
	const date = new Dateo(Date.UTC(2020, 1, 2, 3, 4, 5, 6), {offset: 7.5})
	assert.strictEqual(date.fullYear, 2020)
	assert.strictEqual(date.month, 1)
	assert.strictEqual(date.date, 2)
	assert.strictEqual(date.hours - 7, 3)
	assert.strictEqual(date.minutes - 30, 4)
	assert.strictEqual(date.seconds, 5)
	assert.strictEqual(date.milliseconds, 6)
	assert.strictEqual(date.timezone, 7.5)
	assert.strictEqual(date.timezoneOffset, -7.5 * 60)
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
		// Dateo.defaultOffset = defaultOffset
		for (const [dateStr, info] of cases) {
			for (let [zoneStr, zoneOffset] of zones) {
				// we disable offset because it does not show in the date string
				if (!dateStr.includes('Z')) zoneOffset = undefined

				const str = dateStr.replace('Z', zoneStr)
				const dateo = new Dateo(str, {offset: defaultOffset})

				// note: defaultOffset, not zoneOffset
				// must design a test case that fails if defaultOffset is not used
				const nowInUtcView = new Date(Date.now() + defaultOffset * 60 * 60 * 1000)

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
				// 	dateo,
				// 	new Date(expected),
				// )
				assert.strictEqual(dateo.time, expected)
				assert.strictEqual(dateo.timezone, defaultOffset)
				assert.strictEqual(dateo.timezoneOffset, -60 * defaultOffset)
			}
		}
	}
})
