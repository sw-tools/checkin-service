import console from 'console';
import * as Luxon from 'luxon';
import * as util from 'util';
import * as CheckIn from '../lib/check-in';
import * as EventDetail from '../lib/event-detail';
import * as SwGenerateHeaders from '../lib/sw-generate-headers';

/**
 * On scheduled checkin, check the user in.
 *
 * @todo also remove the associated eventBridge rule, eventBridge trigger, and lambda permission
 */
export async function handle(event: EventDetail.Detail) {
  let output: unknown;

  try {
    output = await handleInternal(event);
  } catch (error) {
    console.error(error);
    throw error;
  }

  return output;
}

const waitMs = util.promisify(setTimeout);

async function handleInternal(event: EventDetail.Detail) {
  console.debug('Checking in based on reservation %s', JSON.stringify(event.reservation, null, 2));

  const advancedHeaders = await SwGenerateHeaders.generateHeaders(event.reservation);

  console.debug('advancedHeaders', advancedHeaders);

  const checkinDateTime = Luxon.DateTime.fromSeconds(event.checkin_time_epoch);

  const timeUntilCheckinDuration = checkinDateTime.diffNow();

  // start checking in 5 seconds before checkin time
  const millisBeforeCheckinAttempts = timeUntilCheckinDuration.minus({ seconds: 5 }).toMillis();

  console.debug('millisBeforeCheckinAttempts', millisBeforeCheckinAttempts);

  // this is the normal flow; we expect to have some extra time to wait
  if (millisBeforeCheckinAttempts > 0) {
    console.debug(
      'Waiting %d seconds before checking in',
      Math.floor(millisBeforeCheckinAttempts / 1000)
    );

    // waitMs will always "win" because logTimeForever will never resolve
    await Promise.race([
      waitMs(millisBeforeCheckinAttempts),
      logTimeUntilDateForever(checkinDateTime.toJSDate())
    ]);
  }

  console.debug('attempting checkin');

  await CheckIn.checkIn(event.reservation, 0.25, 80, advancedHeaders, console);

  console.log('checkin succeeded');
}

async function logTimeUntilDateForever(date: Date) {
  while (true) {
    console.log('current time:', Luxon.DateTime.now().setZone('America/Denver').toISO());

    console.log(
      'seconds until event:',
      Math.floor(Luxon.DateTime.fromJSDate(date).diffNow().toMillis() / 1000)
    );

    await waitMs(1000);
  }
}
