// What OffsetDate and ZonedDate share. Internal: package.json does not export this module.
import type ZonedDate from './ZonedDate.ts'

export const oneHour = 60 * 60_000
export const oneDay = 24 * oneHour
// Date instants lie within 8.64e15 ms of 1970-01-01T00:00Z
export const maxTime = 8.64e15
// The Gregorian calendar and the days of the week repeat every 400 years: 146,097 days
const cycle = 146_097 * oneDay
const {getTime} = Date.prototype
// The Date Time String Format of ECMAScript, which toISOString() writes: https://tc39.es/ecma262/#sec-date-time-string-format
// <date>: YYYY, YYYY-MM or YYYY-MM-DD, where the year can also be ±YYYYYY, as toISOString() writes years past 9999
const datePattern = String.raw`(?<year>\d{4}|[+-]\d{6})(?:-(?<month>\d{2})(?:-(?<day>\d{2}))?)?`
// <time>: THH:mm, THH:mm:ss or THH:mm:ss.sss
const timePattern = String.raw`T(?<hours>\d{2}):(?<minutes>\d{2})(?::(?<seconds>\d{2})(?:\.(?<milliseconds>\d{3}))?)?`
// <zone>: Z, +HH:mm or -HH:mm
const zonePattern = String.raw`(?<utc>Z)|(?<sign>[+-])(?<zoneHours>\d{2}):(?<zoneMinutes>\d{2})`
// The strings of README.md: <date>, <date><time>[<zone>] and <time>[<zone>]
const stringPattern = new RegExp(`^(?:${datePattern})?(?:${timePattern}(?:${zonePattern})?)?$`)

/** A value, a function that takes the current value and returns the new one, or undefined to keep the current value */
export type ValueSetter<T = number> = T | undefined | ((value: T) => T | undefined)

/**
 * A value that Date converts to an instant through Symbol.toPrimitive or valueOf(), such as a ZonedDate or a dayjs object.
 * Temporal objects, whose conversions throw, are left out.
 */
export interface DateLike {
	valueOf(): number
	epochMilliseconds?: undefined
	calendarId?: undefined
	nanosecond?: undefined
	sign?: undefined
}

// Reads a string of stringPattern: [days since 1970 (undefined without a date), the time of day in milliseconds, the
// offset of the zone in milliseconds (undefined without a zone)]
export function parseString(string: string) {
	const groups: Partial<Record<string, string>> | undefined = stringPattern.exec(string)?.groups
	const dated = groups?.year !== undefined
	// the empty string has neither a date nor a time, and the year 0 has no negative form
	if (!groups || !dated && groups.hours === undefined || groups.year === '-000000') throw new Error('Invalid date string')
	const [year, month, day, hours, minutes, seconds, milliseconds, zoneHours, zoneMinutes] = [
		groups.year,
		groups.month ?? 1,
		groups.day ?? 1,
		groups.hours ?? 0,
		groups.minutes ?? 0,
		groups.seconds ?? 0,
		groups.milliseconds ?? 0,
		groups.zoneHours ?? 0,
		groups.zoneMinutes ?? 0,
	].map(Number)
	const time = ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds
	// the time goes up to 24:00, the midnight at the end of the day
	if (
		dated && (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month - 1))
		|| time > oneDay || minutes > 59 || seconds > 59 || zoneHours > 23 || zoneMinutes > 59
	) throw new Error('Invalid date string')
	const zone = groups.utc ? 0 : groups.sign === undefined ? undefined : (groups.sign === '-' ? -1 : 1) * (zoneHours * 60 + zoneMinutes) * 60_000
	return [dated ? daysOf(year, month - 1, day) : undefined, time, zone] as const
}

// The instant of a time of day at a zone offset, whose wallclock falls on today's date at an offset that can change
// with the instant. On a day with a DST change, two such instants or none can exist: this is the first one on or after
// today. 24:00 is the midnight at the end of that day.
export function todayTime(time: number, zone: number, now: number, offsetAt: (time: number) => number) {
	const timeOfDay = time % oneDay
	const today = Math.floor((now + offsetAt(now)) / oneDay)
	const instant = (() => {
		// the time of day comes back every 24 hours, and offsets are less than a day: three days before today is before
		// today, and three days after it is after it
		for (let day = today - 3; day <= today + 3; day++) {
			const candidate = day * oneDay + timeOfDay - zone
			if (Math.floor((candidate + offsetAt(candidate)) / oneDay) >= today) return candidate
		}
		// an invalid clock
		return NaN
	})()
	return instant + time - timeOfDay
}

// MakeDate(MakeDay(year, month, date), MakeTime(hours, minutes, seconds, ms)) of ECMAScript: the arithmetic of Date.UTC,
// without its range check and its two-digit years
export function makeDate(...values: number[]) {
	// ToNumber, which throws for a BigInt as Date does
	const numbers = values.map(value => +value)
	if (!numbers.every(Number.isFinite)) return NaN
	// the limits of MakeDay in V8, on the year and the month before truncation, past which Date gives NaN even when other
	// fields would bring the time back. V8 also puts some dates before the year -399999 a day late; these stay exact.
	if (Math.abs(numbers[0]) > 1_000_000 || Math.abs(numbers[1]) > 10_000_000) return NaN
	const [year, month, date, hours, minutes, seconds, milliseconds] = numbers.map(Math.trunc)
	const time = hours * oneHour + minutes * 60_000 + seconds * 1000 + milliseconds
	return (daysOf(year + Math.floor(month / 12), modulo(month, 12), 1) + date - 1) * oneDay + time
}

