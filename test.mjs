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
