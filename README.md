# zoned-date

Two classes that work like JavaScript's `Date`, but read and write the date and time in a time zone you choose instead of the runtime's:

- `OffsetDate` is a `Date` with a fixed UTC offset in hours, such as `9` (UTC+09:00) or `5.75` (UTC+05:45).
- `ZonedDate` uses an IANA time zone, such as `'America/New_York'`, with its daylight saving time (DST) rules, which it gets from `Intl.DateTimeFormat`. It is not a `Date`.

## Install

```bash
npm i zoned-date
```

It runs on Node.js 16.6 or later and needs no dependencies. `ZonedDate` also needs `Intl` time zone support (see [Time zone support](#time-zone-support)).

## Usage

```js
import {OffsetDate, ZonedDate} from 'zoned-date'

const tokyo = new OffsetDate('2021-09-04T05:19:52', {offset: 9})
console.log(tokyo.hours) // 5
console.log(tokyo.toISOString()) // 2021-09-03T20:19:52.000Z

const newYork = new ZonedDate(tokyo, {timezone: 'America/New_York'})
console.log(newYork.hours, newYork.offset) // 16 -4

newYork.hours = h => h + 1
console.log(newYork.toDate().toISOString()) // 2021-09-03T21:19:52.000Z
```

Each class can also be imported on its own:

```js
import OffsetDate from 'zoned-date/OffsetDate'
import ZonedDate from 'zoned-date/ZonedDate'
```

The package is ES modules only. CommonJS code can load it with `import()`, or with `require()` on Node.js 20.19, 22.12 or later, where `require('zoned-date')` returns `{OffsetDate, ZonedDate}`. With Jest, use its ES module mode (`node --experimental-vm-modules`).

TypeScript declarations are included. The option types are `OffsetDate.Options` and `ZonedDate.Options`. TypeScript finds the declarations through the `exports` of `package.json`, which it reads when `moduleResolution` is `node16`, `nodenext` or `bundler`. They need a `target` of ES2015 or later (the default from TypeScript 6), or `skipLibCheck`.

## Concepts

- An **instant** is a point in time: milliseconds since 1970-01-01T00:00:00Z, as returned by `Date#getTime()`.
- A **wallclock** is what a clock in a given time zone shows at an instant: year, month, day, hours, minutes, seconds and milliseconds.
- An **offset** is the wallclock's difference from UTC, in hours: `9` in Tokyo, and `-5` or `-4` in New York, depending on DST.

`Date` reads and writes the wallclock in the runtime's time zone (`getHours()`) or in UTC (`getUTCHours()`). These classes read and write it in the instance's own offset or time zone, whatever the runtime's time zone is, and keep the UTC methods.

Prefer `OffsetDate` when the offset is fixed and known, such as in a timestamp stored with its offset: it is plain arithmetic on top of `Date` and needs no `Intl` support or polyfill. Use `ZonedDate` when the offset depends on the date, as in time zones with DST.

## Creating dates

The constructors take one of these argument lists, plus an optional options object as the last argument:

| Arguments | Result |
|---|---|
| none | the current time |
| `time` | the instant `time`, in milliseconds since the epoch |
| an instance of the same class | a copy; the options can change its offset or time zone (see [Changing the zone](#changing-the-zone)) |
| any other `Date`, or an instance of the other class | its instant |
| `string` | see [Parsing strings](#parsing-strings) |
| any other value | read as `new Date(value)` reads it: `null` is the epoch, and an object that has its own `valueOf()` or `toString()`, such as `new Number(time)`, an array or a dayjs instance, is converted through it |
| `year, month, date?, hours?, minutes?, seconds?, ms?` | that wallclock in the instance's offset or time zone; `month` is 0-based and, as in `Date`, the years 0 to 99 are 1900 to 1999 (`setFullYear()` sets them as given) |

| Option | Class | Value | Default (initial value) |
|---|---|---|---|
| `offset` | `OffsetDate` | UTC offset in hours, a finite number | `OffsetDate.defaultOffset` (`0`) |
| `timezone` | `ZonedDate` | time zone name | `ZonedDate.defaultTimezone` (`'UTC'`) |
| `disambiguation` | `ZonedDate` | `'compatible'`, `'earlier'`, `'later'` or `'reject'`; see [Daylight saving time](#daylight-saving-time) | `ZonedDate.defaultDisambiguation` (`'compatible'`) |

An option that is `undefined` or `null` takes its default (a copy keeps its own value). So does a missing or `undefined` options object, or a `null` one after other arguments: `new OffsetDate(time, null)` is `new OffsetDate(time)`. The defaults are static properties, read when an instance is created. If you change one, for example in a test, restore it afterwards:

```js
import {OffsetDate, ZonedDate} from 'zoned-date'

OffsetDate.defaultOffset = 9
console.log(new OffsetDate('2021-09-04T05:00').toISOString()) // 2021-09-03T20:00:00.000Z

// Restore the initial values
OffsetDate.defaultOffset = 0
ZonedDate.defaultTimezone = 'UTC'
ZonedDate.defaultDisambiguation = 'compatible'
```

Both classes have the static `UTC()`, `now()` and `parse()` of `Date`. They call `Date`'s at the time of the call, so they follow a mocked clock. `parse()` is `Date.parse()`: it ignores this package's parser and defaults.

## Reading and writing the wallclock

Both classes have these fields:

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

Each field also has a UTC version, named as in `Date`: `utcHours`, `getUTCHours()`, `setUTCHours()`, `withUTCHours()`, and so on, up to `utcDay` and `getUTCDay()`. The instant follows the same pattern: `time`, `getTime()`, `setTime()` and `withTime()`.

- A setter takes a value, or a function that receives the current value and returns the new one. `undefined`, or a function that returns `undefined`, leaves the field unchanged.
- Assigning to a property calls its setter: `date.hours = h => h + 1`.
- Setter methods return the instance, not a timestamp as `Date`'s setters do, so calls chain: `date.setMonth(m => m + 1).setDate(1) === date`. `with*()` takes the same arguments and returns a changed copy.
- As in `Date`, a setter also takes the smaller fields: `setFullYear(year, month, date)`, `setMonth(month, date)`, `setHours(hours, minutes, seconds, ms)`, `setMinutes(minutes, seconds, ms)` and `setSeconds(seconds, ms)`. `setDate()` and `setUTCDate()` go further and take `date, hours, minutes, seconds, ms`. The fields are applied together, as `Date` does, so `setMonth(1, 28)` on January 31 gives February 28.

```js
import {OffsetDate} from 'zoned-date'

const date = new OffsetDate('2021-09-04T05:19', {offset: 9})
date.hours = h => h + 1
console.log(date.hours) // 6

const january = date.withMonth(0)
console.log(january.month, date.month) // 0 8

date.setDate(15, 13, m => m + 5, undefined, 250)
console.log(date.date, date.hours, date.minutes, date.seconds, date.milliseconds) // 15 13 24 0 250
```

## OffsetDate

`offset` is the UTC offset in hours: `9` for UTC+09:00, `-3.5` for UTC-03:30. `timezoneOffset` is the same offset in minutes, with the sign convention of `Date#getTimezoneOffset()` (positive west of UTC): `-540` for UTC+09:00. Neither follows the runtime's time zone or DST.

| Property | Getter | Setter | Copy |
|---|---|---|---|
| `offset` | `getOffset()` | `setOffset()` | `withOffset()` |
| `timezoneOffset` | `getTimezoneOffset()` | `setTimezoneOffset()` | `withTimezoneOffset()` |

Changing the offset keeps the instant, so the wallclock moves:

```js
import {OffsetDate} from 'zoned-date'

const date = new OffsetDate('2021-09-04T05:00', {offset: 9})
console.log(date.offset, date.timezoneOffset) // 9 -540

date.timezoneOffset = -345
console.log(date.offset, date.hours, date.minutes) // 5.75 1 45
```

## ZonedDate

`ZonedDate` has the same wallclock, UTC and instant members, and also:

| Property | Getter | Setter | Copy |
|---|---|---|---|
| `timezone` | `getTimezone()` | `setTimezone()` | `withTimezone()` |
| `disambiguation` | `getDisambiguation()` | `setDisambiguation()` | `withDisambiguation()` |
| `offset` (read-only) | `getOffset()` | | |
| `timezoneOffset` (read-only) | `getTimezoneOffset()` | | |

`timezone` returns the name as given (`'asia/tokyo'` stays lower case). `offset` and `timezoneOffset` have the same units as in `OffsetDate`, but follow the time zone's rules, so they change with DST. `toDate()` returns a new `Date` at the same instant.

```js
import {ZonedDate} from 'zoned-date'

const date = new ZonedDate('2021-09-04T05:19:52.001', {timezone: 'Asia/Tokyo'})
console.log(date.hours, date.offset) // 5 9

// The same instant in other time zones
console.log(new ZonedDate(date.time, {timezone: 'Asia/Bangkok'}).hours) // 3
console.log(new ZonedDate(date.time, {timezone: 'UTC'}).hours) // 20
console.log(new ZonedDate(date.time, {timezone: 'America/New_York'}).hours) // 16
```

### Time zone support

`ZonedDate` accepts any time zone that the runtime's `Intl.DateTimeFormat` accepts, and both throw a `RangeError` for an unknown name. To check a name:

```js
new Intl.DateTimeFormat('en-US', {timeZone: 'America/New_York'})
```

`Intl.supportedValuesOf('timeZone')` is not a complete list: Node.js 26, for example, omits `'UTC'` (the initial `ZonedDate.defaultTimezone`) and aliases such as `'US/Eastern'`, although `Intl.DateTimeFormat` and `ZonedDate` accept them.

If the runtime's `Intl` has no time zone data, load an `Intl.DateTimeFormat` polyfill before you use `ZonedDate`.

### Daylight saving time

A `ZonedDate` stores an instant. When you give it a wallclock instead, through the constructor, a wallclock setter, `setTimezone()` or `setDisambiguation()`, it finds the instant that the time zone shows that wallclock at. Near a DST change, a wallclock can be:

- **ambiguous**: the clocks go back, so it happens twice. In Los Angeles, 01:30 on 2023-11-05 happens at UTC-07:00 and again at UTC-08:00.
- **nonexistent**: the clocks go forward and skip it. In Los Angeles, there is no 02:30 on 2023-03-12.

Interpreting such a wallclock with the offset before the change and with the offset after it gives two instants. The `disambiguation` option picks one, as in [Temporal](https://tc39.es/proposal-temporal/docs/timezone.html#resolving-time-ambiguity-in-temporal):

| Value | Ambiguous wallclock | Nonexistent wallclock |
|---|---|---|
| `'compatible'` (default) | the earlier instant | the later instant |
| `'earlier'` | the earlier instant | the earlier instant |
| `'later'` | the later instant | the later instant |
| `'reject'` | none: reading the instant throws | none: reading the instant throws |

`'compatible'` matches how `Date` resolves local times. The instant of a nonexistent wallclock reads back as another wallclock: 02:30 becomes 03:30 (01:30 with `'earlier'`).

With `'reject'`, the wallclock stays unresolved. The constructor and the wallclock getters work, and reading the instant throws `RangeError('Ambiguous time')`. That includes `time`, `getTime()`, `offset`, `timezoneOffset`, the UTC getters and setters, `toDate()` and the conversions of `Date`, so `JSON.stringify()`, `String()` and comparisons throw too.

An instant is never ambiguous. A `ZonedDate` made from an instant, a `Date` or a string with a zone keeps that instant, also in a repeated hour, and so do `setTime()` and the UTC setters. A wallclock setter that leaves the wallclock as it is keeps the instant. So does `setTimezone()`, when the instant already shows the wallclock in the new time zone, as with another name for the same zone. `setDisambiguation()` resolves the current wallclock again with the new option. Offsets are exact to the second, including the local mean time zones used before standard time.

```js
import {ZonedDate} from 'zoned-date'

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

## Changing the zone

- `OffsetDate` keeps the **instant** and moves the wallclock: `setOffset()`, `withOffset()`, `setTimezoneOffset()`, `withTimezoneOffset()`, assigning `offset` or `timezoneOffset`, and `new OffsetDate(offsetDate, {offset})`.
- `ZonedDate` keeps the **wallclock** and moves the instant: `setTimezone()`, `withTimezone()`, assigning `timezone`, and `new ZonedDate(zonedDate, {timezone})`.

To show the same instant in another time zone, create a `ZonedDate` from the instant: `new ZonedDate(zonedDate.time, {timezone})`.

```js
import {OffsetDate, ZonedDate} from 'zoned-date'

const offsetDate = new OffsetDate('2021-09-04T05:00', {offset: 9})
const atUtc = offsetDate.withOffset(0)
console.log(atUtc.hours, atUtc.time === offsetDate.time) // 20 true

const zonedDate = new ZonedDate('2021-09-04T05:00', {timezone: 'Asia/Tokyo'})
const sameWallclock = zonedDate.withTimezone('UTC')
console.log(sameWallclock.hours, sameWallclock.time === zonedDate.time) // 5 false

const sameInstant = new ZonedDate(zonedDate.time, {timezone: 'UTC'})
console.log(sameInstant.hours, sameInstant.time === zonedDate.time) // 20 true
```

## Parsing strings

`new OffsetDate(string)` and `new ZonedDate(string)` use this package's own parser, not `Date.parse()`. It accepts a subset of ISO 8601, with a few extensions, and throws `Error('Invalid date string')` for anything else:

| Part | Forms |
|---|---|
| `<date>` | `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, where `±YYYYYY` can replace `YYYY`, as `toISOString()` writes the years before 0000 and after 9999 |
| `<time>` | `HH`, `HH:mm`, `HH:mm:ss`, `HH:mm:ss.sss` |
| `<zone>` | `Z`, `+HH`, `+HH:mm`, `+HHmm`, `+HH:mm:ss`, `+HHmmss`, and the same with `-` |

A string is `<date>`, `<date>T<time>[<zone>]` or `[T]<time>[<zone>]`, where `[...]` is optional. A space can replace the `T`, and `T` and `Z` can be lower case. The fraction of a second can have any number of digits: `.32` is 320 ms, and digits after the milliseconds are dropped.

The fields must be in range: months 01 to 12, days that exist in the month, hours 00 to 23, minutes and seconds 00 to 59, and zones up to `±23:59:59`. A time-only string is the one exception: its hours can go up to 99 (see below).

- Missing time fields are 0, and a missing month or day is 1.
- Without a zone, the string is a wallclock in the instance's offset or time zone, so `2021-09-04` is midnight there, not midnight UTC as with `Date`. With a zone, the string is an exact instant, and the zone does not change the instance's offset or time zone.
- A time-only string falls on today's date in the instance's offset or time zone, not in the runtime's time zone or the string's zone: at UTC+09:00, `20:00Z` is 05:00 today. Hours of 24 or more continue into the following days: `28:30` is 04:30 tomorrow. On a day with a DST change, a time with a zone can fall on today's date twice or not at all; it then takes the first instant on or after today.

| Input | Wallclock |
|---|---|
| `2021-09-04T05:19:52.000` | `2021-09-04T05:19:52.000` |
| `2021-09-04 05:19` | `2021-09-04T05:19:00.000` |
| `2021-09-04T05` | `2021-09-04T05:00:00.000` |
| `2021-09-04` | `2021-09-04T00:00:00.000` |
| `2021-09T05:19` | `2021-09-01T05:19:00.000` |
| `2021-09` | `2021-09-01T00:00:00.000` |
| `2021` | `2021-01-01T00:00:00.000` |
| `T05:19:52` | `<today>T05:19:52.000` |
| `05` | `<today>T05:00:00.000` |
| `28:30` | `<tomorrow>T04:30:00.000` |

```js
import {OffsetDate} from 'zoned-date'

// No zone: a wallclock at the instance's offset
const local = new OffsetDate('2021-09-04 05:19', {offset: 9})
console.log(local.toISOString()) // 2021-09-03T20:19:00.000Z

// A zone: an exact instant, read at the instance's offset
const exact = new OffsetDate('2021-09-04T05:19Z', {offset: 9})
console.log(exact.hours, exact.offset) // 14 9
```

Any other string throws `Error('Invalid date string')` instead of returning an Invalid Date: `2021-02-30`, `2021-09-04T24:00`, `2021/09/04`, `20210904`, `+5:30`, a comma before the fraction, tabs, newlines or extra spaces, and bracketed time zone names.

## Errors

| Cause | Thrown by | Error |
|---|---|---|
| A string the parser cannot read | the constructors | `Error('Invalid date string')` |
| An unknown time zone | the `ZonedDate` constructor, `setTimezone()` and `withTimezone()` | `RangeError` from `Intl.DateTimeFormat` |
| An unknown disambiguation | the `ZonedDate` constructor, `setDisambiguation()` and `withDisambiguation()` | `Error('Invalid disambiguation option')` |
| An offset that is not a finite number | the `OffsetDate` constructor and the offset setters | `RangeError('Invalid offset: …')` |
| `'reject'` with an ambiguous or nonexistent wallclock | members that read the instant | `RangeError('Ambiguous time')` |

## Working with Date

### OffsetDate is a Date

`OffsetDate` extends `Date`, so `instanceof Date` is true, but code written for `Date` sees these differences:

- The wallclock getters and setters, `getDay()`, `getTimezoneOffset()` and the legacy `getYear()` and `setYear()` use the offset instead of the runtime's time zone.
- The setters described above, including the UTC ones and `setTime()`, return the instance instead of a timestamp.
- The inherited string methods use the runtime's time zone, not the offset: `toString()`, `toDateString()`, `toTimeString()`, `toLocaleString()`, `toLocaleDateString()` and `toLocaleTimeString()`.
- `toISOString()`, `toJSON()` and `toUTCString()` give the instant in UTC. The offset is not serialized, so pass it again when you read the string back. The constructors read the `toISOString()` and `toJSON()` form; for a `toUTCString()` string, pass `OffsetDate.parse(string)`:

```js
import {OffsetDate} from 'zoned-date'

const date = new OffsetDate('2021-09-04T05:00', {offset: 9})
const json = JSON.stringify({date})
console.log(json) // {"date":"2021-09-03T20:00:00.000Z"}

const parsed = new OffsetDate(JSON.parse(json).date, {offset: 9})
console.log(parsed.hours, parsed.time === date.time) // 5 true
```

### ZonedDate is not a Date

`ZonedDate` does not extend `Date`, and `instanceof Date` is false. It has these conversions of `Date`: `valueOf()`, `toISOString()`, `toJSON()`, `toString()`, `toDateString()`, `toTimeString()`, `toUTCString()`, `toLocaleString()`, `toLocaleDateString()` and `toLocaleTimeString()`. They give the same results as on `toDate()`, a `Date` at the same instant:

- `valueOf()` gives the instant, so `<`, `>` and `-` compare and subtract instants.
- `toISOString()` and `toJSON()` give the instant in UTC, so `JSON.stringify()` serializes it. The time zone is not serialized.
- `toString()`, `toLocaleString()` and the other string methods use the runtime's time zone, as on a `Date`. To format the wallclock, pass `{timeZone: date.timezone}` to `Intl.DateTimeFormat` or to `toLocaleString()`.
- The default conversion, used by `new Date(zonedDate)` and `zonedDate + ''`, differs from a `Date`'s: it gives `toISOString()` (`'Invalid Date'` for an invalid date), so `new Date(zonedDate)` keeps the instant, milliseconds included. `String()` and template literals use `toString()`, as on a `Date`.

Pass `toDate()` or `time` (the instant as a number) to an API that expects a `Date`, and call the other methods of `Date` on `toDate()`.

```js
import {ZonedDate} from 'zoned-date'

const tokyo = new ZonedDate('2021-09-04T05:00', {timezone: 'Asia/Tokyo'})
const utc = new ZonedDate('2021-09-04T05:00', {timezone: 'UTC'})
console.log(tokyo < utc, utc - tokyo) // true 32400000
console.log(JSON.stringify({at: tokyo, timezone: tokyo.timezone})) // {"at":"2021-09-03T20:00:00.000Z","timezone":"Asia/Tokyo"}
console.log(tokyo.toLocaleString('en-GB', {timeZone: tokyo.timezone})) // 04/09/2021, 05:00:00
```

## Caveats

`ZonedDate` keeps all its state, and `OffsetDate` its offset, in private class fields, which generic tools cannot see:

- **ZonedDate in proxy-based state.** valtio's `proxy()` wraps the instance in a `Proxy`, and every member then throws a `TypeError`. Mark each new instance with valtio's `ref()` (`with*()` returns an unmarked copy), or store `time` and `timezone` instead. Vue leaves `ZonedDate` unwrapped, as it does `Date`.
- **Cloning and comparing ZonedDate.** Generic deep-clone utilities cannot copy it. `structuredClone()` makes an empty object of it. lodash's `cloneDeep()` returns an empty object for a `ZonedDate` itself, and the same instance for one inside an object or an array, so the "clone" shares it. Copy with `new ZonedDate(date)` instead. Deep-equality checks cannot compare it either: `assert.deepStrictEqual()` and Jest's `toEqual()` report any two `ZonedDate`s as equal, and lodash's `isEqual()` reports two distinct instances as unequal. Compare `time`, and `timezone` if it matters.
- **Cloning OffsetDate.** `new OffsetDate(time)` uses the default offset, so code that creates a date of the same class from a timestamp with `new date.constructor(time)`, such as lodash's `cloneDeep()` and date-fns functions like `addHours()`, returns an `OffsetDate` with `OffsetDate.defaultOffset`. Copy with `new OffsetDate(date)`, or restore the offset with `result.setOffset(date.offset)`. Deep-equality checks ignore the offset.

`OffsetDate` extends whichever `Date` is global when the package is first loaded. In tests, load the package before installing a fake `Date` (`node:test` mock timers, or Jest and Vitest fake timers set up before your imports). Otherwise `new OffsetDate()` can return plain `Date`s.

## Development

```bash
npm install
npm test
```

The source and the tests are TypeScript, in `src` and `test`. `tsc` compiles the source into `dist`, with the declarations, and the `prepublishOnly` script runs it before `npm publish`. `npm test` compiles, type-checks the tests (`tsc -p test`), then runs them on the compiled package with the built-in Node.js test runner (`node --test`), which runs TypeScript directly on Node.js 22.18 or later (23.6 or later on Node.js 23).

## License

[MIT](LICENSE)
