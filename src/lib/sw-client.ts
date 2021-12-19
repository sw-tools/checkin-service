import * as Got from 'got';
import * as Uuid from 'uuid';
import { Reservation } from '../lib/reservation';

export async function lookUpExistingReservation(reservation: Reservation) {
  type ExistingReservation = {
    bounds: {
      departureAirport: {
        code: string;
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

  const headers = await findBasicHeaders();

  return loadJsonPage<ExistingReservation>({
    url,
    method: Method.GET,
    headers
  });
}

export async function findBasicHeaders() {
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return <SuccessResponse>value;
    }
  }
}

export function withSuffix(uri: string, reservation: Reservation) {
  return (
    `${getBaseUrl()}/${uri}${reservation.confirmationNumber}` +
    `?first-name=${reservation.firstName}&last-name=${reservation.lastName}`
  );
}

export function getBaseUrl() {
  return 'https://mobile.southwest.com/api';
}

export enum Method {
  GET = 'GET',
  POST = 'POST'
}
