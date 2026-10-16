// What OffsetDate and ZonedDate share. Internal: package.json does not export this module.
export const oneHour = 60 * 60_000
export const oneDay = 24 * oneHour
// Date instants lie within 8.64e15 ms of 1970-01-01T00:00Z
export const maxTime = 8.64e15
// The Gregorian calendar and the days of the week repeat every 400 years: 146,097 days
const cycle = 146_097 * oneDay
const {getTime} = Date.prototype
// <date>: YYYY, YYYY-MM or YYYY-MM-DD, where the year can also be ±YYYYYY, as toISOString() writes years past 9999
const datePattern = String.raw`(?<year>\d{4}|[+-]\d{6})(?:-(?<month>\d{2})(?:-(?<day>\d{2}))?)?`
// <time>: HH, HH:mm, HH:mm:ss or HH:mm:ss.sss, with any number of fraction digits
const timePattern = String.raw`(?<hours>\d{2})(?::(?<minutes>\d{2})(?::(?<seconds>\d{2})(?:\.(?<fraction>\d+))?)?)?`
// <zone>: Z, ±HH, ±HH:mm, ±HHmm, ±HH:mm:ss or ±HHmmss
const zonePattern = String.raw`(?<utc>Z)|(?<sign>[+-])(?<zoneHours>\d{2})(?:(?<colon>:?)(?<zoneMinutes>\d{2})(?:\k<colon>(?<zoneSeconds>\d{2}))?)?`
// The string formats of README.md: <date>, <date>T<time>[<zone>] and [T]<time>[<zone>], where a space can replace the T
const stringPattern = new RegExp(`^(?:${datePattern})?(?:(?<separator>[T ])?${timePattern}(?:${zonePattern})?)?$`, 'i')

// Adds the members of an object literal to the prototype of a class, not enumerable, like the members of a class body
export function defineMembers(Class, members) {
	const descriptors = Object.getOwnPropertyDescriptors(members)
	for (const key of Reflect.ownKeys(descriptors)) Object.defineProperty(Class.prototype, key, {...descriptors[key], enumerable: false})
}

// Defines, for each field with get and set methods, the accessor (date.hours) and the copy method (date.withHours())
export function defineFields(Class, names) {
	for (const name of names) {
		const capitalized = name.startsWith('utc')
			? 'UTC' + name.slice('utc'.length)
			: name[0].toUpperCase() + name.slice(1)
		defineMembers(Class, {
			get [name]() {
				return this[`get${capitalized}`]()
			},
			set [name](value) {
				this[`set${capitalized}`](value)
			},
			[`with${capitalized}`](...values) {
				if (!(this instanceof Class)) throw new TypeError(`${Class.name}.prototype.with${capitalized} called on an incompatible receiver`)
				return new Class(this)[`set${capitalized}`](...values)
			},
		})
	}
}

// Reads a string of stringPattern: [days since 1970 (undefined without a date), the time of day in milliseconds (past
// 24 hours for hours past 23 without a date), the offset of the zone in milliseconds (undefined without a zone)]
export function parseString(string) {
	const groups = stringPattern.exec(string)?.groups
	const dated = groups?.year !== undefined
	// a date and a time need a separator, and the year 0 has no negative form
	if (
		!groups
		|| !dated && groups.hours === undefined
		|| dated && groups.hours !== undefined && groups.separator === undefined
		|| groups.year === '-000000'
	) throw new Error('Invalid date string')
	const [year, month, day, hours, minutes, seconds, zoneHours, zoneMinutes, zoneSeconds] = [
		groups.year,
		groups.month ?? 1,
		groups.day ?? 1,
		groups.hours ?? 0,
		groups.minutes ?? 0,
		groups.seconds ?? 0,
		groups.zoneHours ?? 0,
		groups.zoneMinutes ?? 0,
		groups.zoneSeconds ?? 0,
	].map(Number)
	if (
		dated && (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month - 1) || hours > 23)
		|| minutes > 59 || seconds > 59 || zoneHours > 23 || zoneMinutes > 59 || zoneSeconds > 59
	) throw new Error('Invalid date string')
	// digits after the milliseconds are dropped
	const milliseconds = Number((groups.fraction ?? '').padEnd(3, '0').slice(0, 3))
	const time = ((hours * 60 + minutes) * 60 + seconds) * 1000 + milliseconds
	const zone = groups.utc ? 0 : groups.sign && (groups.sign === '-' ? -1 : 1) * ((zoneHours * 60 + zoneMinutes) * 60 + zoneSeconds) * 1000
	return [dated ? daysOf(year, month - 1, day) : undefined, time, zone]
}

