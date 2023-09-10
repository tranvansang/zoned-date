// Generated content. Do not edit.

const ONE_HOUR = 60 * 60_000

// copied from OffsetDate.mjs. Do not modify this function, modify OffsetDate.mjs instead.
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

module.exports = class ZonedDate {
	static UTC = Date.UTC
	static now = Date.now
	static parse = Date.parse

	static defaultTimezone = 'UTC'
	// which timezone to choose when ambiguous time is encountered
	// later: choose the later timezone
	// earlier: choose the earlier timezone
	// compatible: later timezone when forward clock, earlier timezone when backward clock
	// reject: throw RangeError error
	// https://tc39.es/proposal-temporal/docs/ambiguity.html#resolving-time-ambiguity-in-temporal
	static defaultDisambiguation = 'compatible'
	#utc // utc wallclock
	constructor(...args) {
		privateProps.set(this, {
			getDate() {
				return this.#date
			},
			getUTC() {
				return this.#utc
			},
			withUtc(utc) {
				return new ZonedDate(
					utc.getUTCFullYear(),
					utc.getUTCMonth(),
					utc.getUTCDate(),
					utc.getUTCHours(),
					utc.getUTCMinutes(),
					utc.getUTCSeconds(),
					utc.getUTCMilliseconds(),
					{timezone: this.#_timezone, disambiguation: this.#_disambiguation}
				)
			},
			withTime(...args) {
				return this.#withTime(...args)
			},
		})

		if (args[0] instanceof ZonedDate) {
			this.#utc = new Date(args[0].#utc)
			if (typeof args[1] === 'object' && args[1].timezone !== undefined) this.#timezone = args[1].timezone
			else this.#timezone = args[0].timezone
			if (typeof args[1] === 'object' && args[1].disambiguation !== undefined) this.#disambiguation = args[1].disambiguation
			else this.#disambiguation = ZonedDate.defaultDisambiguation
			return
		}

		const lastArg = args[args.length - 1]
		let timezone = ZonedDate.defaultTimezone
		if (typeof lastArg === 'object' && !(lastArg instanceof Date)) {
			args.pop()
			if (lastArg.timezone !== null && lastArg.timezone !== undefined) timezone = lastArg.timezone
			if (lastArg.disambiguation !== null && lastArg.disambiguation !== undefined) this.#disambiguation = lastArg.disambiguation
			else this.#disambiguation = ZonedDate.defaultDisambiguation
		}
		this.#timezone = timezone

		if (args.length === 0) {// new Date()
			this.#utc = new Date()
			this.time = Date.now()
		} else if (args[0] instanceof Date) { // new Date(date)
			this.#utc = new Date()
			this.time = args[0].getTime()
		} else if (args.length === 1 && typeof args[0] === 'number') { // new Date(time)
			this.#utc = new Date()
			this.time = args[0]
		} else if (typeof args[0] === 'string') { // new Date(dateString)
			let [year, month, date, hours, minutes, seconds, milliseconds, parsedOffset] = parseString(args[0])

			if (year === undefined || month === undefined || date === undefined) {
				const utcWallclock = new Date(Date.now() + this.#getOffset(new Date()) * ONE_HOUR)
				if (year === undefined) year = utcWallclock.getUTCFullYear()
				if (month === undefined) month = utcWallclock.getUTCMonth()
				if (date === undefined) date = utcWallclock.getUTCDate()
			}

			if (parsedOffset === undefined) this.#utc = new Date(Date.UTC(
				year, month, date, hours, minutes, seconds, milliseconds
				)
			)
			else {
				this.#utc = new Date() // arbitrary date
				this.time = Date.UTC(year, month, date, hours, minutes, seconds, milliseconds) + parsedOffset * ONE_HOUR
			}
		} else this.#utc = new Date(Date.UTC(...args)) // new Date(year, month, date, hours, minutes, seconds, ms)
	}

	#_disambiguation
	set #disambiguation(disambiguation) {
		if (!['compatible', 'earlier', 'later', 'reject'].includes(disambiguation)) throw new Error('Invalid disambiguation option')
		this.#_disambiguation = disambiguation
	}

	#_timezone
	#_dateTimeFormat
	set #timezone(timezone) {
		if (timezone === this.#_timezone) return
		/**
		 * Some browser does not support hourCycle
		 * Try formatting 2000-11-23T00:00:00.000Z at UTC, timezone UTC
		 * - Old browser (no hourCycle supported, .e.g: Chrome 24), regardless of hourCycle:
		 * 		- hour12=true: 11/23/2000 12:00:00 AM
		 * 		- hour12=false: 11/23/2000 00:00:00
		 * 		- hour12 not defined: 11/23/2000 12:00:00 AM
		 * - New browser (hourCycle supported):
		 * 		- If hour12 is defined, regardless of hourCycle:
		 * 			- hour12=true: 1/23/2000, 12:00:00 AM
		 * 			- hour12=false: 11/23/2000, 24:00:00
		 * 		- If hour12 is undefined:
		 * 			- hourCycle=h23: 11/23/2000, 00:00:00
		 * 			- hourCycle is not defined: 11/23/2000, 12:00:00 AM
		 */
		this.#_dateTimeFormat = new Intl.DateTimeFormat('en-US', {
			...[
				'11/23/2000 12:00:00 AM',
				'11/23/2000, 12:00:00 AM',
			].includes(
				new Intl.DateTimeFormat('en-US', {
					hourCycle: 'h23',
					timeZone: 'UTC',
					year: 'numeric',
					month: 'numeric',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
				}).format(new Date('2000-11-23T00:00:00.000Z'))
			) ? {hour12: false} : {hourCycle: 'h23'},
			timeZone: timezone,
			year: 'numeric',
			month: 'numeric',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		})
		this.#_timezone = timezone
	}

	get timezone() {
		return this.#_timezone
	}
	set timezone(timezone) {
		if (typeof timezone === 'function') timezone = timezone(this.#_timezone)
		if (timezone === undefined || timezone === this.#_timezone) return
		const time = this.time
		this.#timezone = timezone
		this.time = time
	}
	getTimezone() {
		return this.timezone
	}
	setTimezone(timezone) {
		this.timezone = timezone
		return this
	}
	withTimezone(timezone) {
		if (typeof timezone === 'function') timezone = timezone(this.#_timezone)
		if (timezone === undefined) return new ZonedDate(this)
		// keep the same epoch, not same wallclock
		return new ZonedDate(this.time, {timezone, disambiguation: this.#_disambiguation})
	}

	#getWallclock(date) {
		if (typeof this.#_dateTimeFormat.formatToParts === 'function') {
			const wallclock = []
			const parts = this.#_dateTimeFormat.formatToParts(date)
			const nameToPos = {
				year: 0,
				month: 1,
				day: 2,
				hour: 3,
				minute: 4,
				second: 5,
			}
			for (const {type, value} of parts) {
				if (typeof nameToPos[type] === 'number') wallclock[nameToPos[type]] = parseInt(value, 10)
				if (type === 'month') wallclock[1] -= 1
			}
			return wallclock
		} else {
			const parts = this.#_dateTimeFormat.format(date).split(/[^0-9]/).filter(Boolean).map(v => parseInt(v, 10))
			return [
				parts[2], // year
				parts[0] - 1, // month
				parts[1], // day
				parts[3], // hour
				parts[4], // minute
				parts[5], // second
			]
		}
	}

	#getOffset(date) {
		return Math.round((Date.UTC(...this.#getWallclock(date)) - date.getTime()) / 60_000) / 60
	}

	get timezoneOffset() {
		return -this.offset * 60
	}
	getTimezoneOffset() {
		return this.timezoneOffset
	}

	get offset() {
		// const back1h = this.#getWallclock(new Date(date.getTime() - ONE_HOUR))
		// console.log(
		// 	wallclock,
		// 	back1h,
		// 	Math.round((new Date(Date.UTC(...wallclock)).getTime() - date.getTime()) / 60_000) / 60,
		// 	[...Array(6).keys()].every(i => wallclock[i] === back1h[i]) ? 1 : 0,
		// )
		// + ([...Array(6).keys()].every(i => wallclock[i] === back1h[i]) ? -1 : 0)
		// duplicated (later) wallclock while clock-backwarding.
		const [time, offsetFix = 0] = this.#getTime()
		return this.#getOffset(new Date(time)) + offsetFix
	}
	getOffset() {
		return this.offset
	}

	get day() {
		return this.#utc.getUTCDay()
	}
	getDay() {
		return this.day
	}
	get utcDay() {
		return this.#date.getUTCDay()
	}
	getUTCDay() {
		return this.utcDay
	}

	#getTime() {
		const offset1 = this.#getOffset(this.#utc)
		if (offset1 === 0) return [this.#utc.getTime()]

		const date2 = new Date(this.#utc.getTime() - offset1 * ONE_HOUR)
		const offset2 = this.#getOffset(date2)
		if (offset2 === offset1) {
			// check clock-backwarding
			if (offset1 < 0) {
				if (this.#_disambiguation === 'earlier' || this.#_disambiguation === 'compatible') {
					// no need to check
					return [date2.getTime()]
				} else { // 'later' or 'reject'
					// try forwarding 1h
					const date3 = new Date(date2.getTime() + ONE_HOUR)
					if (this.#getOffset(date3) === offset2 - 1) {
						// clock-backwarding. There are 2 choices for the same wallclock. The selected date2 is not the compatible one.
						if (this.#_disambiguation === 'reject') throw new RangeError('Ambiguous time')
						// 'later'
						return [date3.getTime()]
					}
				}
			} else {
				if (this.#_disambiguation === 'later') {
					// no need to check
					return [date2.getTime()]
				} else { // 'earlier' or 'compatible' or 'reject'
					// try backwarding 1h
					const date3 = new Date(date2.getTime() - ONE_HOUR)
					if (this.#getOffset(date3) === offset2 + 1) {
						// clock-backwarding. There are 2 choices for the same wallclock. The newly probed date is the compatible one.
						if (this.#_disambiguation === 'reject') throw new RangeError('Ambiguous time')
						// 'earlier' or 'compatible'
						return [date3.getTime()]
					}
				}
			}
			return [date2.getTime()]
		}

		const date3 = new Date(this.#utc.getTime() - offset2 * ONE_HOUR)
		const offset3 = this.#getOffset(date3)
		if (offset3 === offset2) return [date3.getTime()]

		// Clock-forwarding and we are in the forwarded (i.e., not existing) wallclock
		// it is fair for forward and backward in terms of complexity.
		// backward: complex when getting epoch
		// forward: complex when getting offset. See: this.offset
		if (this.#_disambiguation === 'reject') throw new RangeError('Ambiguous time')
		return this.#_disambiguation === 'earlier'
			? [Math.max(date3.getTime(), date2.getTime()), -1]
			// 'later' or 'compatible'
			: [Math.min(date3.getTime(), date2.getTime()), 1]
	}
	get time() {
		return this.#getTime()[0]
	}
	set time(time) {
		if (typeof time === 'function') time = time(this.getTime())
		if (time === undefined) return
		const offset = this.#getOffset(new Date(time))
		this.#utc.setTime(time + offset * ONE_HOUR)
	}
	getTime() {
		return this.time
	}
	setTime(time) {
		this.time = time
		return this
	}
	withTime(time) {
		if (typeof time === 'function') time = time(this.getTime())
		if (time === undefined) return new ZonedDate(this)
		return this.#withTime(time)
	}

	toDate() {
		return this.#date
	}
	get #date() {
		return new Date(this.time)
	}
	/**
	 * @param {number} time
	 */
	#withTime(time) {
		return new ZonedDate(time, {timezone: this.#_timezone, disambiguation: this.#_disambiguation})
	}
}

for (const method of [
	Symbol.toPrimitive,
	'toDateString',
	'toISOString',
	'toJSON',
	'toLocaleDateString',
	'toLocaleString',
	'toLocaleTimeString',
	'toString',
	'toTimeString',
	'toUTCString',
	'valueOf',
]) {
	ZonedDate.prototype[method] = function(...args) {
		return Date.prototype[method].call(
			privateProps.get(this).getDate.call(this),
			...args
		)
	}
}

for (const wallclock of [
	'fullYear', 'month', 'date', 'hours', 'minutes', 'seconds', 'milliseconds'
]) {
	const capitalized = wallclock[0].toUpperCase() + wallclock.slice(1)
	Object.defineProperty(ZonedDate.prototype, wallclock, {
		get() {
			return privateProps.get(this).getUTC.call(this)[`getUTC${capitalized}`]()
		},
		set(value) {
			if (typeof value === 'function') value = value(privateProps.get(this).getUTC.call(this)[`getUTC${capitalized}`]())
			if (value === undefined) return
			privateProps.get(this).getUTC.call(this)[`setUTC${capitalized}`](value)
		}
	})
	Object.defineProperty(ZonedDate.prototype, `utc${capitalized}`, {
		get() {
			return privateProps.get(this).getDate.call(this)[`get${capitalized}`]()
		},
		set(value) {
			if (typeof value === 'function') value = value(this[`utc${capitalized}`])
			if (value === undefined) return
			const date = privateProps.get(this).getDate.call(this)
			date[`setUTC${capitalized}`](value)
			this.time = date.getTime()
		}
	})
	Object.assign(ZonedDate.prototype, {
		[`get${capitalized}`]() {
			return this[wallclock]
		},
		[`set${capitalized}`](value) {
			this[wallclock] = value
			return this
		},
		[`with${capitalized}`](value) {
			if (typeof value === 'function') value = value(privateProps.get(this).getUTC.call(this)[`getUTC${capitalized}`]())
			if (value === undefined) return new ZonedDate(this)
			const utc = new Date(privateProps.get(this).getUTC.call(this))
			utc[`setUTC${capitalized}`](value)
			return privateProps.get(this).withUtc.call(this, utc)
		},
		[`getUTC${capitalized}`](value) {
			return this[`utc${capitalized}`]
		},
		[`setUTC${capitalized}`](value) {
			this[`utc${capitalized}`] = value
			return this
		},
		[`withUTC${capitalized}`](value) {
			if (typeof value === 'function') value = value(this[`utc${capitalized}`])
			if (value === undefined) return new ZonedDate(this)
			const date = privateProps.get(this).getDate.call(this)
			date[`setUTC${capitalized}`](value)
			return privateProps.get(this).withTime.call(this, date.getTime())
		}
	})
}
