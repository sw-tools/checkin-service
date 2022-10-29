import * as Got from 'got';
import * as Uuid from 'uuid';
import { Reservation } from '../lib/reservation';
import { AirportCode } from './timezones';

/**
 * @todo investigate why this function sometimes throws a 403 error. It happens many times in a row
 * for a period of time, and then resolves itself. It seems to start after several requests are sent
 * quickly. Maybe the API is throttling us? Not sure why that would be indicated by a 403 error.
 */
export async function getReservation(reservation: Reservation) {
  type ExistingReservation = {
    bounds: {
      departureAirport: {
        code: AirportCode;
        name: string;
        state: string;
      };
      departureDate: string;
      departureTime: string;
    }[];
  };

  const url = withSuffix(
    'mobile-air-booking/v1/mobile-air-booking/page/view-reservation/',
    reservation
  );

  const headers = await getBasicHeaders();

  return loadJsonPage<ExistingReservation>({
    url,
    method: Method.GET,
    headers
  });
}

interface LoadJsonPageInput {
  url: string;
  method: Method;
  json?: Got.Options['json'];
  headers: Record<string, string>;
  retry?: Got.Options['retry'];
}

export async function loadJsonPage<SuccessResponse>(input: LoadJsonPageInput) {
  const response = await Got.default(input.url, {
    headers: input.headers,
    method: input.method,
    retry: input.retry,
    json: input.json
  }).json<Record<string, any>>();

  if (!response) {
    return;
  }

  for (const [key, value] of Object.entries(response)) {
    if (key.endsWith('Page')) {
      return <SuccessResponse>value;
    }
  }
}

export async function getBasicHeaders() {
  const configJs = await Got.default.get('https://mobile.southwest.com/js/config.js');

  if (configJs.statusCode !== 200) {
    return;
  }

  const regex = /API_KEY\:\"(?<apiKey>\w*)\"/;

  const apiKey = configJs.body.match(regex).groups.apiKey;

  const userExperienceKey = Uuid.v1().toUpperCase();

  return {
    Host: 'mobile.southwest.com',
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'X-User-Experience-Id': userExperienceKey,
    Accept: '*/*',
    'X-Channel-ID': 'MWEB'
  };
}

export function withSuffix(uri: string, reservation: Reservation) {
  return (
    `${getBaseUrl()}/${uri}${reservation.confirmation_number}` +
    `?first-name=${reservation.first_name}&last-name=${reservation.last_name}`
  );
}

export function getBaseUrl() {
  return 'https://mobile.southwest.com/api';
}

export enum Method {
  GET = 'GET',
  POST = 'POST'
}
