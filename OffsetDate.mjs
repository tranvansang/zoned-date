const ONE_HOUR = 60 * 60_000

// same implementation is repeated in ZonedDate.mjs
function parseString(str) {
	/* Read description in README.md for more information.
	Additional info for implementation:

	Some rules for implementation:
	- Date-only does not have time zone.
	- Time-only can start with T or not.
	- Timezone part must start with Z or + or -.

	Implementation:
	Step 0: pre-processing
	- Convert to uppercase.
	- If first char is T, remove this char.

	Step 1: determine parts
	- Split by T. Must have 1 or 2 parts.
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
	if (str.startsWith('T')) str = str.slice(1)

	// step 1
	const parts = str.split('T')
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

const privateProps = new WeakMap()

export default class OffsetDate extends Date {
	static defaultOffset = 0
	#offset
	constructor(...args) {
		if (args[0] instanceof OffsetDate) { // new Date(offsetDate)
			super(args[0].getTime())
			if (typeof args[1] === 'object' && args[1].offset !== undefined) this.#offset = args[1].offset
			else this.#offset = args[0].#offset
		} else {
			const lastArg = args[args.length - 1]

			let offset = OffsetDate.defaultOffset
			if (typeof lastArg === 'object' && !(lastArg instanceof Date)) {
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
					const utcWallclock = new Date(Date.now() + offset * ONE_HOUR)
					if (year === undefined) year = utcWallclock.getUTCFullYear()
					if (month === undefined) month = utcWallclock.getUTCMonth()
					if (date === undefined) date = utcWallclock.getUTCDate()
				}

				super(Date.UTC(year, month, date, hours, minutes, seconds, milliseconds) + parsedOffset * ONE_HOUR)
			}
			else super(Date.UTC(...args) + offset * ONE_HOUR) // new Date(year, month, date, hours, minutes, seconds, ms)

			this.#offset = offset
		}
		privateProps.set(this, {
			get() {
				return new Date(this.getTime() + this.#offset * ONE_HOUR)
			},
			set(value) {
				super.setTime(value.getTime() - this.#offset * ONE_HOUR)
				// Date.prototype.setTime.call(this, value.getTime() - this.#offset * ONE_HOUR)
			},
			with(value) {
				return new OffsetDate(value.getTime() - this.#offset * ONE_HOUR, {offset: this.#offset})
			}
		})
	}

	get timezoneOffset() {
		return -this.#offset * 60
	}
	set timezoneOffset(offset) {
		if (typeof offset === 'function') offset = offset(this.timezoneOffset)
		if (offset === undefined) return
		this.#offset = -offset / 60
	}
	getTimezoneOffset() {
		return this.timezoneOffset
	}
	setTimezoneOffset(offset) {
		this.timezoneOffset = offset
		return this
	}
	withTimezoneOffset(offset) {
		if (typeof offset === 'function') offset = offset(this.timezoneOffset)
		if (offset === undefined) return new OffsetDate(this)
		return new OffsetDate(this.getTime(), {offset: -offset / 60})
	}

	get offset() {
		return this.#offset
	}
	set offset(offset) {
		if (typeof offset === 'function') offset = offset(this.#offset)
		if (offset === undefined) return
		this.#offset = offset
	}
	getOffset() {
		return this.#offset
	}
	setOffset(offset) {
		this.offset = offset
		return this
	}
	withOffset(offset) {
		if (typeof offset === 'function') offset = offset(this.#offset)
		if (offset === undefined) return new OffsetDate(this)
		return new OffsetDate(this.getTime(), {offset})
	}

	get day() {
		return privateProps.get(this).get.call(this).getUTCDay()
	}
	getDay() {
		return this.day
	}
	get utcDay() {
		return this.getUTCDay()
	}
	getUTCDay() {
		return super.getUTCDay()
	}

	get time() {
		return this.getTime()
	}
	set time(time) {
		if (typeof time === 'function') time = time(this.getTime())
		if (time === undefined) return
		super.setTime(time)
		// Date.prototype.setTime.call(this, time)
	}
	setTime(time) {
		this.time = time
		return this
	}
	withTime(time) {
		if (typeof time === 'function') time = time(this.getTime())
		if (time === undefined) return new OffsetDate(this)
		return new OffsetDate(time, {offset: this.#offset})
	}
}

for (const wallclock of [
	'fullYear', 'month', 'date', 'hours', 'minutes', 'seconds', 'milliseconds'
]) {
	const capitalized = wallclock[0].toUpperCase() + wallclock.slice(1)
	Object.defineProperty(OffsetDate.prototype, wallclock, {
		get() {
			return privateProps.get(this).get.call(this)[`getUTC${capitalized}`]()
		},
		set(value) {
			const utcWallclock = privateProps.get(this).get.call(this)
			if (typeof value === 'function') value = value(utcWallclock[`getUTC${capitalized}`]())
			if (value === undefined) return
			utcWallclock[`setUTC${capitalized}`](value)
			privateProps.get(this).set.call(this, utcWallclock)
		}
	})
	Object.defineProperty(OffsetDate.prototype, `utc${capitalized}`, {
		get() {
			return this[`getUTC${capitalized}`]()
		},
		set(value) {
			this[`setUTC${capitalized}`](value)
		}
	})
	Object.assign(OffsetDate.prototype, {
		[`get${capitalized}`]() {
			return this[wallclock]
		},
		[`set${capitalized}`](value) {
			this[wallclock] = value
			return this
		},
		[`with${capitalized}`](value) {
			const utcWallclock = privateProps.get(this).get.call(this)
			if (typeof value === 'function') value = value(utcWallclock[`getUTC${capitalized}`]())
			if (value === undefined) return new OffsetDate(this)
			utcWallclock[`setUTC${capitalized}`](value)
			return privateProps.get(this).with.call(this, utcWallclock)
		},
		[`setUTC${capitalized}`](value) {
			if (typeof value === 'function') value = value(this[`getUTC${capitalized}`]())
			if (value === undefined) return this
			Date.prototype[`setUTC${capitalized}`].call(this, value)
			return this
		},
		[`withUTC${capitalized}`](value) {
			if (typeof value === 'function') value = value(this[`getUTC${capitalized}`]())
			if (value === undefined) return new OffsetDate(this)
			return new OffsetDate(this).setUTCFullYear(value)
		}
	})
}
