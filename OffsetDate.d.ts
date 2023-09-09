export default class OffsetDate extends Date {
	static defaultOffset: number

	constructor(options?: {offset?: number})
	constructor(offsetDate: OffsetDate, options?: {offset?: number})
	constructor(date: Date, options?: {offset?: number})
	constructor(time: number, options?: {offset?: number})
	constructor(dateStr: string, options?: {offset?: number})
	constructor(fullYear: number, month: number, options?: {offset?: number})
	constructor(fullYear: number, month: number, date: number, options?: {offset?: number})
	constructor(fullYear: number, month: number, date: number, hours: number, options?: {offset?: number})
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, options?: {offset?: number})
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, options?: {offset?: number})
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, miliseconds: number, options?: {offset?: number})

	set fullYear(year: undefined | number | ((year: number) => number | undefined))
	get fullYear(): number
	setFullYear(year?: number | ((year: number) => number | undefined)): this
	withFullYear(year?: number | ((year: number) => number | undefined)): OffsetDate
	set utcFullYear(year: undefined | number | ((year: number) => number | undefined))
	get utcFullYear(): number
	setUTCFullYear(year?: number | ((year: number) => number | undefined)): this
	withUTCFullYear(year?: number | ((year: number) => number | undefined)): OffsetDate

	set month(arg: undefined | number | ((month: number) => number | undefined))
	get month(): number
	getMonth(): number | ((month: number) => number | undefined)
	setMonth(month?: number | ((month: number) => number | undefined)): this
	withMonth(month?: number | ((month: number) => number | undefined)): OffsetDate
	set utcMonth(arg: undefined | number | ((month: number) => number | undefined))
	get utcMonth(): number
	setUTCMonth(month?: number | ((month: number) => number | undefined)): this
	withUTCMonth(month?: number | ((month: number) => number | undefined)): OffsetDate

	set date(arg: undefined | number | ((date: number) => number | undefined))
	get date(): number
	getDate(): number | ((date: number) => number | undefined)
	setDate(date?: number | ((date: number) => number | undefined)): this
	withDate(date?: number | ((date: number) => number | undefined)): OffsetDate
	set utcDate(arg: undefined | number | ((date: number) => number | undefined))
	get utcDate(): number
	setUTCDate(date?: number | ((date: number) => number | undefined)): this
	withUTCDate(date?: number | ((date: number) => number | undefined)): OffsetDate

	set hours(arg: undefined | number | ((hours: number) => number | undefined))
	get hours(): number
	getHours(): number | ((hours: number) => number | undefined)
	setHours(hours?: number | ((hours: number) => number | undefined)): this
	withHours(hours?: number | ((hours: number) => number | undefined)): OffsetDate
	set utcHours(arg: undefined | number | ((hours: number) => number | undefined))
	get utcHours(): number
	setUTCHours(hours?: number | ((hours: number) => number | undefined)): this
	withUTCHours(hours?: number | ((hours: number) => number | undefined)): OffsetDate

	set minutes(arg: undefined | number | ((minutes: number) => number | undefined))
	get minutes(): number
	getMinutes(): number | ((minutes: number) => number | undefined)
	setMinutes(minutes?: number | ((minutes: number) => number | undefined)): this
	withMinutes(minutes?: number | ((minutes: number) => number | undefined)): OffsetDate
	set utcMinutes(arg: undefined | number | ((minutes: number) => number | undefined))
	get utcMinutes(): number
	setUTCMinutes(minutes?: number | ((minutes: number) => number | undefined)): this
	withUTCMinutes(minutes?: number | ((minutes: number) => number | undefined)): OffsetDate

	set seconds(arg: undefined | number | ((seconds: number) => number | undefined))
	get seconds(): number
	getSeconds(): number | ((seconds: number) => number | undefined)
	setSeconds(seconds?: number | ((seconds: number) => number | undefined)): this
	withSeconds(seconds?: number | ((seconds: number) => number | undefined)): OffsetDate
	set utcSeconds(arg: undefined | number | ((seconds: number) => number | undefined))
	get utcSeconds(): number
	setUTCSeconds(seconds?: number | ((seconds: number) => number | undefined)): this
	withUTCSeconds(seconds?: number | ((seconds: number) => number | undefined)): OffsetDate

	set milliseconds(arg: undefined | number | ((milliseconds: number) => number | undefined))
	get milliseconds(): number
	getMilliseconds(): number | ((milliseconds: number) => number | undefined)
	setMilliseconds(milliseconds?: number | ((milliseconds: number) => number | undefined)): this
	withMilliseconds(milliseconds?: number | ((milliseconds: number) => number | undefined)): OffsetDate
	set utcMilliseconds(arg: undefined | number | ((milliseconds: number) => number | undefined))
	get utcMilliseconds(): number
	setUTCMilliseconds(milliseconds?: number | ((milliseconds: number) => number | undefined)): this
	withUTCMilliseconds(milliseconds?: number | ((milliseconds: number) => number | undefined)): OffsetDate

	set timezoneOffset(arg: undefined | number | ((offset: number) => number | undefined))
	get timezoneOffset(): number
	getTimezoneOffset(): number | ((offset: number) => number | undefined)
	setTimezoneOffset(offset?: number | ((offset: number) => number | undefined)): this
	withTimezoneOffset(offset?: number | ((offset: number) => number | undefined)): OffsetDate

	set offset(arg: undefined | number | ((offset: number) => number | undefined))
	get offset(): number
	getOffset(): number
	setOffset(offset?: number | ((offset: number) => number | undefined)): this
	withOffset(offset?: number | ((offset: number) => number | undefined)): OffsetDate

	get day(): number
	get utcDay(): number

	set time(arg: undefined | number | ((time: number) => number | undefined))
	get time(): number
	getTime(): number | ((time: number) => number | undefined)
	setTime(time?: number | ((time: number) => number | undefined)): this
	withTime(time?: number | ((time: number) => number | undefined)): OffsetDate
}
