# Changelog

## 0.2.0

### Breaking changes

- **ES modules only.** The CommonJS build is removed, so a program has one copy of each class. From CommonJS, use `import()`, or `require()` on Node.js 20.19, 22.12 or later: `require('zoned-date/OffsetDate').default`.
- **No root entry point.** Import each class from its own path:
	```js
	// before: import {OffsetDate, ZonedDate} from 'zoned-date'
	import OffsetDate from 'zoned-date/OffsetDate'
	import ZonedDate from 'zoned-date/ZonedDate'
	```
- **Fixed defaults.** `OffsetDate.defaultOffset`, `ZonedDate.defaultTimezone` and `ZonedDate.defaultDisambiguation` are removed. A missing option is always `0`, `'UTC'` or `'compatible'`. Pass the options in each call, or write a wrapper, as the README shows.
- **Strict parser.** A string must be in the [Date Time String Format](https://tc39.es/ecma262/#sec-date-time-string-format) of ECMAScript, which `toISOString()` writes, or be a time of that format that starts with `T`, such as `'T05:19'`. Any other string throws `Error('Invalid date string')`. Strings that now throw include:
	- forms that 0.1.3 read: a time without the `T` (`'05:19'`, `'28:30'`), a space instead of the `T`, a lower case `t` or `z`, hours without minutes (`'2021-09-04T05'`), a fraction of other than three digits (`'.5'`, `'.123456'`), and zones other than `Z` and `±HH:mm` (`'+09'`, `'+0900'`, `'-04:56:02'`, which was misread by days);
	- strings that 0.1.3 misread: `'2021-13-45'` (was 2022-02-14), `'2021-02-30'`, `'2021-09-04abc'`, `'2021/09/04'` (was January 1), `'21-09-04'` (was a time today), `'2021-247'`, `'0000-00-00'`, `'05:00PM'`, `'T2021'` (was the year 2021), `'2021-09-04+09:00'` (the zone was dropped), offsets such as `'+5:30'` (was +53:00) and `'+99:99'`, a comma before the fraction, and leading tabs or newlines.
- **Invalid offsets throw.** An `offset` that is not a finite number throws `RangeError('Invalid offset: …')` instead of making every field `NaN`.
- **Requirements.** Node.js 16.6 or later, now stated in `engines`. The TypeScript declarations need TypeScript 5.0 or later, and `moduleResolution` `node16`, `nodenext` or `bundler`.
- **Bug fixes change results.** Code that relied on, or worked around, the bugs under [Fixed](#fixed) gets different results. Most notably, `new OffsetDate(year, month, …, {offset})` added the offset instead of subtracting it, and `ZonedDate` resolved many DST changes wrongly.

### Added

- Type exports: `OffsetDateOptions` from `zoned-date/OffsetDate`; `ZonedDateOptions` and `Disambiguation` from `zoned-date/ZonedDate`; `ValueSetter` and `DateLike` from both.
- The parser reads `±YYYYYY` years, which `toISOString()` writes for the years before 0000 and after 9999.
- `ZonedDate` has `Symbol.toStringTag` `'ZonedDate'`. Vue's reactive state now leaves it unwrapped, as it does a `Date`; before, every member threw a `TypeError` there.

### Fixed

Both classes:

- Setters with several fields ignored some of them: `setFullYear(2020, 5, 15)` set only the year, and `setUTCMonth(5, 15)` only the month. The fields now apply together, as in `Date`, so `setMonth(1, 28)` on January 31 gives February 28 instead of March 3.
- `null` was the year 1900 and `true` the year 1901. Other values now convert as in `Date`: `null` is the epoch, and `true` is 1 ms.
- Objects that `Date` converts through `valueOf()` or `toString()`, such as `new Number(time)` or a dayjs object, gave the current time, an Invalid Date or a `RangeError`. So did a `Date` from another realm (`node:vm`, an iframe, a Jest environment).
- `new OffsetDate(undefined)` was an Invalid Date, and `new ZonedDate(undefined)` and `new ZonedDate(time, undefined)` threw. An `undefined` options object now means no options.
- `new OffsetDate('2020', 5)` parsed `'2020'` as a string and ignored the month.
- In a copy, a `null` option keeps the copy's value. `OffsetDate` stored `null` as the offset, and `ZonedDate` threw a `RangeError`.
- `for…in` listed methods: 17 on an `OffsetDate` and 27 on a `ZonedDate`.
- `timezoneOffset` and `getTimezoneOffset()` gave `-0` at offset 0.
- The fields of instants near the ends of the `Date` range were `NaN`, or the instant threw or was wrong.
- `new OffsetDate()` and `ZonedDate.now()` ignored a mocked `Date.now()`, such as `node:test` mock timers.

`OffsetDate`:

- `new OffsetDate(zonedDate)` gave the current time instead of the same instant.
- `getYear()` and `setYear()` used the runtime's time zone, not the offset. `setYear()` now returns the instance, like the other setters.
- `setTimezoneOffset(0)` set `offset` to `-0`.

`ZonedDate`:

- The conversions of `Date` threw a `TypeError`, so `JSON.stringify()`, comparisons, subtraction and template literals did too. `valueOf()`, `toISOString()`, `toJSON()`, `toString()`, `toDateString()`, `toTimeString()`, `toUTCString()` and the three `toLocale*String()` methods now give what they give on `toDate()`. The default conversion gives `toISOString()`, so `new Date(zonedDate)` keeps the milliseconds.
- `getUTCFullYear()` gave the year in the runtime's time zone, so `date.utcFullYear = y => y` could move the date by a year.
- `setTimezone(undefined)` switched to the runtime's time zone instead of keeping the time zone.
- Copies and `with*()` reset the disambiguation to the default, and without options it was `undefined`.
- A `NaN` time threw a `RangeError` in the constructor, and `setHours(NaN)` and the like threw too. They now give an invalid instance, like an Invalid Date.
- `setTime()` joined a `Date` or a string argument as a string, which threw a `RangeError`.
- `timezoneOffset` had rounding noise: UTC+08:20 gave `-500.00000000000006`.

`ZonedDate` time zones and DST, which now match Temporal in every time zone:

- An instant in a repeated hour moved: in Los Angeles, `new ZonedDate(Date.UTC(2023, 10, 5, 9, 30), {timezone})` read back an hour earlier. A string with an offset, such as `'2023-11-05T01:30-08:00'`, lost it the same way, and `'reject'` threw for such instants. A `ZonedDate` now stores the instant, so it keeps it, and so does `setTimezone()` to another name for the same zone.
- Nonexistent wallclocks got the wrong instant. In Los Angeles, `'2023-03-12T02:30'` gave 09:30Z instead of 10:30Z, its wallclock stayed 02:30 instead of 03:30, and `'earlier'` gave the later instant.
- A DST change to or from offset 0 was not resolved: Europe/London's `'2023-10-29T01:30'` gave 01:30Z under every option, and `'reject'` did not throw.
- A DST change of other than one hour, such as Lord Howe's 30 minutes or Troll's 2 hours, gave wrong instants. Lord Howe's `'2023-10-01T02:15'` even got the offset 11.5, which the time zone never uses.
- Offsets were rounded to whole minutes, so local mean time, and offsets such as Monrovia's UTC-00:44:30 until 1972, were up to 30 seconds off.
- Years before 1 CE were read as positive (the year -100 as 101), and the years 0 to 99 as 1900 to 1999.
- Midnight no longer reads as hour 24 on engines that format it so.

Parsing:

- The years 0000 to 0099 were 1900 to 1999.
- A time whose zone is more than a day from the instance's offset fell on the wrong day.

TypeScript:

- `OffsetDate` was not assignable to `Date`, because its setters were declared to return only the instance.
- The `ZonedDate` declarations lacked `getFullYear()`, `getDay()` and the `getUTC*()` methods.
- The setters lacked `Date`'s extra arguments. The constructors rejected a `Date | string | number` argument, `null` option values, and `undefined` ones under `exactOptionalPropertyTypes`.

### Performance

- `ZonedDate` creates one `Intl.DateTimeFormat` per time zone instead of two per instance. Creating one is about 100 times faster, and 50,000 instances take about 40 MiB instead of 2.5 GiB.

### Documentation

- The README is rewritten and covers every behavior, including the DST rules, the errors and the differences from `Date`. It no longer lists the disambiguation values `'forward'` and `'backward'`, which never existed: they are `'earlier'` and `'later'`.
