# zoned-date

Two classes like JavaScript's `Date` that read and write the date and time in a time zone you choose, instead of the runtime's:

- `OffsetDate` is a `Date` at a fixed UTC offset in hours, such as `9` (UTC+09:00) or `5.75` (UTC+05:45).
- `ZonedDate` uses an IANA time zone, such as `'America/New_York'`, with its daylight saving time (DST) rules, which it reads from `Intl.DateTimeFormat`. It is not a `Date`.

## Install

```bash
npm i zoned-date
```

- Node.js 16.6 or later, no dependencies. `ZonedDate` also needs `Intl` time zone data (see [Time zones](#time-zones)).
- ES modules only. Import each class from its own path: `zoned-date` itself has no entry point. From CommonJS, use `import()`, or `require()` on Node.js 20.19, 22.12 or later: `require('zoned-date/OffsetDate').default`.
- TypeScript declarations are included, with these types: `OffsetDateOptions` from `zoned-date/OffsetDate`, `ZonedDateOptions` and `Disambiguation` from `zoned-date/ZonedDate`, and `ValueSetter` and `DateLike` from both. They need TypeScript 5.0 or later, `moduleResolution` set to `node16`, `nodenext` or `bundler`, and a `target` of ES2015 or later (the default from TypeScript 6) or `skipLibCheck`.

## Usage

```js
import OffsetDate from 'zoned-date/OffsetDate'
import ZonedDate from 'zoned-date/ZonedDate'

const tokyo = new OffsetDate('2021-09-04T05:19:52', {offset: 9})
console.log(tokyo.hours) // 5
console.log(tokyo.toISOString()) // 2021-09-03T20:19:52.000Z

const newYork = new ZonedDate(tokyo, {timezone: 'America/New_York'})
console.log(newYork.hours, newYork.offset) // 16 -4

newYork.hours = h => h + 1
console.log(newYork.toDate().toISOString()) // 2021-09-03T21:19:52.000Z
```

## Concepts

- An **instant** is a point in time, in milliseconds since 1970-01-01T00:00:00Z, as `Date#getTime()` returns it.
- A **wallclock** is what a clock in a time zone shows at an instant: year, month, day, hours, minutes, seconds and milliseconds.
- An **offset** is the wallclock's difference from UTC, in hours: `9` in Tokyo, `-5` or `-4` in New York depending on DST.

`Date` reads and writes the wallclock in the runtime's time zone (`getHours()`) or in UTC (`getUTCHours()`). These classes use the instance's own offset or time zone instead, whatever the runtime's is, and keep the UTC methods.

Use `OffsetDate` when the offset is fixed and known, as in a timestamp stored with its offset: it is plain arithmetic on `Date` and needs no `Intl`. Use `ZonedDate` when the offset depends on the date, as in time zones with DST.

## Creating dates

The constructors take one of these argument lists, then an optional options object:

| Arguments | Result |
|---|---|
| none | the current time |
| `time` | that instant, in milliseconds |
| an instance of the same class | a copy, which the options can move to another offset or time zone |
| another `Date`, or an instance of the other class | its instant |
| `string` | see [Parsing strings](#parsing-strings) |
| any other value | read as `new Date(value)` reads it: `null` is the epoch, and an object with its own `valueOf()` or `toString()`, such as `new Number(time)`, an array or a dayjs object, converts through it |
| `year, month, date?, hours?, minutes?, seconds?, ms?` | that wallclock in the instance's offset or time zone; as in `Date`, `month` is 0-based and the years 0 to 99 are 1900 to 1999 (`setFullYear()` takes them as given) |

| Option | Class | Value | Default |
|---|---|---|---|
| `offset` | `OffsetDate` | UTC offset in hours, a finite number | `0` |
| `timezone` | `ZonedDate` | time zone name | `'UTC'` |
| `disambiguation` | `ZonedDate` | `'compatible'`, `'earlier'`, `'later'` or `'reject'` (see [Daylight saving time](#daylight-saving-time)) | `'compatible'` |

An `undefined` or `null` option takes its default, except in a copy, which keeps its own value. A missing or `undefined` options object, or a `null` one after other arguments, means no options: `new OffsetDate(time, null)` is `new OffsetDate(time)`.

The defaults are fixed. For other values, pass the options in each call, or write a wrapper:

```js
import ZonedDate from 'zoned-date/ZonedDate'

function inTokyo(...args) {
	return new ZonedDate(...args, {timezone: 'Asia/Tokyo'})
}

console.log(inTokyo('2021-09-04T05:00').toDate().toISOString()) // 2021-09-03T20:00:00.000Z
```

The static `UTC()`, `now()` and `parse()` call `Date`'s at the time of the call, so they follow a mocked clock. `parse()` is `Date.parse()`: it uses neither this package's parser nor its defaults.

## Fields

Both classes have:

| Property | Getter | Setter | Copy |
|---|---|---|---|
| `fullYear` | `getFullYear()` | `setFullYear()` | `withFullYear()` |
| `month` (0 is January) | `getMonth()` | `setMonth()` | `withMonth()` |
| `date` | `getDate()` | `setDate()` | `withDate()` |
| `hours` | `getHours()` | `setHours()` | `withHours()` |
| `minutes` | `getMinutes()` | `setMinutes()` | `withMinutes()` |
| `seconds` | `getSeconds()` | `setSeconds()` | `withSeconds()` |
| `milliseconds` | `getMilliseconds()` | `setMilliseconds()` | `withMilliseconds()` |
| `day` (read-only, 0 is Sunday) | `getDay()` | | |

Each field also has a UTC version, named as in `Date`: `utcHours`, `getUTCHours()`, `setUTCHours()`, `withUTCHours()` and so on, up to `utcDay` and `getUTCDay()`. The instant has `time`, `getTime()`, `setTime()` and `withTime()`.

- A setter takes a value, or a function from the current value to the new one. `undefined`, passed or returned, keeps the field.
- Assigning a property calls its setter: `date.hours = h => h + 1`.
- Setters return the instance, not a timestamp, so they chain: `date.setMonth(m => m + 1).setDate(1)`. `with*()` takes the same arguments and returns a changed copy.
- As in `Date`, a setter also takes the smaller fields: `setFullYear(year, month, date)`, `setMonth(month, date)`, `setHours(hours, minutes, seconds, ms)`, `setMinutes(minutes, seconds, ms)` and `setSeconds(seconds, ms)`. `setDate()` and `setUTCDate()` take `date, hours, minutes, seconds, ms`. The fields apply together, as in `Date`, so `setMonth(1, 28)` on January 31 gives February 28.

```js
import OffsetDate from 'zoned-date/OffsetDate'

const date = new OffsetDate('2021-09-04T05:19', {offset: 9})
date.hours = h => h + 1
console.log(date.hours) // 6

const january = date.withMonth(0)
console.log(january.month, date.month) // 0 8

date.setDate(15, 13, m => m + 5, undefined, 250)
console.log(date.date, date.hours, date.minutes, date.seconds, date.milliseconds) // 15 13 24 0 250
```

## OffsetDate

| Property | Getter | Setter | Copy |
|---|---|---|---|
| `offset` | `getOffset()` | `setOffset()` | `withOffset()` |
| `timezoneOffset` | `getTimezoneOffset()` | `setTimezoneOffset()` | `withTimezoneOffset()` |

`offset` is in hours (`-3.5` for UTC-03:30). `timezoneOffset` is the same offset in minutes, signed as in `Date#getTimezoneOffset()` (positive west of UTC): `-540` for UTC+09:00. Neither follows the runtime's time zone or DST.

Changing the offset, through these members or `new OffsetDate(date, {offset})`, keeps the instant and moves the wallclock:

```js
import OffsetDate from 'zoned-date/OffsetDate'

const date = new OffsetDate('2021-09-04T05:00', {offset: 9})
console.log(date.offset, date.timezoneOffset) // 9 -540

const atUtc = date.withOffset(0)
console.log(atUtc.hours, atUtc.time === date.time) // 20 true

date.timezoneOffset = -345
console.log(date.offset, date.hours, date.minutes) // 5.75 1 45
```

## ZonedDate

`ZonedDate` has the same fields, and:

| Property | Getter | Setter | Copy |
|---|---|---|---|
| `timezone` | `getTimezone()` | `setTimezone()` | `withTimezone()` |
| `disambiguation` | `getDisambiguation()` | `setDisambiguation()` | `withDisambiguation()` |
| `offset` (read-only) | `getOffset()` | | |
| `timezoneOffset` (read-only) | `getTimezoneOffset()` | | |

`timezone` is the name as given (`'asia/tokyo'` stays lower case). `offset` and `timezoneOffset` have the same units as in `OffsetDate`, but follow the time zone's rules, so they change with DST. `toDate()` returns a `Date` at the same instant.

Changing the time zone, through these members or `new ZonedDate(date, {timezone})`, keeps the wallclock and moves the instant. For the same instant in another time zone, create a `ZonedDate` from it: `new ZonedDate(date.time, {timezone})`.

```js
import ZonedDate from 'zoned-date/ZonedDate'

const date = new ZonedDate('2021-09-04T05:19:52.001', {timezone: 'Asia/Tokyo'})
console.log(date.hours, date.offset) // 5 9

const sameWallclock = date.withTimezone('UTC')
console.log(sameWallclock.hours, sameWallclock.time === date.time) // 5 false

// The same instant in other time zones
console.log(new ZonedDate(date.time, {timezone: 'UTC'}).hours) // 20
console.log(new ZonedDate(date.time, {timezone: 'America/New_York'}).hours) // 16
```

### Time zones

`ZonedDate` accepts any time zone that the runtime's `Intl.DateTimeFormat` accepts, and both throw a `RangeError` for an unknown name, so `new Intl.DateTimeFormat('en-US', {timeZone: name})` checks a name. `Intl.supportedValuesOf('timeZone')` is not a complete list: Node.js 26, for example, leaves out `'UTC'` and aliases such as `'US/Eastern'`, which both accept. If the runtime's `Intl` has no time zone data, load an `Intl.DateTimeFormat` polyfill first.

### Daylight saving time

A `ZonedDate` stores an instant. Given a wallclock instead, through the constructor, a wallclock setter, `setTimezone()` or `setDisambiguation()`, it finds the instant at which the time zone shows it. Near a DST change, a wallclock can be:

- **ambiguous**: the clocks go back, so it happens twice. In Los Angeles, 01:30 on 2023-11-05 happens at UTC-07:00, then at UTC-08:00.
- **nonexistent**: the clocks go forward and skip it. Los Angeles has no 02:30 on 2023-03-12.

Read with the offset before the change and with the one after it, such a wallclock gives two instants. The `disambiguation` option picks one, as in [Temporal](https://tc39.es/proposal-temporal/docs/timezone.html#resolving-time-ambiguity-in-temporal):

| Value | Ambiguous wallclock | Nonexistent wallclock |
|---|---|---|
| `'compatible'` (default) | the earlier instant | the later instant |
| `'earlier'` | the earlier instant | the earlier instant |
| `'later'` | the later instant | the later instant |
| `'reject'` | none: reading the instant throws | none: reading the instant throws |

`'compatible'` is how `Date` resolves local times. A nonexistent wallclock reads back as another one: 02:30 becomes 03:30 (01:30 with `'earlier'`).

With `'reject'`, the wallclock stays unresolved. The constructor and the wallclock getters work, but everything that reads the instant throws `RangeError('Ambiguous time')`: `time`, `getTime()`, `offset`, `timezoneOffset`, the UTC getters and setters, `toDate()` and the conversions of `Date`, so `JSON.stringify()`, `String()` and comparisons too.

An instant is never ambiguous:

- A `ZonedDate` made from an instant, a `Date` or a string with a zone keeps that instant, even in a repeated hour, and so do `setTime()` and the UTC setters.
- A wallclock setter that leaves the wallclock as it is keeps the instant.
- `setTimezone()` keeps the instant when it already shows the wallclock in the new time zone, as with another name for the same zone.
- `setDisambiguation()` resolves the current wallclock again.

Offsets are exact to the second, including the local mean time used before standard time.

```js
import ZonedDate from 'zoned-date/ZonedDate'

const timezone = 'America/Los_Angeles'
const first = new ZonedDate('2023-11-05T01:30', {timezone, disambiguation: 'earlier'})
const second = new ZonedDate('2023-11-05T01:30', {timezone, disambiguation: 'later'})
console.log(first.toDate().toISOString(), first.offset) // 2023-11-05T08:30:00.000Z -7
console.log(second.toDate().toISOString(), second.offset) // 2023-11-05T09:30:00.000Z -8

const skipped = new ZonedDate('2023-03-12T02:30', {timezone})
console.log(skipped.hours, skipped.offset) // 3 -7

const fromInstant = new ZonedDate(Date.parse('2023-11-05T09:30Z'), {timezone})
console.log(fromInstant.hours, fromInstant.offset) // 1 -8

const strict = new ZonedDate('2023-11-05T01:30', {timezone, disambiguation: 'reject'})
console.log(strict.hours) // 1
try {
	strict.time
} catch (error) {
	console.log(String(error)) // RangeError: Ambiguous time
}
```

## Parsing strings

The constructors read strings with this package's own parser, not `Date.parse()`. A string must have one of these forms, where `[...]` is optional:

| Form | Syntax | Example |
|---|---|---|
| date | `<date>` | `2021-09-04` |
| date and time | `<date><time>[<zone>]` | `2021-09-04T05:19:52.000+09:00` |
| time | `<time>[<zone>]` | `T05:19` |

| Part | Forms |
|---|---|
| `<date>` | `YYYY`, `YYYY-MM`, `YYYY-MM-DD` |
| `<time>` | `THH:mm`, `THH:mm:ss`, `THH:mm:ss.sss` |
| `<zone>` | `Z`, `+HH:mm`, `-HH:mm` |

The first two forms are the [Date Time String Format](https://tc39.es/ecma262/#sec-date-time-string-format) of ECMAScript, which `toISOString()` writes. The third is its time on its own. The fields must be in range:

- `YYYY` is four digits, or `+` or `-` and six digits, as `toISOString()` writes the years before 0000 and after 9999. `-000000` is not a year.
- `MM` is 01 to 12, and `DD` a day that the month has: `2021-02-29` throws.
- `HH` is 00 to 23, `mm` and `ss` are 00 to 59, and `sss` is three digits: the milliseconds. `24:00`, `24:00:00` and `24:00:00.000` are the midnight at the end of the day.
- In `<zone>`, `HH` is 00 to 23 and `mm` 00 to 59.

Any other string throws `Error('Invalid date string')`, for example `05:19` (a time starts with `T`), `2021-09-04 05:19` (a space instead of the `T`), `2021-09-04T05` (no minutes), `2021-09-04T05:19:52.5` (one digit for the milliseconds), `2021-09-04T05:19+09` and `+0900` (a zone is `±HH:mm`), lower case `t` or `z`, `2021-02-30`, `2021/09/04` and `20210904`.

A string means:

- **Without a zone**, a wallclock in the instance's offset or time zone: `2021-09-04` is midnight there, not midnight UTC as with `Date`. A missing month or day is 1, and missing seconds and milliseconds are 0.
- **With a zone**, an exact instant. The zone does not change the instance's offset or time zone.
- **A time** falls on today's date in the instance's offset or time zone, never the runtime's or the string's: the date that the instance's wallclock shows at `Date.now()`. At UTC+09:00, `T20:00Z` is 05:00 today, and `T24:00` is the midnight at the end of today. On a day with a DST change, a time with a zone can fall on today's date twice or not at all; it then takes the first instant on or after today.

| Input | Wallclock in the instance's offset or time zone |
|---|---|
| `2021-09-04T05:19:52.000` | `2021-09-04T05:19:52.000` |
| `2021-09-04T05:19` | `2021-09-04T05:19:00.000` |
| `2021-09-04T24:00` | `2021-09-05T00:00:00.000` |
| `2021-09-04` | `2021-09-04T00:00:00.000` |
| `2021-09T05:19` | `2021-09-01T05:19:00.000` |
| `2021-09` | `2021-09-01T00:00:00.000` |
| `2021` | `2021-01-01T00:00:00.000` |
| `T05:19:52` | `<today>T05:19:52.000` |
| `T24:00` | `<tomorrow>T00:00:00.000` |

```js
import OffsetDate from 'zoned-date/OffsetDate'

// No zone: a wallclock at the instance's offset
const local = new OffsetDate('2021-09-04T05:19', {offset: 9})
console.log(local.toISOString()) // 2021-09-03T20:19:00.000Z

// A zone: an exact instant, read at the instance's offset
const exact = new OffsetDate('2021-09-04T05:19Z', {offset: 9})
console.log(exact.hours, exact.offset) // 14 9
```

## Errors

| Cause | Thrown by | Error |
|---|---|---|
| A string in none of the forms of [Parsing strings](#parsing-strings) | the constructors | `Error('Invalid date string')` |
| An unknown time zone | the `ZonedDate` constructor, `setTimezone()` and `withTimezone()` | `RangeError` from `Intl.DateTimeFormat` |
| An unknown disambiguation | the `ZonedDate` constructor, `setDisambiguation()` and `withDisambiguation()` | `Error('Invalid disambiguation option')` |
| An offset that is not a finite number | the `OffsetDate` constructor and the offset setters | `RangeError('Invalid offset: …')` |
| `'reject'` with an ambiguous or nonexistent wallclock | members that read the instant | `RangeError('Ambiguous time')` |

## Working with Date

### OffsetDate is a Date

`OffsetDate` extends `Date`, so `instanceof Date` is true, but code written for `Date` sees these differences:

- The wallclock getters and setters, `getDay()`, `getTimezoneOffset()` and the legacy `getYear()` and `setYear()` use the offset, not the runtime's time zone.
- All the setters, including the UTC ones and `setTime()`, return the instance, not a timestamp.
- The inherited `toString()`, `toDateString()`, `toTimeString()`, `toLocaleString()`, `toLocaleDateString()` and `toLocaleTimeString()` use the runtime's time zone, not the offset.
- `toISOString()`, `toJSON()` and `toUTCString()` give the instant in UTC, without the offset, so pass the offset again when you read the string back. The constructors read the `toISOString()` and `toJSON()` form; for a `toUTCString()` string, pass `OffsetDate.parse(string)`.

```js
import OffsetDate from 'zoned-date/OffsetDate'

const date = new OffsetDate('2021-09-04T05:00', {offset: 9})
const json = JSON.stringify({date})
console.log(json) // {"date":"2021-09-03T20:00:00.000Z"}

const parsed = new OffsetDate(JSON.parse(json).date, {offset: 9})
console.log(parsed.hours, parsed.time === date.time) // 5 true
```

### ZonedDate is not a Date

`instanceof Date` is false. These conversions of `Date` give what they give on `toDate()`: `valueOf()`, `toISOString()`, `toJSON()`, `toString()`, `toDateString()`, `toTimeString()`, `toUTCString()`, `toLocaleString()`, `toLocaleDateString()` and `toLocaleTimeString()`. So:

- `<`, `>` and `-` compare and subtract instants.
- `JSON.stringify()` writes the instant in UTC, without the time zone.
- The string methods use the runtime's time zone. To format the wallclock, pass `{timeZone: date.timezone}` to `toLocaleString()` or `Intl.DateTimeFormat`.
- Unlike a `Date`'s, the default conversion, which `new Date(zonedDate)` and `zonedDate + ''` use, gives `toISOString()` (`'Invalid Date'` for an invalid date), so `new Date(zonedDate)` keeps the milliseconds. `String()` and template literals give `toString()`, as on a `Date`.

Pass `toDate()` or `time` to an API that expects a `Date`, and call the other methods of `Date` on `toDate()`.

```js
import ZonedDate from 'zoned-date/ZonedDate'

const tokyo = new ZonedDate('2021-09-04T05:00', {timezone: 'Asia/Tokyo'})
const utc = new ZonedDate('2021-09-04T05:00', {timezone: 'UTC'})
console.log(tokyo < utc, utc - tokyo) // true 32400000
console.log(JSON.stringify({at: tokyo, timezone: tokyo.timezone})) // {"at":"2021-09-03T20:00:00.000Z","timezone":"Asia/Tokyo"}
console.log(tokyo.toLocaleString('en-GB', {timeZone: tokyo.timezone})) // 04/09/2021, 05:00:00
```

## Caveats

`ZonedDate` keeps all its state, and `OffsetDate` its offset, in private class fields, which generic tools cannot see:

- **Proxies.** valtio's `proxy()` wraps a `ZonedDate` in a `Proxy`, on which every member throws a `TypeError`. Mark each new instance with `ref()` (a `with*()` copy is unmarked), or store `time` and `timezone` instead. Vue leaves `ZonedDate` unwrapped, as it does `Date`.
- **Cloning ZonedDate.** `structuredClone()` makes an empty object of it. lodash's `cloneDeep()` returns an empty object for a `ZonedDate` itself, and the same instance for one inside an object or an array. Copy with `new ZonedDate(date)`.
- **Comparing ZonedDate.** `assert.deepStrictEqual()` and Jest's `toEqual()` report any two as equal, and lodash's `isEqual()` reports two distinct ones as unequal. Compare `time`, and `timezone` if it matters.
- **Cloning OffsetDate.** Code that copies through `new date.constructor(time)`, such as lodash's `cloneDeep()` and date-fns functions like `addHours()`, gets an `OffsetDate` at offset 0. Copy with `new OffsetDate(date)`, or restore the offset with `result.setOffset(date.offset)`. Deep-equality checks ignore the offset.

`OffsetDate` extends the `Date` that is global when the package first loads. In tests, load the package before installing a fake `Date` (`node:test` mock timers, or Jest and Vitest fake timers set up before your imports); otherwise `new OffsetDate()` can return plain `Date`s.

## Development

```bash
npm i
npm test
```

The source and the tests are TypeScript, in `src` and `test`, in the erasable syntax that Node.js runs without a build. `tsc` compiles `src` into `dist`, with the declarations, and the `prepublishOnly` script runs it before `npm publish`. `npm test` compiles, type-checks the tests (`tsc -p test`), and runs them on the compiled package with `node --test`, which runs TypeScript on Node.js 22.18 or later (23.6 or later on Node.js 23).
