const ONE_HOUR = 60 * 60_000

export default class ZonedDate {
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
			// copied and modified from ZonedDate.mjs
			// modified lines are marked with [modified]

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
			let hours = 0, minutes = 0, seconds = 0, milliseconds = 0, parsedOffset // [modified]
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
				const utcWallclock = new Date(Date.now() + this.#getOffset(new Date()) * ONE_HOUR) // [modified]
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

	/**
	 * @type {string}
	 */
	#_timezone
	#_dateTimeFormat
	/**
	 * @param {string} timezone
	 */
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
	/**
	 * @param {undefined | string | ((timezone: string) => string | undefined)} timezone
	 */
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
	/**
	 * @param {undefined | string | ((timezone: string) => string | undefined)} timezone
	 * @returns {ZonedDate}
	 */
	setTimezone(timezone) {
		this.timezone = timezone
		return this
	}
	/**
	 * @param {undefined | string | ((timezone: string) => string | undefined)} timezone
	 * @returns {ZonedDate}
	 */
	withTimezone(timezone) {
		if (typeof timezone === 'function') timezone = timezone(this.#_timezone)
		if (timezone === undefined) return new ZonedDate(this)
		// keep the same epoch, not same wallclock
		return new ZonedDate(this.time, {timezone, disambiguation: this.#_disambiguation})
	}

	/**
	 * @param {Date} utc
	 * @returns {ZonedDate}
	 */
	#withUtc(utc) {
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
	}

	/**
	 * @param {Date} date
	 * @returns {[number, number, number, number, number, number]}
	 */
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

	/**
	 * get offset for a given date, regarding its epoch (NOT its wallclock)
	 * @param {Date} date
	 * @returns {number}
	 */
	#getOffset(date) {
		return Math.round((Date.UTC(...this.#getWallclock(date)) - date.getTime()) / 60_000) / 60
	}

	get fullYear() {
		return this.#utc.getUTCFullYear()
	}
	/**
	 * @param {undefined | number | ((year: number) => number | undefined)} year
	 */
	set fullYear(year) {
		if (typeof year === 'function') year = year(this.#utc.getUTCFullYear())
		if (year === undefined) return
		this.#utc.setUTCFullYear(year)
	}
	getFullYear() {
		return this.fullYear
	}
	/**
	 * @param {undefined | number | ((year: number) => number | undefined)} year
	 * @returns {ZonedDate}
	 */
	setFullYear(year) {
		this.fullYear = year
		return this
	}
	/**
	 * @param {undefined | number | ((year: number) => number | undefined)} year
	 * @returns {ZonedDate}
	 */
	withFullYear(year) {
		if (typeof year === 'function') year = year(this.#utc.getUTCFullYear())
		if (year === undefined) return new ZonedDate(this)
		const utc = new Date(this.#utc)
		utc.setUTCFullYear(year)
		return this.#withUtc(utc)
	}
	get utcFullYear() {
		return this.#date.getFullYear()
	}
	/**
	 * @param {undefined | number | ((year: number) => number | undefined)} year
	 */
	set utcFullYear(year) {
		if (typeof year === 'function') year = year(this.utcFullYear)
		if (year === undefined) return
		const date = this.#date
		date.setUTCFullYear(year)
		this.time = date.getTime()
	}
	getUTCFullYear() {
		return this.utcFullYear
	}
	/**
	 * @param {undefined | number | ((year: number) => number | undefined)} year
	 * @returns {ZonedDate}
	 */
	setUTCFullYear(year) {
		this.utcFullYear = year
		return this
	}
	/**
	 * @param {undefined | number | ((year: number) => number | undefined)} year
	 * @returns {ZonedDate}
	 */
	withUTCFullYear(year) {
		if (typeof year === 'function') year = year(this.utcFullYear)
		if (year === undefined) return new ZonedDate(this)
		const date = this.#date
		date.setUTCFullYear(year)
		return this.#withTime(date.getTime())
	}

	get month() {
		return this.#utc.getUTCMonth()
	}
	/**
	 * @param {undefined | number | ((month: number) => number | undefined)} month
	 */
	set month(month) {
		if (typeof month === 'function') month = month(this.#utc.getUTCMonth())
		if (month === undefined) return
		this.#utc.setUTCMonth(month)
	}
	getMonth() {
		return this.month
	}
	/**
	 * @param {undefined | number | ((month: number) => number | undefined)} month
	 * @returns {ZonedDate}
	 */
	setMonth(month) {
		this.month = month
		return this
	}
	/**
	 * @param {undefined | number | ((month: number) => number | undefined)} month
	 * @returns {ZonedDate}
	 */
	withMonth(month) {
		if (typeof month === 'function') month = month(this.#utc.getUTCMonth())
		if (month === undefined) return new ZonedDate(this)
		const utc = new Date(this.#utc)
		utc.setUTCMonth(month)
		return this.#withUtc(utc)
	}
	get utcMonth() {
		return this.#date.getUTCMonth()
	}
	/**
	 * @param {undefined | number | ((month: number) => number | undefined)} month
	 */
	set utcMonth(month) {
		if (typeof month === 'function') month = month(this.utcMonth)
		if (month === undefined) return
		const date = this.#date
		date.setUTCMonth(month)
		this.time = date.getTime()
	}
	getUTCMonth() {
		return this.utcMonth
	}
	/**
	 * @param {undefined | number | ((month: number) => number | undefined)} month
	 * @returns {ZonedDate}
	 */
	setUTCMonth(month) {
		this.utcMonth = month
		return this
	}
	/**
	 * @param {undefined | number | ((month: number) => number | undefined)} month
	 * @returns {ZonedDate}
	 */
	withUTCMonth(month) {
		if (typeof month === 'function') month = month(this.utcMonth)
		if (month === undefined) return new ZonedDate(this)
		const date = this.#date
		date.setUTCMonth(month)
		return this.#withTime(date.getTime())
	}

	get date() {
		return this.#utc.getUTCDate()
	}
	/**
	 * @param {undefined | number | ((date: number) => number | undefined)} date
	 */
	set date(date) {
		if (typeof date === 'function') date = date(this.#utc.getUTCDate())
		if (date === undefined) return
		this.#utc.setUTCDate(date)
	}
	getDate() {
		return this.date
	}
	/**
	 * @param {undefined | number | ((date: number) => number | undefined)} date
	 * @returns {ZonedDate}
	 */
	setDate(date) {
		this.date = date
		return this
	}
	/**
	 * @param {undefined | number | ((date: number) => number | undefined)} date
	 * @returns {ZonedDate}
	 */
	withDate(date) {
		if (typeof date === 'function') date = date(this.#utc.getUTCDate())
		if (date === undefined) return new ZonedDate(this)
		const utc = new Date(this.#utc)
		utc.setUTCDate(date)
		return this.#withUtc(utc)
	}
	get utcDate() {
		return this.#date.getUTCDate()
	}
	/**
	 * @param {undefined | number | ((date: number) => number | undefined)} date
	 */
	set utcDate(d) {
		if (typeof d === 'function') d = d(this.utcDate)
		if (d === undefined) return
		const date = this.#date
		date.setUTCDate(d)
		this.time = date.getTime()
	}
	getUTCDate() {
		return this.utcDate
	}
	/**
	 * @param {undefined | number | ((date: number) => number | undefined)} date
	 * @returns {ZonedDate}
	 */
	setUTCDate(date) {
		this.utcDate = date
		return this
	}
	/**
	 * @param {undefined | number | ((date: number) => number | undefined)} date
	 * @returns {ZonedDate}
	 */
	withUTCDate(d) {
		if (typeof d === 'function') d = d(this.utcDate)
		if (d === undefined) return new ZonedDate(this)
		const date = this.#date
		date.setUTCDate(d)
		return this.#withTime(date.getTime())
	}

	get hours() {
		return this.#utc.getUTCHours()
	}
	/**
	 * @param {undefined | number | ((hours: number) => number | undefined)} hours
	 */
	set hours(hours) {
		if (typeof hours === 'function') hours = hours(this.#utc.getUTCHours())
		if (hours === undefined) return
		this.#utc.setUTCHours(hours)
	}
	getHours() {
		return this.hours
	}
	/**
	 * @param {undefined | number | ((hours: number) => number | undefined)} hours
	 * @returns {ZonedDate}
	 */
	setHours(hours) {
		this.hours = hours
		return this
	}
	/**
	 * @param {undefined | number | ((hours: number) => number | undefined)} hours
	 * @returns {ZonedDate}
	 */
	withHours(hours) {
		if (typeof hours === 'function') hours = hours(this.#utc.getUTCHours())
		if (hours === undefined) return new ZonedDate(this)
		const utc = new Date(this.#utc)
		utc.setUTCHours(hours)
		return this.#withUtc(utc)
	}
	get utcHours() {
		return this.#date.getUTCHours()
	}
	/**
	 * @param {undefined | number | ((hours: number) => number | undefined)} hours
	 */
	set utcHours(hours) {
		if (typeof hours === 'function') hours = hours(this.utcHours)
		if (hours === undefined) return
		const date = this.#date
		date.setUTCHours(hours)
		this.time = date.getTime()
	}
	getUTCHours() {
		return this.utcHours
	}
	/**
	 * @param {undefined | number | ((hours: number) => number | undefined)} hours
	 * @returns {ZonedDate}
	 */
	setUTCHours(hours) {
		this.utcHours = hours
		return this
	}
	/**
	 * @param {undefined | number | ((hours: number) => number | undefined)} hours
	 * @returns {ZonedDate}
	 */
	withUTCHours(hours) {
		if (typeof hours === 'function') hours = hours(this.utcHours)
		if (hours === undefined) return new ZonedDate(this)
		const date = this.#date
		date.setUTCHours(hours)
		return this.#withTime(date.getTime())
	}

	get minutes() {
		return this.#utc.getUTCMinutes()
	}
	/**
	 * @param {undefined | number | ((minutes: number) => number | undefined)} minutes
	 */
	set minutes(minutes) {
		if (typeof minutes === 'function') minutes = minutes(this.#utc.getUTCMinutes())
		if (minutes === undefined) return
		this.#utc.setUTCMinutes(minutes)
	}
	getMinutes() {
		return this.minutes
	}
	/**
	 * @param {undefined | number | ((minutes: number) => number | undefined)} minutes
	 * @returns {ZonedDate}
	 */
	setMinutes(minutes) {
		this.minutes = minutes
		return this
	}
	/**
	 * @param {undefined | number | ((minutes: number) => number | undefined)} minutes
	 * @returns {ZonedDate}
	 */
	withMinutes(minutes) {
		if (typeof minutes === 'function') minutes = minutes(this.#utc.getUTCMinutes())
		if (minutes === undefined) return new ZonedDate(this)
		const utc = new Date(this.#utc)
		utc.setUTCMinutes(minutes)
		return this.#withUtc(utc)
	}
	get utcMinutes() {
		return this.#date.getUTCMinutes()
	}
	/**
	 * @param {undefined | number | ((minutes: number) => number | undefined)} minutes
	 */
	set utcMinutes(minutes) {
		if (typeof minutes === 'function') minutes = minutes(this.utcMinutes)
		if (minutes === undefined) return
		const date = this.#date
		date.setUTCMinutes(minutes)
		this.time = date.getTime()
	}
	getUTCMinutes() {
		return this.utcMinutes
	}
	/**
	 * @param {undefined | number | ((minutes: number) => number | undefined)} minutes
	 * @returns {ZonedDate}
	 */
	setUTCMinutes(minutes) {
		this.utcMinutes = minutes
		return this
	}
	/**
	 * @param {undefined | number | ((minutes: number) => number | undefined)} minutes
	 * @returns {ZonedDate}
	 */
	withUTCMinutes(minutes) {
		if (typeof minutes === 'function') minutes = minutes(this.utcMinutes)
		if (minutes === undefined) return new ZonedDate(this)
		const date = this.#date
		date.setUTCMinutes(minutes)
		return this.#withTime(date.getTime())
	}

	get seconds() {
		return this.#utc.getUTCSeconds()
	}
	/**
	 * @param {undefined | number | ((seconds: number) => number | undefined)} seconds
	 */
	set seconds(seconds) {
		if (typeof seconds === 'function') seconds = seconds(this.#utc.getUTCSeconds())
		if (seconds === undefined) return
		this.#utc.setUTCSeconds(seconds)
	}
	getSeconds() {
		return this.seconds
	}
	/**
	 * @param {undefined | number | ((seconds: number) => number | undefined)} seconds
	 * @returns {ZonedDate}
	 */
	setSeconds(seconds) {
		this.seconds = seconds
		return this
	}
	/**
	 * @param {undefined | number | ((seconds: number) => number | undefined)} seconds
	 * @returns {ZonedDate}
	 */
	withSeconds(seconds) {
		if (typeof seconds === 'function') seconds = seconds(this.#utc.getUTCSeconds())
		if (seconds === undefined) return new ZonedDate(this)
		const utc = new Date(this.#utc)
		utc.setUTCSeconds(seconds)
		return this.#withUtc(utc)
	}
	get utcSeconds() {
		return this.#date.getUTCSeconds()
	}
	/**
	 * @param {undefined | number | ((seconds: number) => number | undefined)} seconds
	 */
	set utcSeconds(seconds) {
		if (typeof seconds === 'function') seconds = seconds(this.utcSeconds)
		if (seconds === undefined) return
		const date = this.#date
		date.setUTCSeconds(seconds)
		this.time = date.getTime()
	}
	getUTCSeconds() {
		return this.utcSeconds
	}
	/**
	 * @param {undefined | number | ((seconds: number) => number | undefined)} seconds
	 * @returns {ZonedDate}
	 */
	setUTCSeconds(seconds) {
		this.utcSeconds = seconds
		return this
	}
	/**
	 * @param {undefined | number | ((seconds: number) => number | undefined)} seconds
	 * @returns {ZonedDate}
	 */
	withUTCSeconds(seconds) {
		if (typeof seconds === 'function') seconds = seconds(this.utcSeconds)
		if (seconds === undefined) return new ZonedDate(this)
		const date = this.#date
		date.setUTCSeconds(seconds)
		return this.#withTime(date.getTime())
	}

	get milliseconds() {
		return this.#utc.getUTCMilliseconds()
	}
	/**
	 * @param {undefined | number | ((milliseconds: number) => number | undefined)} milliseconds
	 */
	set milliseconds(milliseconds) {
		if (typeof milliseconds === 'function') milliseconds = milliseconds(this.#utc.getUTCMilliseconds())
		if (milliseconds === undefined) return
		this.#utc.setUTCMilliseconds(milliseconds)
	}
	getMilliseconds() {
		return this.milliseconds
	}
	/**
	 * @param {undefined | number | ((milliseconds: number) => number | undefined)} milliseconds
	 * @returns {ZonedDate}
	 */
	setMilliseconds(milliseconds) {
		this.milliseconds = milliseconds
		return this
	}
	/**
	 * @param {undefined | number | ((milliseconds: number) => number | undefined)} milliseconds
	 * @returns {ZonedDate}
	 */
	withMilliseconds(milliseconds) {
		if (typeof milliseconds === 'function') milliseconds = milliseconds(this.#utc.getUTCMilliseconds())
		if (milliseconds === undefined) return new ZonedDate(this)
		const utc = new Date(this.#utc)
		utc.setUTCMilliseconds(milliseconds)
		return this.#withUtc(utc)
	}
	get utcMilliseconds() {
		return this.#date.getUTCMilliseconds()
	}
	/**
	 * @param {undefined | number | ((milliseconds: number) => number | undefined)} milliseconds
	 */
	set utcMilliseconds(milliseconds) {
		if (typeof milliseconds === 'function') milliseconds = milliseconds(this.utcMilliseconds)
		if (milliseconds === undefined) return
		const date = this.#date
		date.setUTCMilliseconds(milliseconds)
		this.time = date.getTime()
	}
	getUTCMilliseconds() {
		return this.utcMilliseconds
	}
	/**
	 * @param {undefined | number | ((milliseconds: number) => number | undefined)} milliseconds
	 * @returns {ZonedDate}
	 */
	setUTCMilliseconds(milliseconds) {
		this.utcMilliseconds = milliseconds
		return this
	}
	/**
	 * @param {undefined | number | ((milliseconds: number) => number | undefined)} milliseconds
	 * @returns {ZonedDate}
	 */
	withUTCMilliseconds(milliseconds) {
		if (typeof milliseconds === 'function') milliseconds = milliseconds(this.utcMilliseconds)
		if (milliseconds === undefined) return new ZonedDate(this)
		const date = this.#date
		date.setUTCMilliseconds(milliseconds)
		return this.#withTime(date.getTime())
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
	/**
	 * @param {undefined | number | ((time: number) => number | undefined)} time
	 */
	set time(time) {
		if (typeof time === 'function') time = time(this.getTime())
		if (time === undefined) return
		const offset = this.#getOffset(new Date(time))
		this.#utc.setTime(time + offset * ONE_HOUR)
	}
	getTime() {
		return this.time
	}
	/**
	 * @param {undefined | number | ((time: number) => number | undefined)} time
	 * @returns {ZonedDate}
	 */
	setTime(time) {
		this.time = time
		return this
	}
	/**
	 * @param {undefined | number | ((time: number) => number | undefined)} time
	 * @returns {ZonedDate}
	 */
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

	[Symbol.toPrimitive](...args) {
		return Date.prototype[Symbol.toPrimitive].call(this.#date, ...args)
	}
	toDateString(...args) {
		return Date.prototype.toDateString.call(this.#date, ...args)
	}

	toISOString(...args) {
		return Date.prototype.toISOString.call(this.#date, ...args)
	}
	toJSON(...args) {
		return Date.prototype.toJSON.call(this.#date, ...args)
	}
	toLocaleDateString(...args) {
		return Date.prototype.toLocaleDateString.call(this.#date, ...args)
	}
	toLocaleString(...args) {
		return Date.prototype.toLocaleString.call(this.#date, ...args)
	}
	toLocaleTimeString(...args) {
		return Date.prototype.toLocaleTimeString.call(this.#date, ...args)
	}
	toString(...args) {
		return Date.prototype.toString.call(this.#date, ...args)
	}
	toTimeString(...args) {
		return Date.prototype.toTimeString.call(this.#date, ...args)
	}
	toUTCString(...args) {
		return Date.prototype.toUTCString.call(this.#date, ...args)
	}
	valueOf(...args) {
		return Date.prototype.valueOf.call(this.#date, ...args)
	}
}
