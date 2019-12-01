# Year

[![Netlify Status](https://api.netlify.com/api/v1/badges/2f96de23-ea35-4e2c-b6c9-f41b41f86dfb/deploy-status)](https://app.netlify.com/sites/damonzucconi-year/deploys)

> Sister, time, it be time, ya know wha mean? Dread.

The year increments 12 times per second; 720 years per minute; 43,200 years per hour. every time it does, a calendar is rendered with each month laid on top of one another.

I like that one can just keep clicking in calendaring software and schedule something to occur 20 years from now. Will Google exist in 20 years to remind me of my upcoming event? Will I?

When you schedule something with someone else, there's the ritual overlaying of calendars. One "finds a time" — a hole of potential in our routines. I made this after imagining the stack of calendars that scheduling creates in one's mind when pursuing those holes. (2016)

## Meta

- **State**: production
- **Production**:
  - **URL**: https://year.work.damonzucconi.com/
  - **URL**: https://damonzucconi-year.netlify.com/
- **Host**: https://app.netlify.com/sites/damonzucconi-year/overview
- **Deploys**: Merged PRs to `dzucconi/year#master` are automatically deployed to production. [Manually trigger a deploy](https://app.netlify.com/sites/damonzucconi-year/deploys?filter=master)

## Parameters

| Param                    | Description                                                  | Type                     | Default   |
| ------------------------ | ------------------------------------------------------------ | ------------------------ | --------- |
| `year`                   | Year to begin at                                             | `number`                 | `*`       |
| `background`             | Background color                                             | `html color \| "random"` | `'white'` |
| `color`                  | Text color                                                   | `html color \| "random"` | `'red'`   |
| `play`                   | Automatically start "playback"                               | `boolean`                | `false`   |
| `subtitles`              | Include random subtitles from Quora topic "The Future"       | `boolean`                | `false`   |
| `fps`                    | Target frames-per-second                                     | `number`                 | `12`      |
| `refreshIntervalSeconds` | If present, refresh after this amount of seconds has elapsed | `number`                 | `3600`    |
