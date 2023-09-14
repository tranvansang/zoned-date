type ValueSetter = number | undefined | ((value: number) => number | undefined)
type Options = {offset?: number}
export default class OffsetDate extends Date {
	static defaultOffset: number

	constructor(options?: Options)
	constructor(offsetDate: OffsetDate, options?: Options)
	constructor(date: Date, options?: Options)
	constructor(time: number, options?: Options)
	constructor(dateStr: string, options?: Options)
	constructor(fullYear: number, month: number, options?: Options)
	constructor(fullYear: number, month: number, date: number, options?: Options)
	constructor(fullYear: number, month: number, date: number, hours: number, options?: Options)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, options?: Options)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, options?: Options)
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, miliseconds: number, options?: Options)

	set fullYear(year: ValueSetter)
	get fullYear(): number
	setFullYear(year?: ValueSetter): this
	withFullYear(year?: ValueSetter): OffsetDate
	set utcFullYear(year: ValueSetter)
	get utcFullYear(): number
	setUTCFullYear(year?: ValueSetter): this
	withUTCFullYear(year?: ValueSetter): OffsetDate

	set month(month: ValueSetter)
	get month(): number
	getMonth(): number
	setMonth(month?: ValueSetter): this
	withMonth(month?: ValueSetter): OffsetDate
	set utcMonth(month: ValueSetter)
	get utcMonth(): number
	setUTCMonth(month?: ValueSetter): this
	withUTCMonth(month?: ValueSetter): OffsetDate

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

	set timezoneOffset(timezoneOffset: ValueSetter)
	get timezoneOffset(): number
	getTimezoneOffset(): number
	setTimezoneOffset(timezoneOffset?: ValueSetter): this
	withTimezoneOffset(timezoneOffset?: ValueSetter): OffsetDate

	set offset(offset: ValueSetter)
	get offset(): number
	getOffset(): number
	setOffset(offset?: ValueSetter): this
	withOffset(offset?: ValueSetter): OffsetDate

	get day(): number
	get utcDay(): number

	set time(time: ValueSetter)
	get time(): number
	getTime(): number
	setTime(time?: ValueSetter): this
	withTime(time?: ValueSetter): OffsetDate
}
