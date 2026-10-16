import {defineFields, isDate, isZonedDate, oneDay, oneHour, parseString, resolve, setFields, takeOptions, timeClip, todayTime, utc, wallclockOf} from './shared.mjs'

export default class OffsetDate extends Date {
	static defaultOffset = 0
	static now() {
		return Date.now()
	}

	#offset // milliseconds
	constructor(...args) {
		const options = takeOptions(args)
		const [value] = args
		const offset = toOffset(options?.offset ?? (args.length === 1 && isOffsetDate(value) ? value.getOffset() : OffsetDate.defaultOffset))
		if (args.length === 0) super(Date.now()) // new Date()
		else if (args.length > 1) super(utc(...args) - offset) // new Date(year, month, date, hours, minutes, seconds, ms)
		else if (typeof value === 'string') super(timeOfString(value, offset)) // new Date(dateString)
		else super(isZonedDate(value) ? value.getTime() : value) // new Date(value)
		this.#offset = offset
	}

	get day() {
		return this.getDay()
	}
	get utcDay() {
		return this.getUTCDay()
	}

	getFullYear() {
		const [date, years] = this.#wallclock()
		return date.getUTCFullYear() + years
	}
	setFullYear(...values) {
		return this.#setWallclock(0, values)
	}
	setUTCFullYear(...values) {
		return this.#setUTC(0, values)
	}

	getMonth() {
		return this.#wallclock()[0].getUTCMonth()
	}
	setMonth(...values) {
		return this.#setWallclock(1, values)
	}
	setUTCMonth(...values) {
		return this.#setUTC(1, values)
	}

	getDate() {
		return this.#wallclock()[0].getUTCDate()
	}
	setDate(...values) {
		return this.#setWallclock(2, values)
	}
	setUTCDate(...values) {
		return this.#setUTC(2, values)
	}

	getHours() {
		return this.#wallclock()[0].getUTCHours()
	}
	setHours(...values) {
		return this.#setWallclock(3, values)
	}
	setUTCHours(...values) {
		return this.#setUTC(3, values)
	}

	getMinutes() {
		return this.#wallclock()[0].getUTCMinutes()
	}
	setMinutes(...values) {
		return this.#setWallclock(4, values)
	}
	setUTCMinutes(...values) {
		return this.#setUTC(4, values)
	}

	getSeconds() {
		return this.#wallclock()[0].getUTCSeconds()
	}
	setSeconds(...values) {
		return this.#setWallclock(5, values)
	}
	setUTCSeconds(...values) {
		return this.#setUTC(5, values)
	}

	getMilliseconds() {
		return this.#wallclock()[0].getUTCMilliseconds()
	}
	setMilliseconds(...values) {
		return this.#setWallclock(6, values)
	}
	setUTCMilliseconds(...values) {
		return this.#setUTC(6, values)
	}

	getDay() {
		return this.#wallclock()[0].getUTCDay()
	}

	getYear() {
		return this.getFullYear() - 1900
	}
	// as in Date, 0 to 99 are years since 1900
	setYear(year) {
		// ToNumber, which throws for a BigInt as Date does
		const value = +year
		const integer = Math.trunc(value)
		return this.setFullYear(integer >= 0 && integer <= 99 ? 1900 + integer : value)
	}

	getTimezoneOffset() {
		return -this.#offset / 60_000 + 0
	}
	setTimezoneOffset(timezoneOffset) {
		const [value] = resolve([timezoneOffset], [this.getTimezoneOffset()])
		this.#offset = toOffset(-value / 60)
		return this
	}
	getOffset() {
		return this.#offset / oneHour
	}
	setOffset(offset) {
		const [value] = resolve([offset], [this.getOffset()])
		this.#offset = toOffset(value)
		return this
	}

	setTime(time) {
		const [value] = resolve([time], [this.getTime()])
		super.setTime(value)
		return this
	}

	// A Date whose UTC fields are the wallclock, and the years to add to its UTC year
	#wallclock() {
		return wallclockOf(this.getTime() + this.#offset)
	}
	#setWallclock(index, values) {
		super.setTime(setFields(this.getTime() + this.#offset, index, values) - this.#offset)
		return this
	}
	#setUTC(index, values) {
		super.setTime(setFields(this.getTime(), index, values))
		return this
	}
}

defineFields(OffsetDate, [
	'fullYear',
	'utcFullYear',
	'month',
	'utcMonth',
	'date',
	'utcDate',
	'hours',
	'utcHours',
	'minutes',
	'utcMinutes',
	'seconds',
	'utcSeconds',
	'milliseconds',
	'utcMilliseconds',
	'timezoneOffset',
	'offset',
	'time',
])

// The instant of a date string. A string without a zone is a wallclock at the offset (milliseconds).
function timeOfString(string, offset) {
	const [days, time, zone = offset] = parseString(string)
	if (days !== undefined) return days * oneDay + time - zone
	// a time without a date falls on today's date at the offset. A clock outside the Date range is invalid, like NaN.
	return todayTime(time, zone, timeClip(Date.now()), () => offset)
}

// An OffsetDate of any realm or copy of this package
function isOffsetDate(value) {
	return isDate(value) && typeof value.getOffset === 'function'
}

// An offset in hours, in milliseconds
function toOffset(hours) {
	const offset = Math.round(hours * oneHour)
	if (!Number.isFinite(offset)) throw new RangeError(`Invalid offset: ${hours}`)
	return offset + 0 // not -0
}
