import {type DateLike, isZonedDate, makeDate, maxTime, modulo, oneDay, oneHour, parseString, resolve, setFields, takeOptions, timeClip, todayTime, utc, type ValueSetter, wallclockOf} from './shared.ts'

export type {DateLike, ValueSetter}

export type Disambiguation = 'compatible' | 'earlier' | 'later' | 'reject'

export interface ZonedDateOptions {
	/** Time zone name. undefined or null: the time zone of the copied ZonedDate, or else ZonedDate.defaultTimezone */
	timezone?: string | null | undefined
	/** undefined or null: the disambiguation of the copied ZonedDate, or else ZonedDate.defaultDisambiguation */
	disambiguation?: Disambiguation | null | undefined
}

// The wallclock formatters, per Intl.DateTimeFormat (a polyfill or a mock can replace it) and per time zone name
const formatters = new WeakMap<typeof Intl.DateTimeFormat, {hourCycle: Intl.DateTimeFormatOptions; byTimezone: Record<string, Intl.DateTimeFormat>}>()

export default class ZonedDate {
	static defaultTimezone = 'UTC'
	/**
	 * Which instant a wallclock means when it occurs twice or not at all around a DST change, as in Temporal:
	 * https://tc39.es/proposal-temporal/docs/timezone.html#resolving-time-ambiguity-in-temporal
	 * - compatible: the earlier instant when the wallclock occurs twice, the later one when it is skipped
	 * - earlier: the earlier instant
	 * - later: the later instant
	 * - reject: neither; reading the instant throws RangeError
	 */
	static defaultDisambiguation: Disambiguation = 'compatible'
	static UTC(...args: [year: number, monthIndex?: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number]) {
		return Date.UTC(...args)
	}
	static now() {
		return Date.now()
	}
	static parse(string: string) {
		return Date.parse(string)
	}

