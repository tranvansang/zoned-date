# zoned-date - Timezone-aware better Javascript Date

# Install
```bash
npm i zoned-date
```

# Usage
```javascript
import {OffsetDate, ZonedDate} from 'zoned-date'
// or
import OffsetDate from 'zoned-date/OffsetDate'
import ZonedDate from 'zoned-date/ZonedDate'
```

# API

`OffsetDate` is a sub-class of Date. It has all the methods of Date, some of them are overrided to be timezone-aware, and some methods are added for convenience.

## List of overrided and new methods:

### Static method
- `set/get OffsetDate.defaultOffset`: set/get the default timezone offset in hour (no sign reverse. For example: GMT+9 is 9). The default value is 0.

### Wallclock methods

For all below methods, `wallclock` is one of: `fullYear`, `month`, `date`, `hours`, `minutes`, `seconds`, `milliseconds`.
These methods manipulate the wallclock time with respect to a particular timezone, regardless of the timezone of the runtime.

- `get wallclock`: `wallclock = date.wallclock`.
- `set wallclock`: `date.wallclock = wallclock`. The value can be the new value, or a function that takes the old value and returns the new value or undefined to skip setting.

For example: `date.fullYear = y => y + 1`, `date.fullYear = 2020`, `date.fullYear = undefined`, `date.fullYear = () => undefined`.

- `getWallclock()`
- `setWallclock()`: set the wallclock and return the OffsetDate instance. Example: `date.setMonth(x => x + 1).setDate(1) === date`.
- `withWallclock()`: return a new OffsetDate instance with the wallclock set. Example: `date.withWallclock(wallclock) !== date`.

Besides, `day` wallclock is get only.
- `get day`.
- `getDay()`.

### UTC Wallclock methods
These methods work the same as if without timezone offset defined. They have the same interface with the above wallclock methods, except that they are prefixed with `utc`.
- `get utcWallclock`.
- `set utcWallclock`.
- `getUTCWallclock()`.
- `setUTCWallclock()`.
- `withUTCWallclock()`.
- `get utcDay`.
- `getUTCDay()`.

### Timezone
TimezoneOffset methods return the timezone offset in minutes with reverse sign.
These methods for compatibility with Date.
For example: GMT+9 returns -540.
- `get timezoneOffset`: always return the pre-defined timezone offset, not the runtime timezone offset.
- `set timezoneOffset`: change the timezone offset, but keep the value of `getTime()` (epoch) unchanged. The value can be the new value, or a function that takes the old value and returns the new value or undefined to skip setting.
- `getTimezoneOffset()`.
- `setTimezoneOffset()`: set the timezone offset and return the OffsetDate instance.
- `withTimezoneOffset()`: return a new OffsetDate instance with the timezone offset set.

Timezone (no `timezone` prefix) methods return the timezone offset in hour with same sign.
For example: GMT+9 returns 9.
- `get offset`: always return the pre-defined timezone offset, not the runtime timezone offset.
- `set offset`: change the timezone offset, but keep the value of `getTime()` (epoch) unchanged. The value can be the new value, or a function that takes the old value and returns the new value or undefined to skip setting.
- `getOffset()`.
- `setOffset()`: set the timezone offset and return the OffsetDate instance.
- `withOffset()`: return a new OffsetDate instance with the timezone offset set.

### Epoch methods
- `get time`: return the epoch time.
- `set time`: set the epoch time. The value can be the new value, or a function that takes the old value and returns the new value or undefined to skip setting.
- `getTime()`.
- `setTime()`: set the epoch time and return the OffsetDate instance.
- `withTime()`: return a new OffsetDate instance with the epoch time set.

### Constructor
All constructors support the last optional `options` argument. The `options` is an object with the following properties:
- `offset`: timezone offset. If not specified, `OffsetDate.defaultOffset` is used.

The following constructors are supported.
- `new OffsetDate()`: same as `new OffsetDate(Date.now())`.
- `new OffsetDate(intTime)`.
- `new OffsetDate(stringTime)`.
- `new OffsetDate(year, month, date?, hours?, minutes?, seconds?, milliseconds?)`.
- `new OffsetDate(date)`: copy constructor.
- `new OffsetDate(oDate)`: copy constructor.

We manually implement the date parser for `new OffsetDate(stringTime)`.
It is stricter than the native `Date` constructor, but more consistent.
The supported formats are: `[<Date>][[T]<Time><Zone>]`. Specifically:
- `<Date>`
- `<Date>T<Time>`
- `<Date>T<Time><Zone>`
- `T<Time>`
- `T<Time><Zone>`
- `<Time>`
- `<Time><Zone>`

Instead of following the standard, we strictly limit (and also extend) the format to:
- `<Date>`: `YYYY-MM-DD`, `YYYY-MM`, `YYYY`.
- `<Time>`: `HH:mm:ss.sss`, `HH:mm:ss`, `HH:mm`, `HH`.
- `<Zone>`: `Z`, `+HH`, `-HH`, `+HH:mm`, `-HH:mm`, `+HHmm`, `-HHmm`.

If some fields are missing:
- For time fields (hour, min, sec, milli sec), they are defaulted to be 0.
- For date fields (year, month, date), if year is defined, month and date are defaulted to be 1.
- If year is not defined, year/month/date is defaulted to be the current year/month/date at the timezone of the OffsetDate instance, NOT the timezone specified in the string argument or the timezone of the runtime.

Examples: followings are all valid. "Z" can be omitted or replaced in other formats in any example.

