# djz - Timezone-aware better Javascript Date

# Install
```bash
yanr add djz
```

# Usage
```javascript
import {Dateo} from 'djz'
// or
import Dateo from 'djz/Dateo'
```

# API

`Dateo` is a sub-class of Date. It has all the methods of Date, some of them are overrided to be timezone-aware, and some methods are added for convenience.

## List of overrided and new methods:

### Static method
- `set/get Dateo.defaultOffset`: set/get the default timezone offset in hour (no sign reverse. For example: GMT+9 is 9). The default value is 0.

### Wallclock methods

For all below methods, `wallclock` is one of: `fullYear`, `month`, `date`, `hours`, `minutes`, `seconds`, `milliseconds`.
These methods manipulate the wallclock time with respect to a particular timezone, regardless of the timezone of the runtime.

- `get wallclock`: `wallclock = date.wallclock`.
- `set wallclock`: `date.wallclock = wallclock`. The value can be the new value, or a function that takes the old value and returns the new value or undefined to skip setting.

For example: `date.fullYear = y => y + 1`, `date.fullYear = 2020`, `date.fullYear = undefined`, `date.fullYear = () => undefined`.

- `getWallclock()`
- `setWallclock()`: set the wallclock and return the Dateo instance. Example: `date.setMonth(x => x + 1).setDate(1) === date`.
- `withWallclock()`: return a new Dateo instance with the wallclock set. Example: `date.withWallclock(wallclock) !== date`.

Besides, `day` wallclock is get only.
- `get day`.
- `getDay()`.

### Timezone
TimezoneOffset methods return the timezone offset in minutes with reverse sign.
These methods for compatibility with Date.
For example: GMT+9 returns -540.
- `get timezoneOffset`: always return the pre-defined timezone offset, not the runtime timezone offset.
- `set timezoneOffset`: change the timezone offset, but keep the value of `getTime()` (epoch) unchanged. The value can be the new value, or a function that takes the old value and returns the new value or undefined to skip setting.
- `getTimezoneOffset()`.
- `setTimezoneOffset()`: set the timezone offset and return the Dateo instance.
- `withTimezoneOffset()`: return a new Dateo instance with the timezone offset set.

Timezone (no `Offset` suffix) methods return the timezone offset in hour with correct sign.
For example: GMT+9 returns 9.
- `get timezone`: always return the pre-defined timezone offset, not the runtime timezone offset.
- `set timezone`: change the timezone offset, but keep the value of `getTime()` (epoch) unchanged. The value can be the new value, or a function that takes the old value and returns the new value or undefined to skip setting.
- `getTimezone()`.
- `setTimezone()`: set the timezone offset and return the Dateo instance.
- `withTimezone()`: return a new Dateo instance with the timezone offset set.

### Epoch methods
- `get time`: return the epoch time.
- `set time`: set the epoch time. The value can be the new value, or a function that takes the old value and returns the new value or undefined to skip setting.
- `getTime()`.
- `setTime()`: set the epoch time and return the Dateo instance.
- `withTime()`: return a new Dateo instance with the epoch time set.

### Constructor
All constructors support the last optional `options` argument. The `options` is an object with the following properties:
- `offset`: timezone offset. If not specified, `Dateo.defaultOffset` is used.

The following constructors are supported.
- `new Dateo()`: same as `new Dateo(Date.now())`.
- `new Dateo(intTime)`.
- `new Dateo(stringTime)`.
- `new Dateo(year, month, date?, hours?, minutes?, seconds?, milliseconds?)`.
- `new Dateo(date)`: copy constructor.
- `new Dateo(dateo)`: copy constructor.

We manually implement the date parser for `new Dateo(stringTime)`.
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

If some fields are missing, they are assumed to be 0 for time fields, and current date for date fields.

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

The timezone offset specified in the string argument determines the absolute time of the argument, it does not affect the value of the timezone of Dateo instance.

If timezone is not specified in the string argument, it falls back to the timezone of Dateo instance.
If month, date are missing, they fall back to the current month, date taken at the timezone of Dateo instance, NOT the timezone specified in the string argument or the timezone of the runtime.


## TODO
- [ ] Implement `Datez` class, with timezone defined by name. For example: `'Asia/Tokyo'`. Which might require `Intl` available in the runtime.
