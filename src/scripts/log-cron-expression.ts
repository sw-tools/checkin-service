import console from 'console';
import * as Luxon from 'luxon';
import * as CronUtils from '../lib/cron-utils';

function main() {
  const date = Luxon.DateTime.fromISO('2021-12-11T17:40:00.000Z').toJSDate();

  console.log(CronUtils.generateCronExpressionUtc(date));
}

main();
