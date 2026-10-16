// Generated from OffsetDate.d.ts by build.sh. Do not edit.

// The setters that Date has return the instance. Each also has Date's own signature, which returns the time, so that an
// OffsetDate is assignable to Date; calls with the first signature's arguments get the instance.
declare class OffsetDate extends Date {
	static defaultOffset: number
	static now(): number

	constructor(options?: OffsetDate.Options)
	constructor(value: number | string | Date | OffsetDate.DateLike | null, options?: OffsetDate.Options | null)
	constructor(fullYear: number, month: number, options?: OffsetDate.Options | null)
	constructor(fullYear: number, month: number, date: number, options?: OffsetDate.Options | null)
	constructor(fullYear: number, month: number, date: number, hours: number, options?: OffsetDate.Options | null)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, options?: OffsetDate.Options | null)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, options?: OffsetDate.Options | null)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, milliseconds: number, options?: OffsetDate.Options | null)

	get fullYear(): number
	set fullYear(year: OffsetDate.ValueSetter)
	getFullYear(): number
	setFullYear(year?: OffsetDate.ValueSetter, month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): this
	setFullYear(year: number, month?: number, date?: number): number
	withFullYear(year?: OffsetDate.ValueSetter, month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): OffsetDate
	get utcFullYear(): number
	set utcFullYear(year: OffsetDate.ValueSetter)
	setUTCFullYear(year?: OffsetDate.ValueSetter, month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): this
	setUTCFullYear(year: number, month?: number, date?: number): number
	withUTCFullYear(year?: OffsetDate.ValueSetter, month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): OffsetDate

	get month(): number
	set month(month: OffsetDate.ValueSetter)
	getMonth(): number
	setMonth(month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): this
	setMonth(month: number, date?: number): number
	withMonth(month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): OffsetDate
	get utcMonth(): number
	set utcMonth(month: OffsetDate.ValueSetter)
	setUTCMonth(month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): this
	setUTCMonth(month: number, date?: number): number
	withUTCMonth(month?: OffsetDate.ValueSetter, date?: OffsetDate.ValueSetter): OffsetDate

	get date(): number
	set date(date: OffsetDate.ValueSetter)
	getDate(): number
	setDate(date?: OffsetDate.ValueSetter, hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setDate(date: number): number
	withDate(date?: OffsetDate.ValueSetter, hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): OffsetDate
	get utcDate(): number
	set utcDate(date: OffsetDate.ValueSetter)
	setUTCDate(date?: OffsetDate.ValueSetter, hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setUTCDate(date: number): number
	withUTCDate(date?: OffsetDate.ValueSetter, hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): OffsetDate

	get hours(): number
	set hours(hours: OffsetDate.ValueSetter)
	getHours(): number
	setHours(hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setHours(hours: number, minutes?: number, seconds?: number, milliseconds?: number): number
	withHours(hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): OffsetDate
	get utcHours(): number
	set utcHours(hours: OffsetDate.ValueSetter)
	setUTCHours(hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setUTCHours(hours: number, minutes?: number, seconds?: number, milliseconds?: number): number
	withUTCHours(hours?: OffsetDate.ValueSetter, minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): OffsetDate

	get minutes(): number
	set minutes(minutes: OffsetDate.ValueSetter)
	getMinutes(): number
	setMinutes(minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setMinutes(minutes: number, seconds?: number, milliseconds?: number): number
	withMinutes(minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): OffsetDate
	get utcMinutes(): number
	set utcMinutes(minutes: OffsetDate.ValueSetter)
	setUTCMinutes(minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setUTCMinutes(minutes: number, seconds?: number, milliseconds?: number): number
	withUTCMinutes(minutes?: OffsetDate.ValueSetter, seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): OffsetDate

	get seconds(): number
	set seconds(seconds: OffsetDate.ValueSetter)
	getSeconds(): number
	setSeconds(seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setSeconds(seconds: number, milliseconds?: number): number
	withSeconds(seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): OffsetDate
	get utcSeconds(): number
	set utcSeconds(seconds: OffsetDate.ValueSetter)
	setUTCSeconds(seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): this
	setUTCSeconds(seconds: number, milliseconds?: number): number
	withUTCSeconds(seconds?: OffsetDate.ValueSetter, milliseconds?: OffsetDate.ValueSetter): OffsetDate

	get milliseconds(): number
	set milliseconds(milliseconds: OffsetDate.ValueSetter)
	getMilliseconds(): number
	setMilliseconds(milliseconds?: OffsetDate.ValueSetter): this
	setMilliseconds(milliseconds: number): number
	withMilliseconds(milliseconds?: OffsetDate.ValueSetter): OffsetDate
	get utcMilliseconds(): number
	set utcMilliseconds(milliseconds: OffsetDate.ValueSetter)
	setUTCMilliseconds(milliseconds?: OffsetDate.ValueSetter): this
	setUTCMilliseconds(milliseconds: number): number
	withUTCMilliseconds(milliseconds?: OffsetDate.ValueSetter): OffsetDate

	get day(): number
	getDay(): number
	get utcDay(): number
	getUTCDay(): number

	// legacy: years 0 to 99 are years since 1900
	getYear(): number
	setYear(year: number): this

	get timezoneOffset(): number
	set timezoneOffset(timezoneOffset: OffsetDate.ValueSetter)
	getTimezoneOffset(): number
	setTimezoneOffset(timezoneOffset?: OffsetDate.ValueSetter): this
	withTimezoneOffset(timezoneOffset?: OffsetDate.ValueSetter): OffsetDate

	get offset(): number
	set offset(offset: OffsetDate.ValueSetter)
	getOffset(): number
	setOffset(offset?: OffsetDate.ValueSetter): this
	withOffset(offset?: OffsetDate.ValueSetter): OffsetDate

	get time(): number
	set time(time: OffsetDate.ValueSetter)
	getTime(): number
	setTime(time?: OffsetDate.ValueSetter): this
	setTime(time: number): number
	withTime(time?: OffsetDate.ValueSetter): OffsetDate
}

declare namespace OffsetDate {
	// A value, a function that takes the current value and returns the new one, or undefined to keep the current value
	export type ValueSetter = number | undefined | ((value: number) => number | undefined)
	export interface Options {
		// UTC offset in hours. undefined or null: the offset of the copied OffsetDate, or else OffsetDate.defaultOffset
		offset?: number | null | undefined
	}
	// A value that Date converts to an instant through Symbol.toPrimitive or valueOf(), such as a ZonedDate or a dayjs
	// object. Temporal objects, whose conversions throw, are left out.
	export interface DateLike {
		valueOf(): number
		epochMilliseconds?: undefined
		calendarId?: undefined
		nanosecond?: undefined
		sign?: undefined
	}
}

export = OffsetDate
