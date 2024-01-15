// Generated content. Do not edit.

const ONE_HOUR = 60 * 60_000

// same implementation is repeated in ZonedDate.mjs
function parseString(str) {
	/* Read description in README.md for more information.
	Additional info for implementation:

	Some rules for implementation:
	- Date-only does not have time zone.
	- Time-only can start with T or space or not.
	- Timezone part must start with Z or + or -.

	Implementation:
	Step 0: pre-processing
	- Convert to uppercase.
	- If first char is T or space, remove this char.

	Step 1: determine parts
	- If contains 'T', split by T, else split by space. Must have 1 or 2 parts.
	- If 2 part, first part is date, second part is time.
	- Otherwise, (have 1 part)
		- If match /^\d{4}/, it is date.
		- Otherwise, it is time.

	Step 2: parse date
	- Split by -.
	- From left to right, parse year, month, date.

	Step 3: determine time and zone
	- Find first char that is one of [:+-], or, end of string.
	- Up to this character is time, the rest is timezone.

	Step 4: parse time
	- Split time part by :.
	- From left to right, parse hours, minutes, seconds.
	- Second can be ss or ss.sss.
		- Split by .
		- From left to right, parse seconds, milliseconds.

	Step 5: Parse timezone part.
	- If Z, offset is 0.
	- Pop first char, determine timezone sign.
	- Remove all colon. Now: it is HH or HHmm.
	- Parse hours by 2 digits from left and remove them.
	- If still have something, parse minutes by 2 digits from left.
	*/

	// step 0
	str = str.toUpperCase()
	if (str.startsWith('T') || str.startsWith(' ')) str = str.slice(1)

	// step 1
	const parts = str.includes('T') ? str.split('T') : str.split(' ')
	if (parts.length > 2) throw new Error('Invalid date string')
	let dateStr, timeAndZoneStr
	if (parts.length === 2) {
		dateStr = parts[0]
		timeAndZoneStr = parts[1]
	}
	else if (/^\d{4}/.test(str)) dateStr = str
	else timeAndZoneStr = str

	// parse date
	let year, month, date
	if (dateStr !== undefined) {
		const dateParts = dateStr.split('-')
		for (let i = 0; i < dateParts.length; i++) {
			const datePart = dateParts[i]
			const num = parseInt(datePart, 10)
			if (isNaN(num) || !isFinite(num)) throw new Error('Invalid date string')
			if (i === 0) year = num
			else if (i === 1) month = num - 1
			else if (i === 2) date = num
			else throw new Error('Invalid date string')
		}
	}

	// parse time
	let hours = 0, minutes = 0, seconds = 0, milliseconds = 0, parsedOffset
	if (timeAndZoneStr !== undefined) {
		let timeStr, zoneStr
		const zoneIndex = timeAndZoneStr.search(/[Z+-]/)
		if (zoneIndex === -1) timeStr = timeAndZoneStr
		else {
			timeStr = timeAndZoneStr.slice(0, zoneIndex)
			zoneStr = timeAndZoneStr.slice(zoneIndex)
		}

		// timeStr is always defined
		const timeParts = timeStr.split(':')
		for (let i = 0; i < timeParts.length; i++) {
			const timePart = timeParts[i]
			const num = i <= 1 ? parseInt(timePart, 10) : parseFloat(timePart)
			if (isNaN(num) || !isFinite(num)) throw new Error('Invalid date string')
			if (i === 0) hours = num
			else if (i === 1) minutes = num
			else if (i === 2) {
				seconds = Math.floor(num)
				milliseconds = Math.round((num - seconds) * 1000)
			} else throw new Error('Invalid date string')
		}
		if (hours === undefined) throw new Error('Invalid date string')

		if (zoneStr !== undefined) {
			if (zoneStr === 'Z') parsedOffset = 0
			else {
				const sign = zoneStr[0]
				zoneStr = zoneStr.slice(1).replace(/:/g, '')

				const hoursStr = zoneStr.slice(0, 2)
				const tzHours = parseInt(hoursStr, 10)
				if (isNaN(tzHours) || !isFinite(tzHours)) throw new Error('Invalid date string')

				const minutesStr = zoneStr.slice(2)
				let minutes = 0
				if (minutesStr) {
					minutes = parseInt(minutesStr, 10)
					if (isNaN(minutes) || !isFinite(minutes)) throw new Error('Invalid date string')
				}

				parsedOffset = (sign === '-' ? -1 : 1) * (tzHours + minutes / 60)
			}
		}
	}

	return [year, month, date, hours, minutes, seconds, milliseconds, parsedOffset]
}

