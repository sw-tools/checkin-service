import console from 'console';
import * as Reservation from '../lib/reservation';
import * as SwClient from '../lib/sw-client';

export async function checkIn(
  reservation: Reservation.Reservation,
  delayBetweenRequestsSeconds: number,
  maxAttempts: number,
  advancedHeaders: Record<string, string>,
  logger?: typeof console
) {
  if (logger) {
    logger.log('Fetching checkin data');
  }

  const headers = await SwClient.findBasicHeaders();

  const data = await SwClient.fetchCheckinData(
    reservation,
    delayBetweenRequestsSeconds,
    maxAttempts,
    headers,
    logger
  );

  if (!data) {
    throw new Error('Checkin failed');
  }

  const infoNeeded = data['_links']['checkIn'];

  console.log('infoNeeded', JSON.stringify(infoNeeded, null, 2));

  const url = `${SwClient.getBaseUrl()}/mobile-air-operations${infoNeeded['href']}`;

  if (logger) {
    logger.log('Attempting check-in...');
  }

  const response = await SwClient.loadJsonPage({
    url,
    body: infoNeeded['body'],
    delayBetweenRequestsSeconds,
    logger,
    maxAttempts,
    method: SwClient.Method.POST,
    headers: advancedHeaders
  });

  console.log('response to actual check-in');
  console.log(response);
}
