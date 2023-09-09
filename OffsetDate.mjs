const ONE_HOUR = 60 * 60_000

export default class OffsetDate extends Date {
	static defaultOffset = 0
	#offset

	constructor(...args) {
		if (args[0] instanceof OffsetDate) { // new Date(offsetDate)
			super(args[0].getTime())
			if (typeof args[1] === 'object' && args[1].offset !== undefined) this.#offset = args[1].offset
			else this.#offset = args[0].#offset
			return
		}

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
			let str = args[0].toUpperCase()
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
			let hours = 0, minutes = 0, seconds = 0, milliseconds = 0, parsedOffset = offset
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

	get #utcWallclock() {
		return new Date(this.getTime() + this.#offset * ONE_HOUR)
	}
	set #utcWallclock(utcWallclock) {
		super.setTime(utcWallclock.getTime() - this.#offset * ONE_HOUR)
		// Date.prototype.setTime.call(this, utcWallclock.getTime() - this.#offset * ONE_HOUR)
	}
	#withUtcWallclock(utcWallclock) {
		return new OffsetDate(utcWallclock.getTime() - this.#offset * ONE_HOUR, {offset: this.#offset})
	}
	get fullYear() {
		return this.#utcWallclock.getUTCFullYear()
	}
	/**
	 * @param {undefined | number | ((year: number) => number | undefined)} year
	 */
	set fullYear(year) {
		const utcWallclock = this.#utcWallclock
		if (typeof year === 'function') year = year(utcWallclock.getUTCFullYear())
		if (year === undefined) return
		utcWallclock.setUTCFullYear(year)
		this.#utcWallclock = utcWallclock
	}
	getFullYear() {
		return this.fullYear
	}
	/**
	 * @param {undefined | number | ((year: number) => number | undefined)} year
	 * @returns {OffsetDate}
	 */
	setFullYear(year) {
		this.fullYear = year
		return this
	}
	/**
	 * @param {undefined | number | ((year: number) => number | undefined)} year
	 * @returns {OffsetDate}
	 */
	withFullYear(year) {
		const utcWallclock = this.#utcWallclock
		if (typeof year === 'function') year = year(utcWallclock.getUTCFullYear())
		if (year === undefined) return new OffsetDate(this)
		utcWallclock.setUTCFullYear(year)
		return this.#withUtcWallclock(utcWallclock)
	}

	get month() {
		return this.#utcWallclock.getUTCMonth()
	}
	/**
	 * @param {undefined | number | ((month: number) => number | undefined)} month
	 */
	set month(month) {
		const utcWallclock = this.#utcWallclock
		if (typeof month === 'function') month = month(utcWallclock.getUTCMonth())
		if (month === undefined) return
		utcWallclock.setUTCMonth(month)
		this.#utcWallclock = utcWallclock
	}
	getMonth() {
		return this.month
	}
	/**
	 * @param {undefined | number | ((month: number) => number | undefined)} month
	 * @returns {OffsetDate}
	 */
	setMonth(month) {
		this.month = month
		return this
	}
	/**
	 * @param {undefined | number | ((month: number) => number | undefined)} month
	 * @returns {OffsetDate}
	 */
	withMonth(month) {
		const utcWallclock = this.#utcWallclock
		if (typeof month === 'function') month = month(utcWallclock.getUTCMonth())
		if (month === undefined) return new OffsetDate(this)
		utcWallclock.setUTCMonth(month)
		return this.#withUtcWallclock(utcWallclock)
	}

	get date() {
		return this.#utcWallclock.getUTCDate()
	}
	/**
	 * @param {undefined | number | ((date: number) => number | undefined)} date
	 */
	set date(date) {
		const utcWallclock = this.#utcWallclock
		if (typeof date === 'function') date = date(utcWallclock.getUTCDate())
		if (date === undefined) return
		utcWallclock.setUTCDate(date)
		this.#utcWallclock = utcWallclock
	}
	getDate() {
		return this.date
	}
	/**
	 * @param {undefined | number | ((date: number) => number | undefined)} date
	 * @returns {OffsetDate}
	 */
	setDate(date) {
		this.date = date
		return this
	}
	/**
	 * @param {undefined | number | ((date: number) => number | undefined)} date
	 * @returns {OffsetDate}
	 */
	withDate(date) {
		const utcWallclock = this.#utcWallclock
		if (typeof date === 'function') date = date(utcWallclock.getUTCDate())
		if (date === undefined) return new OffsetDate(this)
		utcWallclock.setUTCDate(date)
		return this.#withUtcWallclock(utcWallclock)
	}


	get hours() {
		return this.#utcWallclock.getUTCHours()
	}
	/**
	 * @param {undefined | number | ((hours: number) => number | undefined)} hours
	 */
	set hours(hours) {
		const utcWallclock = this.#utcWallclock
		if (typeof hours === 'function') hours = hours(utcWallclock.getUTCHours())
		if (hours === undefined) return
		utcWallclock.setUTCHours(hours)
		this.#utcWallclock = utcWallclock
	}
	getHours() {
		return this.hours
	}
	/**
	 * @param {undefined | number | ((hours: number) => number | undefined)} hours
	 * @returns {OffsetDate}
	 */
	setHours(hours) {
		this.hours = hours
		return this
	}
	/**
	 * @param {undefined | number | ((hours: number) => number | undefined)} hours
	 * @returns {OffsetDate}
	 */
	withHours(hours) {
		const utcWallclock = this.#utcWallclock
		if (typeof hours === 'function') hours = hours(utcWallclock.getUTCHours())
		if (hours === undefined) return new OffsetDate(this)
		utcWallclock.setUTCHours(hours)
		return this.#withUtcWallclock(utcWallclock)
	}

	get minutes() {
		return this.#utcWallclock.getUTCMinutes()
	}
	/**
	 * @param {undefined | number | ((minutes: number) => number | undefined)} minutes
	 */
	set minutes(minutes) {
		const utcWallclock = this.#utcWallclock
		if (typeof minutes === 'function') minutes = minutes(utcWallclock.getUTCMinutes())
		if (minutes === undefined) return
		utcWallclock.setUTCMinutes(minutes)
		this.#utcWallclock = utcWallclock
	}
	getMinutes() {
		return this.minutes
	}
	/**
	 * @param {undefined | number | ((minutes: number) => number | undefined)} minutes
	 * @returns {OffsetDate}
	 */
	setMinutes(minutes) {
		this.minutes = minutes
		return this
	}
	/**
	 * @param {undefined | number | ((minutes: number) => number | undefined)} minutes
	 * @returns {OffsetDate}
	 */
	withMinutes(minutes) {
		const utcWallclock = this.#utcWallclock
		if (typeof minutes === 'function') minutes = minutes(utcWallclock.getUTCMinutes())
		if (minutes === undefined) return new OffsetDate(this)
		utcWallclock.setUTCMinutes(minutes)
		return this.#withUtcWallclock(utcWallclock)
	}

	get seconds() {
		return this.#utcWallclock.getUTCSeconds()
	}
	/**
	 * @param {undefined | number | ((seconds: number) => number | undefined)} seconds
	 */
	set seconds(seconds) {
		const utcWallclock = this.#utcWallclock
		if (typeof seconds === 'function') seconds = seconds(utcWallclock.getUTCSeconds())
		if (seconds === undefined) return
		utcWallclock.setUTCSeconds(seconds)
		this.#utcWallclock = utcWallclock
	}
	getSeconds() {
		return this.seconds
	}
	/**
	 * @param {undefined | number | ((seconds: number) => number | undefined)} seconds
	 * @returns {OffsetDate}
	 */
	setSeconds(seconds) {
		this.seconds = seconds
		return this
	}
	/**
	 * @param {undefined | number | ((seconds: number) => number | undefined)} seconds
	 * @returns {OffsetDate}
	 */
	withSeconds(seconds) {
		const utcWallclock = this.#utcWallclock
		if (typeof seconds === 'function') seconds = seconds(utcWallclock.getUTCSeconds())
		if (seconds === undefined) return new OffsetDate(this)
		utcWallclock.setUTCSeconds(seconds)
		return this.#withUtcWallclock(utcWallclock)
	}

	get milliseconds() {
		return this.#utcWallclock.getUTCMilliseconds()
	}
	/**
	 * @param {undefined | number | ((milliseconds: number) => number | undefined)} milliseconds
	 */
	set milliseconds(milliseconds) {
		const utcWallclock = this.#utcWallclock
		if (typeof milliseconds === 'function') milliseconds = milliseconds(utcWallclock.getUTCMilliseconds())
		if (milliseconds === undefined) return
		utcWallclock.setUTCMilliseconds(milliseconds)
		this.#utcWallclock = utcWallclock
	}
	getMilliseconds() {
		return this.milliseconds
	}
	/**
	 * @param {undefined | number | ((milliseconds: number) => number | undefined)} milliseconds
	 * @returns {OffsetDate}
	 */
	setMilliseconds(milliseconds) {
		this.milliseconds = milliseconds
		return this
	}
	/**
	 * @param {undefined | number | ((milliseconds: number) => number | undefined)} milliseconds
	 * @returns {OffsetDate}
	 */
	withMilliseconds(milliseconds) {
		const utcWallclock = this.#utcWallclock
		if (typeof milliseconds === 'function') milliseconds = milliseconds(utcWallclock.getUTCMilliseconds())
		if (milliseconds === undefined) return new OffsetDate(this)
		utcWallclock.setUTCMilliseconds(milliseconds)
		return this.#withUtcWallclock(utcWallclock)
	}

	get timezoneOffset() {
		return -this.#offset * 60
	}
	/**
	 * @param {undefined | number | ((offset: number) => number | undefined)} offset
	 */
	set timezoneOffset(offset) {
		if (typeof offset === 'function') offset = offset(this.timezoneOffset)
		if (offset === undefined) return
		this.#offset = -offset / 60
	}
	getTimezoneOffset() {
		return this.timezoneOffset
	}
	/**
	 * @param {undefined | number | ((offset: number) => number | undefined)} offset
	 * @returns {OffsetDate}
	 */
	setTimezoneOffset(offset) {
		this.timezoneOffset = offset
		return this
	}
	/**
	 * @param {undefined | number | ((offset: number) => number | undefined)} offset
	 * @returns {OffsetDate}
	 */
	withTimezoneOffset(offset) {
		if (typeof offset === 'function') offset = offset(this.timezoneOffset)
		if (offset === undefined) return new OffsetDate(this)
		return new OffsetDate(this.getTime(), {offset: -offset / 60})
	}

	get offset() {
		return this.#offset
	}
	/**
	 * @param {undefined | number | ((offset: number) => number | undefined)} offset
	 */
	set offset(offset) {
		if (typeof offset === 'function') offset = offset(this.#offset)
		if (offset === undefined) return
		this.#offset = offset
	}
	getOffset() {
		return this.#offset
	}
	/**
	 * @param {undefined | number | ((offset: number) => number | undefined)} offset
	 * @returns {OffsetDate}
	 */
	setOffset(offset) {
		this.offset = offset
		return this
	}
	/**
	 * @param {undefined | number | ((offset: number) => number | undefined)} offset
	 * @returns {OffsetDate}
	 */
	withOffset(offset) {
		if (typeof offset === 'function') offset = offset(this.#offset)
		if (offset === undefined) return new OffsetDate(this)
		return new OffsetDate(this.getTime(), {offset})
	}

	get day() {
		return this.#utcWallclock.getUTCDay()
	}
	getDay() {
		return this.day
	}

	get time() {
		return this.getTime()
	}
	/**
	 * @param {undefined | number | ((time: number) => number | undefined)} time
	 */
	set time(time) {
		if (typeof time === 'function') time = time(this.getTime())
		if (time === undefined) return
		super.setTime(time)
		// Date.prototype.setTime.call(this, time)
	}
	/**
	 * @param {undefined | number | ((time: number) => number | undefined)} time
	 * @returns {OffsetDate}
	 */
	setTime(time) {
		this.time = time
		return this
	}
	/**
	 * @param {undefined | number | ((time: number) => number | undefined)} time
	 * @returns {OffsetDate}
	 */
	withTime(time) {
		if (typeof time === 'function') time = time(this.getTime())
		if (time === undefined) return new OffsetDate(this)
		return new OffsetDate(time, {offset: this.#offset})
	}
}