class OffsetDate extends Date {
	static defaultOffset = 0
	#offset
	constructor(...args) {
		if (args[0] instanceof OffsetDate) { // new Date(offsetDate)
			super(args[0].getTime())
			if (typeof args[1] === 'object' && args[1]?.offset !== undefined) this.#offset = args[1].offset
			else this.#offset = args[0].#offset
			return
		}

		const lastArg = args[args.length - 1]

		let offset = OffsetDate.defaultOffset
		if (typeof lastArg === 'object' && lastArg !== null && !(lastArg instanceof Date)) {
			args.pop()
			if (lastArg.offset !== null && lastArg.offset !== undefined) offset = lastArg.offset
		}

		if (args.length === 0) super() // new Date()
		else if (
			args[0] instanceof Date // new Date(date)
			|| (args.length === 1 && typeof args[0] === 'number') // new Date(time)
		) super(...args)
		else if (typeof args[0] === 'string') { // new Date(dateString)
			let [year, month, date, hours, minutes, seconds, milliseconds, parsedOffset = offset] = parseString(args[0])

			if (year === undefined || month === undefined || date === undefined) {
				let fixDate = 0
				const utcWallclock = new Date(Date.now() + offset * ONE_HOUR)
				if (parsedOffset !== offset) {
					const sample = new Date(
						Date.UTC(2020, 0, 1, hours % 24, minutes, seconds, milliseconds)
						+ (offset - parsedOffset) * ONE_HOUR
					)
					if (sample.getUTCDate() !== 1) fixDate = parsedOffset < offset ? -1 : 1
				}
				year ??= utcWallclock.getUTCFullYear()
				month ??= utcWallclock.getUTCMonth()
				date ??= utcWallclock.getUTCDate() + fixDate
			}

			super(Date.UTC(year, month, date, hours, minutes, seconds, milliseconds) - parsedOffset * ONE_HOUR)
		}
		else super(Date.UTC(...args) + offset * ONE_HOUR) // new Date(year, month, date, hours, minutes, seconds, ms)

		this.#offset = offset
	}

	get #utcWallclock() {
		return new Date(this.getTime() + this.#offset * ONE_HOUR)
	}
	set #utcWallclock(utcWallclock) {
		super.setTime(utcWallclock.getTime() - this.#offset * ONE_HOUR)
	}
	getFullYear() {
		return this.#utcWallclock.getUTCFullYear()
	}
	setFullYear(year) {
		const utcWallclock = this.#utcWallclock
		if (typeof year === 'function') year = year(utcWallclock.getUTCFullYear())
		if (year !== undefined) {
			utcWallclock.setUTCFullYear(year)
			this.#utcWallclock = utcWallclock
		}
		return this
	}
	setUTCFullYear(year) {
		if (typeof year === 'function') year = year(this.getUTCFullYear())
		if (year !== undefined) super.setUTCFullYear(year)
		return this
	}

	getMonth() {
		return this.#utcWallclock.getUTCMonth()
	}
	setMonth(month) {
		const utcWallclock = this.#utcWallclock
		if (typeof month === 'function') month = month(utcWallclock.getUTCMonth())
		if (month !== undefined) {
			utcWallclock.setUTCMonth(month)
			this.#utcWallclock = utcWallclock
		}
		return this
	}
	setUTCMonth(month) {
		if (typeof month === 'function') month = month(this.getUTCMonth())
		if (month !== undefined) super.setUTCMonth(month)
		return this
	}

	getDate() {
		return this.#utcWallclock.getUTCDate()
	}
	setDate(date, hours, minutes, seconds, milliseconds) {
		const utcWallclock = this.#utcWallclock
		if (typeof date === 'function') date = date(utcWallclock.getUTCDate())
		if (date !== undefined) {
			utcWallclock.setUTCDate(date)
			this.#utcWallclock = utcWallclock
		}
		return this.setHours(hours, minutes, seconds, milliseconds)
	}
	setUTCDate(date, hours, minutes, seconds, milliseconds) {
		if (typeof date === 'function') date = date(this.utcDate)
		if (date !== undefined) super.setUTCDate(date)
		return this.setUTCHours(hours, minutes, seconds, milliseconds)
	}

