export default class ZonedDate {
	static UTC : typeof Date.UTC
	static now : typeof Date.now
	static parse: typeof Date.parse

	static defaultTimezone: string
	static defaultDisambiguation: 'compatible' | 'earlier' | 'later' | 'reject'
	constructor(options?: {timezone?: string; disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject'})
	constructor(zonedDate: ZonedDate, options?: {timezone?: string; disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject'})
	constructor(date: Date, options?: {timezone?: string; disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject'})
	constructor(time: number, options?: {timezone?: string; disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject'})
	constructor(dateStr: string, options?: {timezone?: string; disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject'})
	constructor(fullYear: number, month: number, options?: {timezone?: string; disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject'})
	constructor(fullYear: number, month: number, date: number, options?: {timezone?: string; disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject'})
	constructor(fullYear: number, month: number, date: number, hours: number, options?: {timezone?: string; disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject'})
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, options?: {timezone?: string; disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject'})
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, options?: {timezone?: string; disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject'})
	constructor(fullYear: number, month: number, date: number, hours: number, minutes: number, seconds: number, miliseconds: number, options?: {timezone?: string; disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject'})

	get timezone(): string
	set timezone(timezone: undefined | string | ((timezone: string) => string | undefined))
	getTimezone(): string
	setTimezone(timezone?: string | ((timezone: string) => string | undefined)): this
	withTimezone(timezone?: string | ((timezone: string) => string | undefined)): ZonedDate

	set fullYear(year: undefined | number | ((year: number) => number | undefined))
	get fullYear(): number
	setFullYear(year?: number | ((year: number) => number | undefined)): this
	withFullYear(year?: number | ((year: number) => number | undefined)): ZonedDate
	set utcFullYear(year: undefined | number | ((year: number) => number | undefined))
	get utcFullYear(): number
	setUTCFullYear(year?: number | ((year: number) => number | undefined)): this
	withUTCFullYear(year?: number | ((year: number) => number | undefined)): ZonedDate

	set month(arg: undefined | number | ((month: number) => number | undefined))
	get month(): number
	getMonth(): number | ((month: number) => number | undefined)
	setMonth(month?: number | ((month: number) => number | undefined)): this
	withMonth(month?: number | ((month: number) => number | undefined)): ZonedDate
	set utcMonth(arg: undefined | number | ((month: number) => number | undefined))
	get utcMonth(): number
	setUTCMonth(month?: number | ((month: number) => number | undefined)): this
	withUTCMonth(month?: number | ((month: number) => number | undefined)): ZonedDate

	set date(arg: undefined | number | ((date: number) => number | undefined))
	get date(): number
	getDate(): number | ((date: number) => number | undefined)
	setDate(date?: number | ((date: number) => number | undefined)): this
	withDate(date?: number | ((date: number) => number | undefined)): ZonedDate
	set utcDate(arg: undefined | number | ((date: number) => number | undefined))
	get utcDate(): number
	setUTCDate(date?: number | ((date: number) => number | undefined)): this
	withUTCDate(date?: number | ((date: number) => number | undefined)): ZonedDate

	set hours(arg: undefined | number | ((hours: number) => number | undefined))
	get hours(): number
	getHours(): number | ((hours: number) => number | undefined)
	setHours(hours?: number | ((hours: number) => number | undefined)): this
	withHours(hours?: number | ((hours: number) => number | undefined)): ZonedDate
	set utcHours(arg: undefined | number | ((hours: number) => number | undefined))
	get utcHours(): number
	setUTCHours(hours?: number | ((hours: number) => number | undefined)): this
	withUTCHours(hours?: number | ((hours: number) => number | undefined)): ZonedDate

	set minutes(arg: undefined | number | ((minutes: number) => number | undefined))
	get minutes(): number
	getMinutes(): number | ((minutes: number) => number | undefined)
	setMinutes(minutes?: number | ((minutes: number) => number | undefined)): this
	withMinutes(minutes?: number | ((minutes: number) => number | undefined)): ZonedDate
	set utcMinutes(arg: undefined | number | ((minutes: number) => number | undefined))
	get utcMinutes(): number
	setUTCMinutes(minutes?: number | ((minutes: number) => number | undefined)): this
	withUTCMinutes(minutes?: number | ((minutes: number) => number | undefined)): ZonedDate

	set seconds(arg: undefined | number | ((seconds: number) => number | undefined))
	get seconds(): number
	getSeconds(): number | ((seconds: number) => number | undefined)
	setSeconds(seconds?: number | ((seconds: number) => number | undefined)): this
	withSeconds(seconds?: number | ((seconds: number) => number | undefined)): ZonedDate
	set utcSeconds(arg: undefined | number | ((seconds: number) => number | undefined))
	get utcSeconds(): number
	setUTCSeconds(seconds?: number | ((seconds: number) => number | undefined)): this
	withUTCSeconds(seconds?: number | ((seconds: number) => number | undefined)): ZonedDate

	set milliseconds(arg: undefined | number | ((milliseconds: number) => number | undefined))
	get milliseconds(): number
	getMilliseconds(): number | ((milliseconds: number) => number | undefined)
	setMilliseconds(milliseconds?: number | ((milliseconds: number) => number | undefined)): this
	withMilliseconds(milliseconds?: number | ((milliseconds: number) => number | undefined)): ZonedDate
	set utcMilliseconds(arg: undefined | number | ((milliseconds: number) => number | undefined))
	get utcMilliseconds(): number
	setUTCMilliseconds(milliseconds?: number | ((milliseconds: number) => number | undefined)): this
	withUTCMilliseconds(milliseconds?: number | ((milliseconds: number) => number | undefined)): ZonedDate

	get timezoneOffset(): number
	getTimezoneOffset(): number | ((offset: number) => number | undefined)

	get offset(): number
	getOffset(): number

	get day(): number
	get utcDay(): number

	set time(arg: undefined | number | ((time: number) => number | undefined))
	get time(): number
	getTime(): number | ((time: number) => number | undefined)
	setTime(time?: number | ((time: number) => number | undefined)): this
	withTime(time?: number | ((time: number) => number | undefined)): ZonedDate

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