// Date.UTC without its range check: a wallclock past an end of the Date range can have an instant inside it
export function utc(...fields: number[]) {
	// as in Date.UTC, a missing month is January, a missing day the 1st and a missing time 0, and the years 0 to 99 are
	// 1900 to 1999
	const [year, ...rest] = [NaN, 0, 1, 0, 0, 0, 0].map((missing, index) => index < fields.length ? +fields[index] : missing)
	const integer = Math.trunc(year)
	return makeDate(integer >= 0 && integer <= 99 ? 1900 + integer : year, ...rest)
}

// A Date whose UTC fields are the wallclock at the time, and the years to add to its UTC year.
// Past an end of the Date range, the wallclock is taken 400 years closer to 1970.
export function wallclockOf(time: number) {
	const years = time > maxTime ? 400 : time < -maxTime ? -400 : 0
	return [new Date(time - years / 400 * cycle), years] as const
}

// The time after a setter call, unclipped. The setter of the field at index takes it and the smaller fields (setFullYear
// takes the year, the month and the date; setDate also takes the time). Each value is resolved against the current
// field, and all the fields are applied together, as Date does.
export function setFields(time: number, index: number, values: readonly ValueSetter[]) {
	// as in Date, setFullYear gives an invalid date a value, starting from 1970-01-01T00:00. The other setters read NaN
	// fields, which keep the date invalid, and still convert their values, which throws for a BigInt.
	if (Number.isNaN(time) && index === 0) {
		const [year] = resolve(values, [NaN])
		return setFields(0, index, [year, ...values.slice(1)])
	}
	const [date, years] = wallclockOf(time)
	const fields = [date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()]
	const end = index < 2 ? 3 : 7
	fields.splice(index, end - index, ...resolve(values, fields.slice(index, end)))
	return makeDate(...fields)
}

// The values of a setter, each resolved against the current one: a function is called with it, and undefined keeps it
export function resolve<T extends string | number>(values: readonly ValueSetter<T>[], current: readonly T[]) {
	return current.map((value, index) => {
		const setter = values[index]
		const next = typeof setter === 'function' ? setter(value) : setter
		return next === undefined ? value : next
	})
}

// Removes the options object from the end of the arguments and returns it.
// A trailing undefined, or a trailing null after other arguments, stands for a missing options object.
export function takeOptions<Options>(args: unknown[]) {
	const last = args.at(-1)
	if (isOptions(last)) return args.pop() as Options
	if (last === undefined && args.length > 0 || last === null && args.length > 1) args.pop()
}

// A Date of any realm: instanceof recognizes only the Dates of this one
export function isDate(value: unknown): value is Date {
	if (value instanceof Date) return true
	// other objects, such as options and ZonedDates, never reach the check that throws
	if (typeof value !== 'object' || value === null || Object.prototype.toString.call(value) !== '[object Date]') return false
	try {
		getTime.call(value)
		return true
	} catch {
		return false
	}
}

// A ZonedDate of any realm or copy of this package
export function isZonedDate(value: unknown): value is ZonedDate {
	const object = value as Partial<ZonedDate> | undefined
	return typeof object?.getTimezone === 'function' && typeof object.getDisambiguation === 'function' && typeof object.getTime === 'function' && !isDate(value)
}

export function modulo(value: number, divisor: number) {
	return (value % divisor + divisor) % divisor
}

// NaN outside the Date range, as for Date
export function timeClip(time: number) {
	return Math.abs(time) <= maxTime ? time + 0 : NaN
}

// An object that is not a value for Date to read: no Date or ZonedDate, and nothing that Date would convert through its
// own Symbol.toPrimitive, valueOf or toString, such as a Number, an array, a URL or a dayjs object
function isOptions(value: unknown) {
	if (typeof value !== 'object' || value === null || isDate(value) || isZonedDate(value) || (value as {[Symbol.toPrimitive]?: unknown})[Symbol.toPrimitive] !== undefined) return false
	// the end of the prototype chain: the Object.prototype of the object's realm, or an object without a prototype
	const root = (() => {
		let prototype = value
		while (Object.getPrototypeOf(prototype) !== null) prototype = Object.getPrototypeOf(prototype)
		return prototype
	})()
	// the conversions that every object of a realm inherits from its Object.prototype, which owns isPrototypeOf (the
	// prototype of a class that extends null does not), and none for a chain without Object.prototype
	const inherited = root.constructor?.prototype === root && Object.prototype.hasOwnProperty.call(root, 'isPrototypeOf') ? root : Object.create(null)
	return value.valueOf === inherited.valueOf && value.toString === inherited.toString
}

// Days since 1970-01-01 of a date of the proleptic Gregorian calendar (month 0 to 11)
function daysOf(year: number, month: number, day: number) {
	const marchYear = month < 2 ? year - 1 : year
	const era = Math.floor(marchYear / 400)
	const yearOfEra = marchYear - era * 400
	const dayOfYear = Math.floor((153 * ((month + 10) % 12) + 2) / 5) + day - 1
	return era * 146_097 + yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear - 719_468
}

// The number of days in a month (0 to 11)
function daysInMonth(year: number, month: number) {
	if (month === 1) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28
	return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]
}
