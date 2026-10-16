import {isDate, isZonedDate, oneDay, oneHour, parseString, resolve, setFields, takeOptions, timeClip, todayTime, utc, wallclockOf} from './shared.js'

/**
 * The setters that Date has return the instance. Each also has Date's own signature, which returns the time, so that an
 * OffsetDate is assignable to Date; calls with the first signature's arguments get the instance.
 */
class OffsetDate extends Date {
	static defaultOffset = 0
	static now() {
		return Date.now()
	}

	#offset: number // milliseconds
	constructor(options?: OffsetDate.Options)
	constructor(value: number | string | Date | OffsetDate.DateLike | null, options?: OffsetDate.Options | null)
	constructor(fullYear: number, month: number, options?: OffsetDate.Options | null)
	constructor(fullYear: number, month: number, date: number, options?: OffsetDate.Options | null)
	constructor(fullYear: number, month: number, date: number, hours: number, options?: OffsetDate.Options | null)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, options?: OffsetDate.Options | null)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, options?: OffsetDate.Options | null)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, milliseconds: number, options?: OffsetDate.Options | null)
	constructor(...args: unknown[]) {
		const options = takeOptions<OffsetDate.Options>(args)
		const [value] = args
		const offset = toOffset(options?.offset ?? (args.length === 1 && isOffsetDate(value) ? value.getOffset() : OffsetDate.defaultOffset))
		if (args.length === 0) super(Date.now()) // new Date()
		else if (args.length > 1) super(utc(...args as number[]) - offset) // new Date(year, month, date, hours, minutes, seconds, ms)
		else if (typeof value === 'string') super(timeOfString(value, offset)) // new Date(dateString)
		else super(isZonedDate(value) ? value.getTime() : value as number) // new Date(value), which converts any value
		this.#offset = offset
	}

	get fullYear(): number {
		return this.getFullYear()
	}
	set fullYear(year: OffsetDate.ValueSetter) {
		this.setFullYear(year)
	}
	getFullYear() {
		const [date, years] = this.#wallclock()
		return date.getUTCFullYear() + years
	}
	setFullYear(year?: OffsetDate.ValueSetter, month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): this
	setFullYear(year: number, month?: number, date?: number): number
	setFullYear(year?: OffsetDate.ValueSetter, month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): this | number {
		return this.#setWallclock(0, [year, month, date])
	}
	withFullYear(year?: OffsetDate.ValueSetter, month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter) {
		return this.#copy().setFullYear(year, month, date)
	}
	get utcFullYear(): number {
		return this.getUTCFullYear()
	}
	set utcFullYear(year: OffsetDate.ValueSetter) {
		this.setUTCFullYear(year)
	}
	setUTCFullYear(year?: OffsetDate.ValueSetter, month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): this
	setUTCFullYear(year: number, month?: number, date?: number): number
	setUTCFullYear(year?: OffsetDate.ValueSetter, month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): this | number {
		return this.#setUTC(0, [year, month, date])
	}
	withUTCFullYear(year?: OffsetDate.ValueSetter, month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter) {
		return this.#copy().setUTCFullYear(year, month, date)
	}

	get month(): number {
		return this.getMonth()
	}
	set month(month: OffsetDate.ValueSetter) {
		this.setMonth(month)
	}
	getMonth() {
		return this.#wallclock()[0].getUTCMonth()
	}
	setMonth(month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): this
	setMonth(month: number, date?: number): number
	setMonth(month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): this | number {
		return this.#setWallclock(1, [month, date])
	}
	withMonth(month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter) {
		return this.#copy().setMonth(month, date)
	}
	get utcMonth(): number {
		return this.getUTCMonth()
	}
	set utcMonth(month: OffsetDate.ValueSetter) {
		this.setUTCMonth(month)
	}
	setUTCMonth(month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): this
	setUTCMonth(month: number, date?: number): number
	setUTCMonth(month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): this | number {
		return this.#setUTC(1, [month, date])
	}
	withUTCMonth(month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter) {
		return this.#copy().setUTCMonth(month, date)
	}

	get date(): number {
		return this.getDate()
	}
	set date(date: OffsetDate.ValueSetter) {
		this.setDate(date)
	}
	getDate() {
		return this.#wallclock()[0].getUTCDate()
	}
	setDate(date?: OffsetDate.ValueSetter, hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setDate(date: number): number
	setDate(date?: OffsetDate.ValueSetter, hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this | number {
		return this.#setWallclock(2, [date, hours, minutes, seconds, milliseconds])
	}
	withDate(date?: OffsetDate.ValueSetter, hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter) {
		return this.#copy().setDate(date, hours, minutes, seconds, milliseconds)
	}
	get utcDate(): number {
		return this.getUTCDate()
	}
	set utcDate(date: OffsetDate.ValueSetter) {
		this.setUTCDate(date)
	}
	setUTCDate(date?: OffsetDate.ValueSetter, hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setUTCDate(date: number): number
	setUTCDate(date?: OffsetDate.ValueSetter, hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this | number {
		return this.#setUTC(2, [date, hours, minutes, seconds, milliseconds])
	}
	withUTCDate(date?: OffsetDate.ValueSetter, hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter) {
		return this.#copy().setUTCDate(date, hours, minutes, seconds, milliseconds)
	}

	get hours(): number {
		return this.getHours()
	}
	set hours(hours: OffsetDate.ValueSetter) {
		this.setHours(hours)
	}
	getHours() {
		return this.#wallclock()[0].getUTCHours()
	}
	setHours(hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setHours(hours: number, minutes?: number, seconds?: number, milliseconds?: number): number
	setHours(hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this | number {
		return this.#setWallclock(3, [hours, minutes, seconds, milliseconds])
	}
	withHours(hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter) {
		return this.#copy().setHours(hours, minutes, seconds, milliseconds)
	}
	get utcHours(): number {
		return this.getUTCHours()
	}
	set utcHours(hours: OffsetDate.ValueSetter) {
		this.setUTCHours(hours)
	}
	setUTCHours(hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setUTCHours(hours: number, minutes?: number, seconds?: number, milliseconds?: number): number
	setUTCHours(hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this | number {
		return this.#setUTC(3, [hours, minutes, seconds, milliseconds])
	}
	withUTCHours(hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter) {
		return this.#copy().setUTCHours(hours, minutes, seconds, milliseconds)
	}

	get minutes(): number {
		return this.getMinutes()
	}
	set minutes(minutes: OffsetDate.ValueSetter) {
		this.setMinutes(minutes)
	}
	getMinutes() {
		return this.#wallclock()[0].getUTCMinutes()
	}
	setMinutes(minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setMinutes(minutes: number, seconds?: number, milliseconds?: number): number
	setMinutes(minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this | number {
		return this.#setWallclock(4, [minutes, seconds, milliseconds])
	}
	withMinutes(minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter) {
		return this.#copy().setMinutes(minutes, seconds, milliseconds)
	}
	get utcMinutes(): number {
		return this.getUTCMinutes()
	}
	set utcMinutes(minutes: OffsetDate.ValueSetter) {
		this.setUTCMinutes(minutes)
	}
	setUTCMinutes(minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setUTCMinutes(minutes: number, seconds?: number, milliseconds?: number): number
	setUTCMinutes(minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this | number {
		return this.#setUTC(4, [minutes, seconds, milliseconds])
	}
	withUTCMinutes(minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter) {
		return this.#copy().setUTCMinutes(minutes, seconds, milliseconds)
	}

	get seconds(): number {
		return this.getSeconds()
	}
	set seconds(seconds: OffsetDate.ValueSetter) {
		this.setSeconds(seconds)
	}
	getSeconds() {
		return this.#wallclock()[0].getUTCSeconds()
	}
	setSeconds(seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setSeconds(seconds: number, milliseconds?: number): number
	setSeconds(seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this | number {
		return this.#setWallclock(5, [seconds, milliseconds])
	}
	withSeconds(seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter) {
		return this.#copy().setSeconds(seconds, milliseconds)
	}
	get utcSeconds(): number {
		return this.getUTCSeconds()
	}
	set utcSeconds(seconds: OffsetDate.ValueSetter) {
		this.setUTCSeconds(seconds)
	}
	setUTCSeconds(seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setUTCSeconds(seconds: number, milliseconds?: number): number
	setUTCSeconds(seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this | number {
		return this.#setUTC(5, [seconds, milliseconds])
	}
	withUTCSeconds(seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter) {
		return this.#copy().setUTCSeconds(seconds, milliseconds)
	}

	get milliseconds(): number {
		return this.getMilliseconds()
	}
	set milliseconds(milliseconds: OffsetDate.ValueSetter) {
		this.setMilliseconds(milliseconds)
	}
	getMilliseconds() {
		return this.#wallclock()[0].getUTCMilliseconds()
	}
	setMilliseconds(milliseconds?: OffsetDate.ValueSetter): this
	setMilliseconds(milliseconds: number): number
	setMilliseconds(milliseconds?: OffsetDate.ValueSetter): this | number {
		return this.#setWallclock(6, [milliseconds])
	}
	withMilliseconds(milliseconds?: OffsetDate.ValueSetter) {
		return this.#copy().setMilliseconds(milliseconds)
	}
	get utcMilliseconds(): number {
		return this.getUTCMilliseconds()
	}
	set utcMilliseconds(milliseconds: OffsetDate.ValueSetter) {
		this.setUTCMilliseconds(milliseconds)
	}
	setUTCMilliseconds(milliseconds?: OffsetDate.ValueSetter): this
	setUTCMilliseconds(milliseconds: number): number
	setUTCMilliseconds(milliseconds?: OffsetDate.ValueSetter): this | number {
		return this.#setUTC(6, [milliseconds])
	}
	withUTCMilliseconds(milliseconds?: OffsetDate.ValueSetter) {
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

	getYear() {
		return this.getFullYear() - 1900
	}
	/** Legacy: as in Date, the years 0 to 99 are years since 1900 */
	setYear(year: number) {
		// ToNumber, which throws for a BigInt as Date does
		const value = +year
		const integer = Math.trunc(value)
		return this.setFullYear(integer >= 0 && integer <= 99 ? 1900 + integer : value)
	}

	get timezoneOffset(): number {
		return this.getTimezoneOffset()
	}
	set timezoneOffset(timezoneOffset: OffsetDate.ValueSetter) {
		this.setTimezoneOffset(timezoneOffset)
	}
	getTimezoneOffset() {
		return -this.#offset / 60_000 + 0
	}
	setTimezoneOffset(timezoneOffset?: OffsetDate.ValueSetter) {
		const [value] = resolve([timezoneOffset], [this.getTimezoneOffset()])
		this.#offset = toOffset(-value / 60)
		return this
	}
	withTimezoneOffset(timezoneOffset?: OffsetDate.ValueSetter) {
		return this.#copy().setTimezoneOffset(timezoneOffset)
	}

	get offset(): number {
		return this.getOffset()
	}
	set offset(offset: OffsetDate.ValueSetter) {
		this.setOffset(offset)
	}
	getOffset() {
		return this.#offset / oneHour
	}
	setOffset(offset?: OffsetDate.ValueSetter) {
		const [value] = resolve([offset], [this.getOffset()])
		this.#offset = toOffset(value)
		return this
	}
	withOffset(offset?: OffsetDate.ValueSetter) {
		return this.#copy().setOffset(offset)
	}

	get time(): number {
		return this.getTime()
	}
	set time(time: OffsetDate.ValueSetter) {
		this.setTime(time)
	}
	setTime(time?: OffsetDate.ValueSetter): this
	setTime(time: number): number
	setTime(time?: OffsetDate.ValueSetter): this | number {
		const [value] = resolve([time], [this.getTime()])
		super.setTime(value)
		return this
	}
	withTime(time?: OffsetDate.ValueSetter) {
		return this.#copy().setTime(time)
	}

	// A copy. Another receiver throws TypeError, as with the methods of Date.
	#copy() {
		return new OffsetDate(this)
	}
	// A Date whose UTC fields are the wallclock, and the years to add to its UTC year
	#wallclock() {
		return wallclockOf(this.getTime() + this.#offset)
	}
	#setWallclock(index: number, values: OffsetDate.ValueSetter[]) {
		super.setTime(setFields(this.getTime() + this.#offset, index, values) - this.#offset)
		return this
	}
	#setUTC(index: number, values: OffsetDate.ValueSetter[]) {
		super.setTime(setFields(this.getTime(), index, values))
		return this
	}
}

namespace OffsetDate {
	/** A value, a function that takes the current value and returns the new one, or undefined to keep the current value */
	export type ValueSetter = number | undefined | ((value: number) => number | undefined)
	export interface Options {
		/** UTC offset in hours. undefined or null: the offset of the copied OffsetDate, or else OffsetDate.defaultOffset */
		offset?: number | null | undefined
	}
	/**
	 * A value that Date converts to an instant through Symbol.toPrimitive or valueOf(), such as a ZonedDate or a dayjs
	 * object. Temporal objects, whose conversions throw, are left out.
	 */
	export interface DateLike {
		valueOf(): number
		epochMilliseconds?: undefined
		calendarId?: undefined
		nanosecond?: undefined
		sign?: undefined
	}
}

export default OffsetDate

// The instant of a date string. A string without a zone is a wallclock at the offset (milliseconds).
function timeOfString(string: string, offset: number) {
	const [days, time, zone = offset] = parseString(string)
	if (days !== undefined) return days * oneDay + time - zone
	// a time without a date falls on today's date at the offset. A clock outside the Date range is invalid, like NaN.
	return todayTime(time, zone, timeClip(Date.now()), () => offset)
}

// An OffsetDate of any realm or copy of this package
function isOffsetDate(value: unknown): value is OffsetDate {
	return isDate(value) && typeof (value as Partial<OffsetDate>).getOffset === 'function'
}

// An offset in hours, in milliseconds
function toOffset(hours: number) {
	const offset = Math.round(hours * oneHour)
	if (!Number.isFinite(offset)) throw new RangeError(`Invalid offset: ${hours}`)
	return offset + 0 // not -0
}