// The instant of a time of day at a zone offset, whose wallclock falls on today's date at an offset that can change
// with the instant. On a day with a DST change, two such instants or none can exist: this is the first one on or after
// today. Hours past 23 continue into the next days.
export function todayTime(time, zone, now, offsetAt) {
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

// Days since 1970-01-01 of a date of the proleptic Gregorian calendar (month 0 to 11)
export function daysOf(year, month, day) {
	const marchYear = month < 2 ? year - 1 : year
	const era = Math.floor(marchYear / 400)
	const yearOfEra = marchYear - era * 400
	const dayOfYear = Math.floor((153 * ((month + 10) % 12) + 2) / 5) + day - 1
	return era * 146_097 + yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear - 719_468
}

// MakeDate(MakeDay(year, month, date), MakeTime(hours, minutes, seconds, ms)) of ECMAScript: the arithmetic of Date.UTC,
// without its range check and its two-digit years
export function makeDate(...values) {
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
export function utc(...fields) {
	// as in Date.UTC, a missing month is January, a missing day the 1st and a missing time 0, and the years 0 to 99 are
	// 1900 to 1999
	const [year, ...rest] = [NaN, 0, 1, 0, 0, 0, 0].map((missing, index) => index < fields.length ? +fields[index] : missing)
	const integer = Math.trunc(year)
	return makeDate(integer >= 0 && integer <= 99 ? 1900 + integer : year, ...rest)
}

// A Date whose UTC fields are the wallclock at the time, and the years to add to its UTC year.
// Past an end of the Date range, the wallclock is taken 400 years closer to 1970.
export function wallclockOf(time) {
	const years = time > maxTime ? 400 : time < -maxTime ? -400 : 0
	return [new Date(time - years / 400 * cycle), years]
}

// The time after a setter call, unclipped. The setter of the field at index takes it and the smaller fields (setFullYear
// takes the year, the month and the date; setDate also takes the time). Each value is resolved against the current
// field, and all the fields are applied together, as Date does.
export function setFields(time, index, values) {
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
export function resolve(values, current) {
	return current.map((value, index) => {
		const next = typeof values[index] === 'function' ? values[index](value) : values[index]
		return next === undefined ? value : next
	})
}

// Removes the options object from the end of the arguments and returns it.
// A trailing undefined, or a trailing null after other arguments, stands for a missing options object.
export function takeOptions(args) {
	const last = args.at(-1)
	if (isOptions(last)) return args.pop()
	if (last === undefined && args.length > 0 || last === null && args.length > 1) args.pop()
}

// A Date of any realm: instanceof recognizes only the Dates of this one
export function isDate(value) {
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
export function isZonedDate(value) {
	return typeof value?.getTimezone === 'function' && typeof value.getDisambiguation === 'function' && typeof value.getTime === 'function' && !isDate(value)
}

export function modulo(value, divisor) {
	return (value % divisor + divisor) % divisor
}

// NaN outside the Date range, as for Date
export function timeClip(time) {
	return Math.abs(time) <= maxTime ? time + 0 : NaN
}

// An object that is not a value for Date to read: no Date or ZonedDate, and nothing that Date would convert through its
// own Symbol.toPrimitive, valueOf or toString, such as a Number, an array, a URL or a dayjs object
function isOptions(value) {
	if (typeof value !== 'object' || value === null || isDate(value) || isZonedDate(value) || value[Symbol.toPrimitive] !== undefined) return false
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

// The number of days in a month (0 to 11)
function daysInMonth(year, month) {
	if (month === 1) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28
	return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]
}
