type ValueSetter<T = number> = T | undefined | ((value: T) => T | undefined)
type Disambiguation = 'compatible' | 'earlier' | 'later' | 'reject'
type Options = {
	timezone?: string
	disambiguation?: Disambiguation
}
export default class ZonedDate {
	static UTC : typeof Date.UTC
	static now : typeof Date.now
	static parse: typeof Date.parse

	static defaultTimezone: string
	static defaultDisambiguation: Disambiguation
	constructor(options?: Options)
	constructor(zonedDate: ZonedDate, options?: Options)
	constructor(date: Date, options?: Options)
	constructor(time: number, options?: Options)
	constructor(dateStr: string, options?: Options)
	constructor(fullYear: number, month: number, options?: Options)
	constructor(fullYear: number, month: number, date: number, options?: Options)
	constructor(fullYear: number, month: number, date: number, hours: number, options?: Options)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, options?: Options)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, options?: Options)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, miliseconds: number, options?: Options)

	get timezone(): string
	set timezone(timezone: ValueSetter<string>)
	getTimezone(): string
	setTimezone(timezone?: ValueSetter<string>): this
	withTimezone(timezone?: ValueSetter<string>): ZonedDate

	get disambiguation(): Disambiguation
	set disambiguation(disambiguation: ValueSetter<Disambiguation>)
	getDisambiguation(): Disambiguation
	setDisambiguation(disambiguation?: ValueSetter<Disambiguation>): this
	withDisambiguation(disambiguation?: ValueSetter<Disambiguation>): ZonedDate

	set fullYear(year: ValueSetter)
	get fullYear(): number
	setFullYear(year?: ValueSetter): this
	withFullYear(year?: ValueSetter): ZonedDate
	set utcFullYear(year: ValueSetter)
	get utcFullYear(): number
	setUTCFullYear(year?: ValueSetter): this
	withUTCFullYear(year?: ValueSetter): ZonedDate

	set month(month: ValueSetter)
	get month(): number
	getMonth(): number
	setMonth(month?: ValueSetter): this
	withMonth(month?: ValueSetter): ZonedDate
	set utcMonth(month: ValueSetter)
	get utcMonth(): number
	setUTCMonth(month?: ValueSetter): this
	withUTCMonth(month?: ValueSetter): ZonedDate

	set date(date: ValueSetter)
	get date(): number
	getDate(): number
	setDate(date?: ValueSetter, hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter): this
	withDate(date?: ValueSetter, hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter): OffsetDate
	set utcDate(date: ValueSetter)
	get utcDate(): number
	setUTCDate(date?: ValueSetter, hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter): this
	withUTCDate(date?: ValueSetter, hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter): OffsetDate

	set hours(hours: ValueSetter)
	get hours(): number
	getHours(): number
	setHours(hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter): this
	withHours(hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter): OffsetDate
	set utcHours(hours: ValueSetter)
	get utcHours(): number
	setUTCHours(hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter): this
	withUTCHours(hours?: ValueSetter, minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter): OffsetDate

	set minutes(minutes: ValueSetter)
	get minutes(): number
	getMinutes(): number
	setMinutes(minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter): this
	withMinutes(minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter): OffsetDate
	set utcMinutes(minutes: ValueSetter)
	get utcMinutes(): number
	setUTCMinutes(minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter): this
	withUTCMinutes(minutes?: ValueSetter, seconds?: ValueSetter, milliseconds?: ValueSetter): OffsetDate

	set seconds(seconds: ValueSetter)
	get seconds(): number
	getSeconds(): number
	setSeconds(seconds?: ValueSetter, milliseconds?: ValueSetter): this
	withSeconds(seconds?: ValueSetter, milliseconds?: ValueSetter): OffsetDate
	set utcSeconds(seconds: ValueSetter)
	get utcSeconds(): number
	setUTCSeconds(seconds?: ValueSetter, milliseconds?: ValueSetter): this
	withUTCSeconds(seconds?: ValueSetter, milliseconds?: ValueSetter): OffsetDate

	set milliseconds(milliseconds: ValueSetter)
	get milliseconds(): number
	getMilliseconds(): number
	setMilliseconds(milliseconds?: ValueSetter): this
	withMilliseconds(milliseconds?: ValueSetter): OffsetDate
	set utcMilliseconds(milliseconds: ValueSetter)
	get utcMilliseconds(): number
	setUTCMilliseconds(milliseconds?: ValueSetter): this
	withUTCMilliseconds(milliseconds?: ValueSetter): OffsetDate

	get timezoneOffset(): number
	getTimezoneOffset(): number

	get offset(): number
	getOffset(): number

	get day(): number
	get utcDay(): number

	set time(time: ValueSetter)
	get time(): number
	getTime(): number
	setTime(time?: ValueSetter): this
	withTime(time?: ValueSetter): ZonedDate

	toDate(): Date

	toDateString: typeof Date.prototype.toDateString
	toISOString: typeof Date.prototype.toISOString
	toJSON: typeof Date.prototype.toJSON
	toLocaleDateString: typeof Date.prototype.toLocaleDateString
	toLocaleString: typeof Date.prototype.toLocaleString
	toLocaleTimeString: typeof Date.prototype.toLocaleTimeString
	toString: typeof Date.prototype.toString
	toTimeString: typeof Date.prototype.toTimeString
	toUTCString: typeof Date.prototype.toUTCString
	valueOf: typeof Date.prototype.valueOf
}
