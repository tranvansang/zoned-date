// Generated content. Do not edit.

const ONE_HOUR = 60 * 60_000

// copied from OffsetDate.mjs. Do not modify this function, modify OffsetDate.mjs instead.
function parseString(str) {
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

class ZonedDate {
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
		if (args[0] instanceof ZonedDate) {
			this.#utc = new Date(args[0].#utc)
			if (args[1]?.timezone !== undefined) this.#timezone = args[1].timezone
			else this.#timezone = args[0].timezone
			if (args[1]?.disambiguation !== undefined) this.#disambiguation = args[1].disambiguation
			else this.#disambiguation = ZonedDate.defaultDisambiguation
			return
		}

		const lastArg = args[args.length - 1]
		let timezone = ZonedDate.defaultTimezone
		if (typeof lastArg === 'object' && lastArg !== null && !(lastArg instanceof Date)) {
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
				let fixDate = 0
				const offset = this.#getOffset(new Date())
				const utcWallclock = new Date(Date.now() + offset * ONE_HOUR)
				if (parsedOffset !== undefined && parsedOffset !== offset) {
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

			if (parsedOffset === undefined) this.#utc = new Date(Date.UTC(
				year, month, date, hours, minutes, seconds, milliseconds
			))
			else {
				this.#utc = new Date() // arbitrary date
				this.time = Date.UTC(year, month, date, hours, minutes, seconds, milliseconds) - parsedOffset * ONE_HOUR
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

	getTimezone() {
		return this.#_timezone
	}
	setTimezone(timezone) {
		if (typeof timezone === 'function') timezone = timezone(this.#_timezone)
		if (timezone !== undefined || timezone !== this.#_timezone) {
			const time = this.time
			this.#timezone = timezone
			this.time = time
		}
		return this
	}

	getDisambiguation() {
		return this.#_disambiguation
	}
	setDisambiguation(disambiguation) {
		if (typeof disambiguation === 'function') disambiguation = disambiguation(this.#_disambiguation)
		if (disambiguation !== undefined) this.#disambiguation = disambiguation
		return this
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

	getFullYear() {
		return this.#utc.getUTCFullYear()
	}
	setFullYear(year) {
		if (typeof year === 'function') year = year(this.#utc.getUTCFullYear())
		if (year !== undefined) this.#utc.setUTCFullYear(year)
		return this
	}
	getUTCFullYear() {
		return this.#dateTime.getFullYear()
	}
	setUTCFullYear(year) {
		if (typeof year === 'function') year = year(this.utcFullYear)
		if (year !== undefined) {
			const dateTime = this.#dateTime
			dateTime.setUTCFullYear(year)
			this.time = dateTime.getTime()
		}
		return this
	}
	getMonth() {
		return this.#utc.getUTCMonth()
	}
	setMonth(month) {
		if (typeof month === 'function') month = month(this.#utc.getUTCMonth())
		if (month !== undefined) this.#utc.setUTCMonth(month)
		return this
	}
	getUTCMonth() {
		return this.#dateTime.getUTCMonth()
	}
	setUTCMonth(month) {
		if (typeof month === 'function') month = month(this.utcMonth)
		if (month !== undefined) {
			const dateTime = this.#dateTime
			dateTime.setUTCMonth(month)
			this.time = dateTime.getTime()
		}
		return this
	}
	getDate() {
		return this.#utc.getUTCDate()
	}
	setDate(date, hours, minutes, seconds, milliseconds) {
		if (typeof date === 'function') date = date(this.#utc.getUTCDate())
		if (date !== undefined) this.#utc.setUTCDate(date)
		this.setHours(hours, minutes, seconds, milliseconds)
		return this
	}
	getUTCDate() {
		return this.#dateTime.getUTCDate()
	}
	setUTCDate(date, hours, minutes, seconds, milliseconds) {
		if (typeof date === 'function') date = date(this.utcDate)
		if (date !== undefined) {
			const dateTime = this.#dateTime
			dateTime.setUTCDate(date)
			this.time = dateTime.getTime()
		}
		this.setUTCHours(hours, minutes, seconds, milliseconds)
		return this
	}
	getHours() {
		return this.#utc.getUTCHours()
	}
	setHours(hours, minutes, seconds, milliseconds) {
		if (typeof hours === 'function') hours = hours(this.#utc.getUTCHours())
		if (hours !== undefined) this.#utc.setUTCHours(hours)
		this.setMinutes(minutes, seconds, milliseconds)
		return this
	}
	getUTCHours() {
		return this.#dateTime.getUTCHours()
	}
	setUTCHours(hours, minutes, seconds, milliseconds) {
		if (typeof hours === 'function') hours = hours(this.utcHours)
		if (hours !== undefined) {
			const dateTime = this.#dateTime
			dateTime.setUTCHours(hours)
			this.time = dateTime.getTime()
		}
		this.setUTCMinutes(minutes, seconds, milliseconds)
		return this
	}
	getMinutes() {
		return this.#utc.getUTCMinutes()
	}
	setMinutes(minutes, seconds, milliseconds) {
		if (typeof minutes === 'function') minutes = minutes(this.#utc.getUTCMinutes())
		if (minutes !== undefined) this.#utc.setUTCMinutes(minutes)
		this.setSeconds(seconds, milliseconds)
		return this
	}
	getUTCMinutes() {
		return this.#dateTime.getUTCMinutes()
	}
	setUTCMinutes(minutes, seconds, milliseconds) {
		if (typeof minutes === 'function') minutes = minutes(this.utcMinutes)
		if (minutes !== undefined) {
			const dateTime = this.#dateTime
			dateTime.setUTCMinutes(minutes)
			this.time = dateTime.getTime()
		}
		this.setUTCSeconds(seconds, milliseconds)
		return this
	}
	getSeconds() {
		return this.#utc.getUTCSeconds()
	}
	setSeconds(seconds, milliseconds) {
		if (typeof seconds === 'function') seconds = seconds(this.#utc.getUTCSeconds())
		if (seconds !== undefined) this.#utc.setUTCSeconds(seconds)
		this.setMilliseconds(milliseconds)
		return this
	}
	getUTCSeconds() {
		return this.#dateTime.getUTCSeconds()
	}
	setUTCSeconds(seconds, milliseconds) {
		if (typeof seconds === 'function') seconds = seconds(this.utcSeconds)
		if (seconds !== undefined) {
			const dateTime = this.#dateTime
			dateTime.setUTCSeconds(seconds)
			this.time = dateTime.getTime()
		}
		this.setUTCMilliseconds(milliseconds)
		return this
	}
	getMilliseconds() {
		return this.#utc.getUTCMilliseconds()
	}
	setMilliseconds(milliseconds) {
		if (typeof milliseconds === 'function') milliseconds = milliseconds(this.#utc.getUTCMilliseconds())
		if (milliseconds !== undefined) this.#utc.setUTCMilliseconds(milliseconds)
		return this
	}
	getUTCMilliseconds() {
		return this.#dateTime.getUTCMilliseconds()
	}
	setUTCMilliseconds(milliseconds) {
		if (typeof milliseconds === 'function') milliseconds = milliseconds(this.utcMilliseconds)
		if (milliseconds !== undefined) {
			const dateTime = this.#dateTime
			dateTime.setUTCMilliseconds(milliseconds)
			this.time = dateTime.getTime()
		}
		return this
	}
	get timezoneOffset() {
		return this.getTimezoneOffset()
	}
	getTimezoneOffset() {
		return -this.offset * 60
	}

	get offset() {
		return this.getOffset()
	}
	getOffset() {
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

	get day() {
		return this.getDay()
	}
	getDay() {
		return this.#utc.getUTCDay()
	}
	get utcDay() {
		return this.getUTCDay()
	}
	getUTCDay() {
		return this.#dateTime.getUTCDay()
	}

	#getTime() {
		const offset1 = this.#getOffset(this.#utc)
		if (offset1 === 0) return [this.#utc.getTime()]

		const date2 = new Date(this.#utc.getTime() - offset1 * ONE_HOUR)
		const offset2 = this.#getOffset(date2)
		if (offset2 === offset1) {
			// check clock-backwarding

			// no need to check
			if (this.#_disambiguation !== 'reject' && offset1 > 0 === (this.#_disambiguation === 'later')) return [date2.getTime()]

			// offset1 > 0: 'earlier' or 'compatible' or 'reject'
			// offset1 < 0: 'later' or 'reject'
			const maxBackwardGap = 1 // unit: hour. This value can be increased if needed.

			// try backwarding maxBackwardGap hours for offset1 > 0
			// try forwarding maxBackwardGap hours for offset1 < 0
			const date3 = new Date(date2.getTime() - (offset1 > 0 ? 1 : -1) * maxBackwardGap * ONE_HOUR)
			const offset3 = this.#getOffset(date3)
			if (offset3 !== offset2 && offset3 > offset2 === offset1 > 0) {
				const date4 = new Date(date2.getTime() + (offset2 - offset3) * ONE_HOUR)
				if (this.#getOffset(date4) !== offset2) {
					// There are 2 choices for the same wallclock.
					// offset1 > 0: The newly probed date is the compatible one.
					// offset1 < 0: The selected date2 is not the compatible one.
					if (this.#_disambiguation === 'reject') throw new RangeError('Ambiguous time')
					// offset1 > 0: 'earlier' or 'compatible'
					// offset1 < 0: 'later'
					return [date3.getTime()]
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
	getTime() {
		return this.#getTime()[0]
	}
	setTime(time) {
		if (typeof time === 'function') time = time(this.getTime())
		if (time !== undefined) {
			const offset = this.#getOffset(new Date(time))
			this.#utc.setTime(time + offset * ONE_HOUR)
		}
		return this
	}

	toDate() {
		return this.#dateTime
	}
	get #dateTime() {
		return new Date(this.time)
	}
}

for (const name of [
	'timezone',
	'disambiguation',
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
	'time',
]) {
	const capitalized = name.startsWith('utc')
		? 'UTC' + name.slice('utc'.length)
		: name[0].toUpperCase() + name.slice(1)
	Object.defineProperty(ZonedDate.prototype, name, {
		get() {
			return this[`get${capitalized}`]()
		},
		set(value) {
			this[`set${capitalized}`](value)
		}
	})
	Object.assign(ZonedDate.prototype, {
		[`with${capitalized}`]() {
			return new ZonedDate(this)[`set${capitalized}`](...arguments)
		}
	})
}

for (const name of [
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
]) Object.assign(ZonedDate.prototype, {
	[name]: Date.prototype[name]
})

module.exports = ZonedDate

