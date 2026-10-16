declare class ZonedDate {
	static defaultTimezone: string
	static defaultDisambiguation: ZonedDate.Disambiguation
	static UTC(year: number, monthIndex?: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): number
	static now(): number
	static parse(string: string): number

	constructor(options?: ZonedDate.Options)
	constructor(zonedDate: ZonedDate, options?: ZonedDate.Options | null)
	constructor(value: number | string | Date | ZonedDate.DateLike | null, options?: ZonedDate.Options | null)
	constructor(fullYear: number, month: number, options?: ZonedDate.Options | null)
	constructor(fullYear: number, month: number, date: number, options?: ZonedDate.Options | null)
	constructor(fullYear: number, month: number, date: number, hours: number, options?: ZonedDate.Options | null)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, options?: ZonedDate.Options | null)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, options?: ZonedDate.Options | null)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, milliseconds: number, options?: ZonedDate.Options | null)

	// keeps the wallclock
	get timezone(): string
	set timezone(timezone: ZonedDate.ValueSetter<string>)
	getTimezone(): string
	setTimezone(timezone?: ZonedDate.ValueSetter<string>): this
	withTimezone(timezone?: ZonedDate.ValueSetter<string>): ZonedDate

	// resolves the wallclock again
	get disambiguation(): ZonedDate.Disambiguation
	set disambiguation(disambiguation: ZonedDate.ValueSetter<ZonedDate.Disambiguation>)
	getDisambiguation(): ZonedDate.Disambiguation
	setDisambiguation(disambiguation?: ZonedDate.ValueSetter<ZonedDate.Disambiguation>): this
	withDisambiguation(disambiguation?: ZonedDate.ValueSetter<ZonedDate.Disambiguation>): ZonedDate

	get fullYear(): number
	set fullYear(year: ZonedDate.ValueSetter)
	getFullYear(): number
	setFullYear(year?: ZonedDate.ValueSetter, month?: ZonedDate.ValueSetter, date?: ZonedDate.ValueSetter): this
	withFullYear(year?: ZonedDate.ValueSetter, month?: ZonedDate.ValueSetter, date?: ZonedDate.ValueSetter): ZonedDate
	get utcFullYear(): number
	set utcFullYear(year: ZonedDate.ValueSetter)
	getUTCFullYear(): number
	setUTCFullYear(year?: ZonedDate.ValueSetter, month?: ZonedDate.ValueSetter, date?: ZonedDate.ValueSetter): this
	withUTCFullYear(year?: ZonedDate.ValueSetter, month?: ZonedDate.ValueSetter, date?: ZonedDate.ValueSetter): ZonedDate

	get month(): number
	set month(month: ZonedDate.ValueSetter)
	getMonth(): number
	setMonth(month?: ZonedDate.ValueSetter, date?: ZonedDate.ValueSetter): this
	withMonth(month?: ZonedDate.ValueSetter, date?: ZonedDate.ValueSetter): ZonedDate
	get utcMonth(): number
	set utcMonth(month: ZonedDate.ValueSetter)
	getUTCMonth(): number
	setUTCMonth(month?: ZonedDate.ValueSetter, date?: ZonedDate.ValueSetter): this
	withUTCMonth(month?: ZonedDate.ValueSetter, date?: ZonedDate.ValueSetter): ZonedDate

	get date(): number
	set date(date: ZonedDate.ValueSetter)
	getDate(): number
	setDate(date?: ZonedDate.ValueSetter, hours?: ZonedDate.ValueSetter, minutes?: ZonedDate.ValueSetter, seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): this
	withDate(date?: ZonedDate.ValueSetter, hours?: ZonedDate.ValueSetter, minutes?: ZonedDate.ValueSetter, seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): ZonedDate
	get utcDate(): number
	set utcDate(date: ZonedDate.ValueSetter)
	getUTCDate(): number
	setUTCDate(date?: ZonedDate.ValueSetter, hours?: ZonedDate.ValueSetter, minutes?: ZonedDate.ValueSetter, seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): this
	withUTCDate(date?: ZonedDate.ValueSetter, hours?: ZonedDate.ValueSetter, minutes?: ZonedDate.ValueSetter, seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): ZonedDate

	get hours(): number
	set hours(hours: ZonedDate.ValueSetter)
	getHours(): number
	setHours(hours?: ZonedDate.ValueSetter, minutes?: ZonedDate.ValueSetter, seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): this
	withHours(hours?: ZonedDate.ValueSetter, minutes?: ZonedDate.ValueSetter, seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): ZonedDate
	get utcHours(): number
	set utcHours(hours: ZonedDate.ValueSetter)
	getUTCHours(): number
	setUTCHours(hours?: ZonedDate.ValueSetter, minutes?: ZonedDate.ValueSetter, seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): this
	withUTCHours(hours?: ZonedDate.ValueSetter, minutes?: ZonedDate.ValueSetter, seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): ZonedDate

	get minutes(): number
	set minutes(minutes: ZonedDate.ValueSetter)
	getMinutes(): number
	setMinutes(minutes?: ZonedDate.ValueSetter, seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): this
	withMinutes(minutes?: ZonedDate.ValueSetter, seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): ZonedDate
	get utcMinutes(): number
	set utcMinutes(minutes: ZonedDate.ValueSetter)
	getUTCMinutes(): number
	setUTCMinutes(minutes?: ZonedDate.ValueSetter, seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): this
	withUTCMinutes(minutes?: ZonedDate.ValueSetter, seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): ZonedDate

	get seconds(): number
	set seconds(seconds: ZonedDate.ValueSetter)
	getSeconds(): number
	setSeconds(seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): this
	withSeconds(seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): ZonedDate
	get utcSeconds(): number
	set utcSeconds(seconds: ZonedDate.ValueSetter)
	getUTCSeconds(): number
	setUTCSeconds(seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): this
	withUTCSeconds(seconds?: ZonedDate.ValueSetter, milliseconds?: ZonedDate.ValueSetter): ZonedDate

	get milliseconds(): number
	set milliseconds(milliseconds: ZonedDate.ValueSetter)
	getMilliseconds(): number
	setMilliseconds(milliseconds?: ZonedDate.ValueSetter): this
	withMilliseconds(milliseconds?: ZonedDate.ValueSetter): ZonedDate
	get utcMilliseconds(): number
	set utcMilliseconds(milliseconds: ZonedDate.ValueSetter)
	getUTCMilliseconds(): number
	setUTCMilliseconds(milliseconds?: ZonedDate.ValueSetter): this
	withUTCMilliseconds(milliseconds?: ZonedDate.ValueSetter): ZonedDate

	get day(): number
	getDay(): number
	get utcDay(): number
	getUTCDay(): number

	get timezoneOffset(): number
	getTimezoneOffset(): number
	get offset(): number
	getOffset(): number

	get time(): number
	set time(time: ZonedDate.ValueSetter)
	getTime(): number
	setTime(time?: ZonedDate.ValueSetter): this
	withTime(time?: ZonedDate.ValueSetter): ZonedDate

	toDate(): Date

	// the conversions of Date, applied to the same instant
	valueOf(): number
	toISOString(): string
	toJSON(key?: any): string
	toString(): string
	toDateString(): string
	toTimeString(): string
	toUTCString(): string
	toLocaleString(locales?: Parameters<Date['toLocaleString']>[0], options?: Intl.DateTimeFormatOptions): string
	toLocaleDateString(locales?: Parameters<Date['toLocaleDateString']>[0], options?: Intl.DateTimeFormatOptions): string
	toLocaleTimeString(locales?: Parameters<Date['toLocaleTimeString']>[0], options?: Intl.DateTimeFormatOptions): string
}

declare namespace ZonedDate {
	// A value, a function that takes the current value and returns the new one, or undefined to keep the current value
	export type ValueSetter<T = number> = T | undefined | ((value: T) => T | undefined)
	export type Disambiguation = 'compatible' | 'earlier' | 'later' | 'reject'
	export interface Options {
		// time zone name. undefined or null: the time zone of the copied ZonedDate, or else ZonedDate.defaultTimezone
		timezone?: string | null | undefined
		// undefined or null: the disambiguation of the copied ZonedDate, or else ZonedDate.defaultDisambiguation
		disambiguation?: Disambiguation | null | undefined
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

export default ZonedDate