	getHours() {
		return this.#utcWallclock.getUTCHours()
	}
	setHours(hours, minutes, seconds, milliseconds) {
		const utcWallclock = this.#utcWallclock
		if (typeof hours === 'function') hours = hours(utcWallclock.getUTCHours())
		if (hours !== undefined) {
			utcWallclock.setUTCHours(hours)
			this.#utcWallclock = utcWallclock
		}
		return this.setMinutes(minutes, seconds, milliseconds)
	}
	setUTCHours(hours, minutes, seconds, milliseconds) {
		if (typeof hours === 'function') hours = hours(this.utcHours)
		if (hours !== undefined) super.setUTCHours(hours)
		return this.setUTCMinutes(minutes, seconds, milliseconds)
	}

	getMinutes() {
		return this.#utcWallclock.getUTCMinutes()
	}
	setMinutes(minutes, seconds, milliseconds) {
		const utcWallclock = this.#utcWallclock
		if (typeof minutes === 'function') minutes = minutes(utcWallclock.getUTCMinutes())
		if (minutes !== undefined) {
			utcWallclock.setUTCMinutes(minutes)
			this.#utcWallclock = utcWallclock
		}
		return this.setSeconds(seconds, milliseconds)
	}
	setUTCMinutes(minutes, seconds, milliseconds) {
		if (typeof minutes === 'function') minutes = minutes(this.utcMinutes)
		if (minutes !== undefined) super.setUTCMinutes(minutes)
		return this.setUTCSeconds(seconds, milliseconds)
	}
	getSeconds() {
		return this.#utcWallclock.getUTCSeconds()
	}
	setSeconds(seconds, milliseconds) {
		const utcWallclock = this.#utcWallclock
		if (typeof seconds === 'function') seconds = seconds(utcWallclock.getUTCSeconds())
		if (seconds !== undefined) {
			utcWallclock.setUTCSeconds(seconds)
			this.#utcWallclock = utcWallclock
		}
		return this.setMilliseconds(milliseconds)
	}
	setUTCSeconds(seconds, milliseconds) {
		if (typeof seconds === 'function') seconds = seconds(this.utcSeconds)
		if (seconds !== undefined) super.setUTCSeconds(seconds)
		return this.setUTCMilliseconds(milliseconds)
	}
	getMilliseconds() {
		return this.#utcWallclock.getUTCMilliseconds()
	}
	setMilliseconds(milliseconds) {
		const utcWallclock = this.#utcWallclock
		if (typeof milliseconds === 'function') milliseconds = milliseconds(utcWallclock.getUTCMilliseconds())
		if (milliseconds !== undefined) {
			utcWallclock.setUTCMilliseconds(milliseconds)
			this.#utcWallclock = utcWallclock
		}
		return this
	}
	setUTCMilliseconds(milliseconds) {
		if (typeof milliseconds === 'function') milliseconds = milliseconds(this.utcMilliseconds)
		if (milliseconds !== undefined) super.setUTCMilliseconds(milliseconds)
		return this
	}
	getTimezoneOffset() {
		return -this.#offset * 60
	}
	setTimezoneOffset(offset) {
		if (typeof offset === 'function') offset = offset(this.timezoneOffset)
		if (offset !== undefined) this.#offset = -offset / 60
		return this
	}
	getOffset() {
		return this.#offset
	}
	setOffset(offset) {
		if (typeof offset === 'function') offset = offset(this.#offset)
		if (offset !== undefined) this.#offset = offset
		return this
	}

	get day() {
		return this.getDay()
	}
	getDay() {
		return this.#utcWallclock.getUTCDay()
	}
	get utcDay() {
		return this.getUTCDay()
	}
	getUTCDay() {
		return super.getUTCDay()
	}

	setTime(time) {
		if (typeof time === 'function') time = time(this.getTime())
		if (time !== undefined) super.setTime(time)
		return this
	}
}

for (const name of [
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
]) {
	const capitalized = name.startsWith('utc')
		? 'UTC' + name.slice('utc'.length)
		: name[0].toUpperCase() + name.slice(1)
	Object.defineProperty(OffsetDate.prototype, name, {
		get() {
			return this[`get${capitalized}`]()
		},
		set(value) {
			this[`set${capitalized}`](value)
		}
	})
	Object.assign(OffsetDate.prototype, {
		[`with${capitalized}`]() {
			return new OffsetDate(this)[`set${capitalized}`](...arguments)
		}
	})
}

module.exports = OffsetDate