- `2021-09-04T05:19:52.000Z`
- `2021-09-04T05:19:52Z`
- `2021-09-04T05:19Z`
- `2021-09-04T05Z`
- `2021-09-04`
- `2021-09T05:19:52.000Z`
- `2021-09T05:19:52Z`
- `2021-09T05:19Z`
- `2021-09T05Z`
- `2021-09`
- `2021T05:19:52.000Z`
- `2021T05:19:52Z`
- `2021T05:19Z`
- `2021T05Z`
- `2021`
- `T05:19:52.000Z`
- `T05:19:52Z`
- `T05:19Z`
- `T05Z`
- `05:19:52.000Z`
- `05:19:52Z`
- `05:19Z`
- `05Z`

| Input | Output |
|---|---|
| `2021-09-04T05:19:52.000` | `2021-09-04T05:19:52.000` |
| `2021-09-04T05:19:52` | `2021-09-04T05:19:52.000` |
| `2021-09-04T05:19` | `2021-09-04T05:19:00.000` |
| `2021-09-04T05` | `2021-09-04T05:00:00.000` |
| `2021-09-04` | `2021-09-04T00:00:00.000` |
| `2021-09T05:19:52.000` | `2021-09-01T05:19:52.000` |
| `2021-09T05:19:52` | `2021-09-01T05:19:52.000` |
| `2021-09T05:19` | `2021-09-01T05:19:00.000` |
| `2021-09T05` | `2021-09-01T05:00:00.000` |
| `2021-09` | `2021-09-01T00:00:00.000` |
| `2021T05:19:52.000` | `2021-01-01T05:19:52.000` |
| `2021T05:19:52` | `2021-01-01T05:19:52.000` |
| `2021T05:19` | `2021-01-01T05:19:00.000` |
| `2021T05` | `2021-01-01T05:00:00.000` |
| `2021` | `2021-01-01T00:00:00.000` |
| `T05:19:52.000` | `<today>T05:19:52.000` |
| `T05:19:52` | `<today>T05:19:52.000` |
| `T05:19` | `<today>T05:19:00.000` |
| `T05` | `<today>T05:00:00.000` |
| `05:19:52.000` | `<today>T05:19:52.000` |
| `05:19:52` | `<today>T05:19:52.000` |
| `05:19` | `<today>T05:19:00.000` |
| `05` | `<today>T05:00:00.000` |

The timezone offset specified in the string argument determines the absolute time of the argument, it does not affect the value of the timezone of the constructed OffsetDate instance.

If timezone is not specified in the string argument, it falls back to the timezone of OffsetDate instance.


## ZonedDate
`ZonedDate` is a full-fledged class to manipulate date with timezone by name.

`ZonedDate` is not a sub-class of Date, we try to implement all available methods in Date object's prototype, with some additional methods for convenient.

`ZonedDate` requires associated Intl support for your specified Timezone name.
You need to provide the polyfill and check the available of the timezone.
If the timezone is not supported, the `ZonedDate` constructor will throw an Error.

If you know the offset, we highly recommend `OffsetDate`, which does not require any polyfill or external library.
`OffsetDate` is just math and the base Date class's methods.

`ZonedDate` explicitly supports Daylight Time Saving (DST), and all Disambiguation option defined in [Temporal Proposal](https://tc39.es/proposal-temporal/docs/ambiguity.html#resolving-time-ambiguity-in-temporal).

### Polyfill and related methods

To list all supported timezones: `console.log(Intl.supportedValuesOf('timeZone'))`.

To check if a timezone is supported (we internally rely on this class to derive timezone offset from timezone name):
```javascript
new Intl.DateTimeFormat(undefined, { timeZone: timezoneName})
```
If the constructor does not throw any error, the timezone `timezoneName` is supported.
You can also try initializing a `ZonedDate` instance with the timezone name, if it does not throw any error, the timezone is supported.

### ZonedDate APIs

`ZonedDate` has the similar interface with `OffsetDate`.
Note that: `new OffsetDate instanceof Date` returns `true`, while `new ZonedDate instanceof Date` returns `false`.

`ZonedDate`'s constructor has different options, compared to `OffsetDate`.
- `timezone` (`string`): offset name. Default value: `ZonedDate.defaultOffset`.
- `disambiguation` (`'compatible'`, `'forward'`, `'backward'`, or, `'reject'`).

In addition to `OffsetDate`, `ZonedDate` has:
- `get/set` `timezone`.
- `getTimezone(): string`.
- `setTimezone(timezone?: string | ((timezone: string) => string | undefined)): this`.
- `withTimezone(timezone?: string | ((timezone: string) => string | undefined)): ZonedDate`.

- `get/set` `disambiguation`.
- `getDisambiguation(): string`.
- `setDisambiguation(disambiguation?: string | ((timezone: string) => string | undefined)): this`.
- `withDisambiguation(disambiguation?: string | ((timezone: string) => string | undefined)): ZonedDate`.

Besides, `ZonedDate` does not have methods to modify offset/offsetTimezone.

### Examples:

```javascript
import ZonedDate from 'zoned-date/ZonedDate'

const date = new ZonedDate('2021-09-04T05:19:52.001', {timezone: 'Asia/Tokyo'}) // GMT+9
console.log(date.hours) // 5

// GMT+7
console.log(new ZonedDate(date.time, {timezone: 'Asia/Bangkok'}).hours) // 3 = 5 - 9 + 7

// UTC
console.log(new ZonedDate(date.time, {timezone: 'UTC'}).hours) // 20 = 5 - 9 + 24)

// GMT-4
console.log(new ZonedDate(date.time, {timezone: 'America/New_York'}).hours) // 16 = 5 - 9 + -4 + 24)
```