	// The instant in milliseconds (NaN for an invalid date), or undefined while #unresolved is set
	#time: number | undefined
	// With 'reject', a wallclock (in milliseconds, as if it were UTC) that occurs twice or not at all
	#unresolved: number | undefined
	// The offset in milliseconds at the instant #offsetTime
	#offset!: number
	#offsetTime: number | undefined
	constructor(options?: ZonedDateOptions)
	constructor(zonedDate: ZonedDate, options?: ZonedDateOptions | null)
	constructor(value: number | string | Date | DateLike | null, options?: ZonedDateOptions | null)
	constructor(fullYear: number, month: number, options?: ZonedDateOptions | null)
	constructor(fullYear: number, month: number, date: number, options?: ZonedDateOptions | null)
	constructor(fullYear: number, month: number, date: number, hours: number, options?: ZonedDateOptions | null)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, options?: ZonedDateOptions | null)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, options?: ZonedDateOptions | null)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, milliseconds: number, options?: ZonedDateOptions | null)
	constructor(...args: unknown[]) {
		const options = takeOptions<ZonedDateOptions>(args)
		const [value] = args
		if (args.length === 1 && isZonedDate(value)) { // new ZonedDate(zonedDate)
			if (value instanceof ZonedDate) {
				this.#time = value.#time
				this.#unresolved = value.#unresolved
			} else this.#copyForeign(value)
			this.#timezone = value.getTimezone()
			// zoned-date 0.1.3 leaves the disambiguation undefined without an options object
			this.#disambiguation = value.getDisambiguation() ?? ZonedDate.defaultDisambiguation
			// only 'reject' leaves a wallclock without an instant
			if (this.#time === undefined && this.#_disambiguation !== 'reject') this.#setWallclockTime(this.#unresolved!)
			// a copy into another time zone keeps the wallclock
			const timezone = options?.timezone ?? this.#_timezone
			const disambiguation = options?.disambiguation ?? this.#_disambiguation
			if (timezone !== this.#_timezone || disambiguation !== this.#_disambiguation) this.#rezone(timezone, disambiguation)
			return
		}

		this.#timezone = options?.timezone ?? ZonedDate.defaultTimezone
		this.#disambiguation = options?.disambiguation ?? ZonedDate.defaultDisambiguation
		if (args.length === 0) this.#time = new Date(Date.now()).getTime() // new Date()
		else if (args.length > 1) this.#setWallclockTime(utc(...args as number[])) // new Date(year, month, date, hours, minutes, seconds, ms)
		else if (typeof value === 'string') this.#setString(value) // new Date(dateString)
		else this.#time = new Date(value as number).getTime() // new Date(value), which converts any value
	}

	get [Symbol.toStringTag]() {
		return 'ZonedDate'
	}

	#_disambiguation!: Disambiguation
	set #disambiguation(disambiguation: Disambiguation) {
		if (!['compatible', 'earlier', 'later', 'reject'].includes(disambiguation)) throw new Error('Invalid disambiguation option')
		this.#_disambiguation = disambiguation
	}

	#_timezone!: string
	#_dateTimeFormat!: Intl.DateTimeFormat
	set #timezone(timezone: string) {
		// Intl would read undefined as the runtime's time zone
		if (timezone === undefined) throw new RangeError('Invalid time zone specified: undefined')
		if (timezone === this.#_timezone) return
		this.#_dateTimeFormat = formatterOf(timezone)
		this.#_timezone = timezone
		this.#offsetTime = undefined
	}

	get timezone(): string {
		return this.getTimezone()
	}
	set timezone(timezone: ValueSetter<string>) {
		this.setTimezone(timezone)
	}
	getTimezone() {
		return this.#_timezone
	}
	/** Keeps the wallclock */
	setTimezone(timezone?: ValueSetter<string>) {
		const [value] = resolve([timezone], [this.#_timezone])
		if (value !== this.#_timezone) this.#rezone(value, this.#_disambiguation)
		return this
	}
	/** Keeps the wallclock */
	withTimezone(timezone?: ValueSetter<string>) {
		return this.#copy().setTimezone(timezone)
	}

	get disambiguation(): Disambiguation {
		return this.getDisambiguation()
	}
	set disambiguation(disambiguation: ValueSetter<Disambiguation>) {
		this.setDisambiguation(disambiguation)
	}
	getDisambiguation() {
		return this.#_disambiguation
	}
	/** Resolves the wallclock again with the new option */
	setDisambiguation(disambiguation?: ValueSetter<Disambiguation>) {
		const [value] = resolve([disambiguation], [this.#_disambiguation])
		if (value !== this.#_disambiguation) this.#rezone(this.#_timezone, value)
		return this
	}
	/** Resolves the wallclock again with the new option */
	withDisambiguation(disambiguation?: ValueSetter<Disambiguation>) {
		return this.#copy().setDisambiguation(disambiguation)
	}

	get fullYear(): number {
		return this.getFullYear()
	}
	set fullYear(year: ValueSetter) {
		this.setFullYear(year)
	}
	getFullYear() {
		const [date, years] = this.#wallclock()
		return date.getUTCFullYear() + years
	}
	setFullYear(year?: ValueSetter, month?: ValueSetter, date?: ValueSetter) {
		return this.#setWallclock(0, [year, month, date])
	}
	withFullYear(year?: ValueSetter, month?: ValueSetter, date?: ValueSetter) {
		return this.#copy().setFullYear(year, month, date)
	}
	get utcFullYear(): number {
		return this.getUTCFullYear()
	}
	set utcFullYear(year: ValueSetter) {
		this.setUTCFullYear(year)
	}
	getUTCFullYear() {
		return this.toDate().getUTCFullYear()
	}
	setUTCFullYear(year?: ValueSetter, month?: ValueSetter, date?: ValueSetter) {
		return this.#setUTC(0, [year, month, date])
	}
	withUTCFullYear(year?: ValueSetter, month?: ValueSetter, date?: ValueSetter) {
		return this.#copy().setUTCFullYear(year, month, date)
	}

	get month(): number {
		return this.getMonth()
	}
	set month(month: ValueSetter) {
		this.setMonth(month)
	}
	getMonth() {
		return this.#wallclock()[0].getUTCMonth()
	}
	setMonth(month?: ValueSetter, date?: ValueSetter) {
		return this.#setWallclock(1, [month, date])
	}
	withMonth(month?: ValueSetter, date?: ValueSetter) {
		return this.#copy().setMonth(month, date)
	}
	get utcMonth(): number {
		return this.getUTCMonth()
	}
	set utcMonth(month: ValueSetter) {
		this.setUTCMonth(month)
	}
	getUTCMonth() {
		return this.toDate().getUTCMonth()
	}
	setUTCMonth(month?: ValueSetter, date?: ValueSetter) {
		return this.#setUTC(1, [month, date])
	}
	withUTCMonth(month?: ValueSetter, date?: ValueSetter) {
		return this.#copy().setUTCMonth(month, date)
	}

	get date(): number {
		return this.getDate()
	}
	set date(date: ValueSetter) {
		this.setDate(date)
	}
	getDate() {
		return this.#wallclock()[0].getUTCDate()
	}
	setDate(date?: ValueSetter, hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#setWallclock(2, [date, hours, minutes, seconds, milliseconds])
	}
	withDate(date?: ValueSetter, hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#copy().setDate(date, hours, minutes, seconds, milliseconds)
	}
	get utcDate(): number {
		return this.getUTCDate()
	}
	set utcDate(date: ValueSetter) {
		this.setUTCDate(date)
	}
	getUTCDate() {
		return this.toDate().getUTCDate()
	}
	setUTCDate(date?: ValueSetter, hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#setUTC(2, [date, hours, minutes, seconds, milliseconds])
	}
	withUTCDate(date?: ValueSetter, hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#copy().setUTCDate(date, hours, minutes, seconds, milliseconds)
	}

	get hours(): number {
		return this.getHours()
	}
	set hours(hours: ValueSetter) {
		this.setHours(hours)
	}
	getHours() {
		return this.#wallclock()[0].getUTCHours()
	}
	setHours(hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#setWallclock(3, [hours, minutes, seconds, milliseconds])
	}
	withHours(hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#copy().setHours(hours, minutes, seconds, milliseconds)
	}
	get utcHours(): number {
		return this.getUTCHours()
	}
	set utcHours(hours: ValueSetter) {
		this.setUTCHours(hours)
	}
	getUTCHours() {
		return this.toDate().getUTCHours()
	}
	setUTCHours(hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#setUTC(3, [hours, minutes, seconds, milliseconds])
	}
	withUTCHours(hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#copy().setUTCHours(hours, minutes, seconds, milliseconds)
	}

	get minutes(): number {
		return this.getMinutes()
	}
	set minutes(minutes: ValueSetter) {
		this.setMinutes(minutes)
	}
	getMinutes() {
		return this.#wallclock()[0].getUTCMinutes()
	}
	setMinutes(minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#setWallclock(4, [minutes, seconds, milliseconds])
	}
	withMinutes(minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#copy().setMinutes(minutes, seconds, milliseconds)
	}
	get utcMinutes(): number {
		return this.getUTCMinutes()
	}
	set utcMinutes(minutes: ValueSetter) {
		this.setUTCMinutes(minutes)
	}
	getUTCMinutes() {
		return this.toDate().getUTCMinutes()
	}
	setUTCMinutes(minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#setUTC(4, [minutes, seconds, milliseconds])
	}
	withUTCMinutes(minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#copy().setUTCMinutes(minutes, seconds, milliseconds)
	}

	get seconds(): number {
		return this.getSeconds()
	}
	set seconds(seconds: ValueSetter) {
		this.setSeconds(seconds)
	}
	getSeconds() {
		return this.#wallclock()[0].getUTCSeconds()
	}
	setSeconds(seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#setWallclock(5, [seconds, milliseconds])
	}
	withSeconds(seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#copy().setSeconds(seconds, milliseconds)
	}
	get utcSeconds(): number {
		return this.getUTCSeconds()
	}
	set utcSeconds(seconds: ValueSetter) {
		this.setUTCSeconds(seconds)
	}
	getUTCSeconds() {
		return this.toDate().getUTCSeconds()
	}
	setUTCSeconds(seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#setUTC(5, [seconds, milliseconds])
	}
	withUTCSeconds(seconds?: ValueSetter, milliseconds?: ValueSetter) {
		return this.#copy().setUTCSeconds(seconds, milliseconds)
	}

	get milliseconds(): number {
		return this.getMilliseconds()
	}
	set milliseconds(milliseconds: ValueSetter) {
		this.setMilliseconds(milliseconds)
	}
	getMilliseconds() {
		return this.#wallclock()[0].getUTCMilliseconds()
	}
	setMilliseconds(milliseconds?: ValueSetter) {
		return this.#setWallclock(6, [milliseconds])
	}
	withMilliseconds(milliseconds?: ValueSetter) {
		return this.#copy().setMilliseconds(milliseconds)
	}
	get utcMilliseconds(): number {
		return this.getUTCMilliseconds()
	}
	set utcMilliseconds(milliseconds: ValueSetter) {
		this.setUTCMilliseconds(milliseconds)
	}
	getUTCMilliseconds() {
		return this.toDate().getUTCMilliseconds()
	}
	setUTCMilliseconds(milliseconds?: ValueSetter) {
		return this.#setUTC(6, [milliseconds])
	}
	withUTCMilliseconds(milliseconds?: ValueSetter) {
		return this.#copy().setUTCMilliseconds(milliseconds)
	}

	get day() {
		return this.getDay()
	}
	getDay() {
		return this.#wallclock()[0].getUTCDay()
	}
	get utcDay() {
		return this.getUTCDay()
	}
	getUTCDay() {
		return this.toDate().getUTCDay()
	}

	get timezoneOffset() {
		return this.getTimezoneOffset()
	}
	getTimezoneOffset() {
		return -this.#currentOffset() / 60_000 + 0
	}

	get offset() {
		return this.getOffset()
	}
	getOffset() {
		return this.#currentOffset() / oneHour
	}

	get time(): number {
		return this.getTime()
	}
	set time(time: ValueSetter) {
		this.setTime(time)
	}
	getTime() {
		if (this.#time === undefined) throw new RangeError('Ambiguous time')
		return this.#time
	}
	setTime(time?: ValueSetter) {
		if (typeof time === 'function') time = time(this.getTime())
		if (time !== undefined) {
			// ToNumber and the range check, as Date#setTime does
			this.#time = new Date(+time).getTime()
			this.#unresolved = undefined
		}
		return this
	}
	withTime(time?: ValueSetter) {
		return this.#copy().setTime(time)
	}

	toDate() {
		return new Date(this.getTime())
	}

	// The conversions of Date, applied to the same instant
	valueOf() {
		return this.toDate().valueOf()
	}
	toISOString() {
		return this.toDate().toISOString()
	}
	toJSON(key?: any) {
		return this.toDate().toJSON(key)
	}
	toString() {
		return this.toDate().toString()
	}
	toDateString() {
		return this.toDate().toDateString()
	}
	toTimeString() {
		return this.toDate().toTimeString()
	}
	toUTCString() {
		return this.toDate().toUTCString()
	}
	toLocaleString(locales?: Parameters<Date['toLocaleString']>[0], options?: Intl.DateTimeFormatOptions) {
		return this.toDate().toLocaleString(locales, options)
	}
	toLocaleDateString(locales?: Parameters<Date['toLocaleDateString']>[0], options?: Intl.DateTimeFormatOptions) {
		return this.toDate().toLocaleDateString(locales, options)
	}
	toLocaleTimeString(locales?: Parameters<Date['toLocaleTimeString']>[0], options?: Intl.DateTimeFormatOptions) {
		return this.toDate().toLocaleTimeString(locales, options)
	}
	// new Date(zonedDate) and zonedDate + '' convert with the 'default' hint, which gives toString() on a Date. Here it
	// gives the ISO string, which keeps the milliseconds and any year. String() and template literals give toString().
	[Symbol.toPrimitive](hint: string) {
		const date = this.toDate()
		return hint === 'default' && !Number.isNaN(date.getTime()) ? date.toISOString() : date[Symbol.toPrimitive](hint)
	}

	// A copy. Another receiver throws TypeError, as with the methods of Date.
	#copy() {
		return new ZonedDate(this)
	}
	// The offset in milliseconds at the instant
	#currentOffset() {
		const time = this.getTime()
		if (Number.isNaN(time)) return NaN
		if (this.#offsetTime !== time) {
			this.#offset = this.#offsetAt(time)
			this.#offsetTime = time
		}
		return this.#offset
	}
	// The offset in milliseconds at an instant inside the Date range, and NaN without an instant (an invalid clock)
	#offsetAt(time: number) {
		if (Number.isNaN(time)) return NaN
		return makeDate(...wallclockFieldsOf(this.#_dateTimeFormat, time), modulo(time, 1000)) - time
	}
	// The wallclock in milliseconds, as if it were UTC
	#wallclockTime() {
		return this.#time === undefined ? this.#unresolved! : this.#time + this.#currentOffset()
	}
	// A Date whose UTC fields are the wallclock, and the years to add to its UTC year
	#wallclock() {
		return wallclockOf(this.#wallclockTime())
	}
	#setWallclock(index: number, values: ValueSetter[]) {
		const wallclockTime = this.#wallclockTime()
		const next = setFields(wallclockTime, index, values)
		// an unchanged wallclock keeps its instant, even in a repeated hour
		if (next !== wallclockTime) this.#setWallclockTime(next)
		return this
	}
	#setUTC(index: number, values: ValueSetter[]) {
		this.#time = timeClip(setFields(this.getTime(), index, values))
		return this
	}
	// Moves to another time zone or disambiguation and keeps the wallclock. With the same disambiguation, an instant that
	// already shows the wallclock in the new time zone stays.
	#rezone(timezone: string, disambiguation: Disambiguation) {
		const wallclockTime = this.#wallclockTime()
		const time = this.#time
		const keep = disambiguation === this.#_disambiguation && time !== undefined && !Number.isNaN(time)
		this.#timezone = timezone
		this.#disambiguation = disambiguation
		if (keep && this.#currentOffset() === wallclockTime - time) return
		this.#setWallclockTime(wallclockTime)
	}
	// A copy of a ZonedDate of another copy of this package. A 'reject' wallclock that is unresolved has no instant, so it
	// is read from the wallclock getters.
	#copyForeign(value: ZonedDate) {
		try {
			this.#time = value.getTime()
		} catch {
			this.#unresolved = makeDate(value.getFullYear(), value.getMonth(), value.getDate(), value.getHours(), value.getMinutes(), value.getSeconds(), value.getMilliseconds())
		}
	}
	// Sets the instant of a wallclock (in milliseconds, as if it were UTC), or leaves the wallclock unresolved
	#setWallclockTime(wallclockTime: number) {
		this.#time = this.#instantOf(wallclockTime)
		this.#unresolved = this.#time === undefined ? wallclockTime : undefined
	}
	// The instant of a wallclock, chosen by the disambiguation option, or undefined if 'reject' rejects it
	#instantOf(wallclockTime: number) {
		// offsets are less than a day, so a wallclock more than a day past the Date range has no instant in it
		if (!(Math.abs(wallclockTime) <= maxTime + oneDay)) return NaN
		// The offsets before and after any change near the wallclock: each gives an instant, and the instants whose
		// own offset matches are the ones that show the wallclock. Repeated wallclocks have two, skipped ones none.
		const before = this.#offsetAt(clamp(wallclockTime - oneDay))
		const after = this.#offsetAt(clamp(wallclockTime + oneDay))
		const instants = [...new Set([before, after])]
			.map(offset => wallclockTime - offset)
			.filter(time => this.#offsetAt(clamp(time)) === wallclockTime - time)
			.sort((a, b) => a - b)
		if (instants.length === 0) {
			if (this.#_disambiguation === 'reject') return undefined
			// a skipped wallclock moves by the length of the gap, back for earlier and forward otherwise
			return timeClip(wallclockTime - (this.#_disambiguation === 'earlier' ? after : before))
		}
		if (instants.length > 1 && this.#_disambiguation === 'reject') return undefined
		const time = timeClip(this.#_disambiguation === 'later' ? instants[instants.length - 1] : instants[0])
		// the offset at the instant is known
		this.#offset = wallclockTime - time
		this.#offsetTime = time
		return time
	}
	#setString(string: string) {
		const [days, time, zone] = parseString(string)
		if (days !== undefined) {
			if (zone === undefined) this.#setWallclockTime(days * oneDay + time)
			else this.#time = timeClip(days * oneDay + time - zone)
			return
		}
		// a time without a date falls on today's date in the time zone. A clock outside the Date range is invalid, like NaN.
		const now = timeClip(Date.now())
		if (zone === undefined) this.#setWallclockTime(Math.floor((now + this.#offsetAt(now)) / oneDay) * oneDay + time)
		else this.#time = timeClip(todayTime(time, zone, now, instant => this.#offsetAt(clamp(instant))))
	}
}

// The formatter of the wallclock in a time zone, created once per time zone
function formatterOf(timezone: string) {
	const {DateTimeFormat} = Intl
	if (!formatters.has(DateTimeFormat)) formatters.set(DateTimeFormat, {
		hourCycle: hourCycleOf(DateTimeFormat),
		byTimezone: Object.create(null),
	})
	const {hourCycle, byTimezone} = formatters.get(DateTimeFormat)!
	byTimezone[timezone] ??= new DateTimeFormat('en-US', {
		...hourCycle,
		timeZone: timezone,
		era: 'short',
		year: 'numeric',
		month: 'numeric',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	})
	return byTimezone[timezone]
}

/**
 * The option for a 24-hour clock. Some browser does not support hourCycle
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
function hourCycleOf(DateTimeFormat: typeof Intl.DateTimeFormat): Intl.DateTimeFormatOptions {
	return [
		'11/23/2000 12:00:00 AM',
		'11/23/2000, 12:00:00 AM',
	].includes(
		new DateTimeFormat('en-US', {
			hourCycle: 'h23',
			timeZone: 'UTC',
			year: 'numeric',
			month: 'numeric',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		}).format(new Date('2000-11-23T00:00:00.000Z'))
	) ? {hour12: false} : {hourCycle: 'h23'}
}

// The wallclock that a formatter shows for an instant: [year, month, day, hours, minutes, seconds].
// Years before 1 CE are shown with the era BC, and an engine without hourCycle may show midnight as 24.
function wallclockFieldsOf(formatter: Intl.DateTimeFormat, time: number) {
	if (typeof formatter.formatToParts !== 'function') {
		// 9/04/2021 AD, 00:30:00
		const string = formatter.format(time)
		const [month, day, year, hours, minutes, seconds] = string.split(/[^0-9]/).filter(Boolean).map(Number)
		return [string.includes('B') ? 1 - year : year, month - 1, day, hours % 24, minutes, seconds]
	}
	const parts: Record<string, string> = Object.create(null)
	for (const {type, value} of formatter.formatToParts(time)) parts[type] = value
	const year = Number(parts.year)
	return [parts.era?.startsWith('B') ? 1 - year : year, Number(parts.month) - 1, Number(parts.day), Number(parts.hour) % 24, Number(parts.minute), Number(parts.second)]
}

// The nearest instant inside the Date range
function clamp(time: number) {
	return Math.min(Math.max(time, -maxTime), maxTime)
}
