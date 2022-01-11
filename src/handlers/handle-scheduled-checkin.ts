import console from 'console';
import * as Got from 'got';
import * as Luxon from 'luxon';
import * as util from 'util';
import * as CheckIn from '../lib/check-in';
import * as EventDetail from '../lib/event-detail';
import * as SwClient from '../lib/sw-client';
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

async function handleInternal(event: EventDetail.Detail) {
  console.log('Reservation', JSON.stringify(event.reservation, null, 2));

  const basicHeaders = await SwClient.getBasicHeaders();
  const advancedHeaders = await SwGenerateHeaders.generateHeaders(event.reservation);

  console.debug('basicHeaders', basicHeaders);
  console.debug('advancedHeaders', advancedHeaders);

  const checkinDateTime = Luxon.DateTime.fromSeconds(event.checkin_available_epoch);

  // start trying to check in 5 seconds before checkin time
  const startTryingCheckinDateTime = checkinDateTime.minus({ seconds: 5 });

  const millisUntilTryingCheckin = startTryingCheckinDateTime.diffNow().toMillis();

  // this is the normal flow; we expect to have some extra time to wait
  if (millisUntilTryingCheckin > 0) {
    console.debug(
      'Waiting %d seconds before checking in',
      Math.floor(millisUntilTryingCheckin / 1000)
    );

    const waitMs = util.promisify(setTimeout);

    await waitMs(millisUntilTryingCheckin);
  }

  console.log(
    'Starting fetch checkin data attempts at',
    Luxon.DateTime.now().toLocaleString(Luxon.DateTime.DATETIME_FULL_WITH_SECONDS)
  );

  let data;
  try {
    data = await CheckIn.makeFetchCheckinDataAttempts(event.reservation, basicHeaders, console);
  } catch (error) {
    if (error instanceof Got.HTTPError) {
      const dataFailure = <Got.Response<CheckIn.CheckinFailedResponse>>error.response;
      throw new Error(`Failed to fetch checkin data: ${dataFailure}`);
    } else {
      throw error;
    }
  }

  console.log(
    'Checking in at',
    Luxon.DateTime.now().toLocaleString(Luxon.DateTime.DATETIME_FULL_WITH_SECONDS)
  );

  const result = await SwClient.loadJsonPage<CheckIn.CheckinSuccessfulResponse>({
    url: `${SwClient.getBaseUrl()}/mobile-air-operations${data['_links'].checkIn.href}`,
    json: data['_links'].checkIn.body,
    method: SwClient.Method.POST,
    headers: advancedHeaders
  });

  console.log('Checkin succeeded', JSON.stringify(result, null, 2));
}
