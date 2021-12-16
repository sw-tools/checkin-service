import console from 'console';
import Got from 'got';
import * as util from 'util';
import * as Uuid from 'uuid';
import { Reservation } from '../lib/reservation';

export async function lookUpExistingReservation(reservation: Reservation, logger?: typeof console) {
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
    delayBetweenRequestsSeconds: 0.25,
    logger,
    maxAttempts: 1,
    method: Method.GET,
    headers
  });
}

export async function findBasicHeaders() {
  const configJs = await Got.get('https://mobile.southwest.com/js/config.js');

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

const waitMs = util.promisify(setTimeout);

interface MakeRestRequestInput {
  body?: Record<string, any>;
  delayBetweenRequestsSeconds: number;
  headers: Record<string, string>;
  logger?: typeof console;
  maxAttempts: number;
  method: Method;
  url: string;
}

async function makeRestRequest(input: MakeRestRequestInput) {
  if (input.logger) {
    input.logger.debug('generating headers');
  }

  if (input.logger) {
    input.logger.debug('generated headers', input.headers);
  }

  let response;
  let error;
  for (let attempts = 0; attempts < input.maxAttempts; attempts++) {
    if (input.logger) {
      input.logger.debug(
        'making request %d of %d to %s',
        attempts + 1,
        input.maxAttempts,
        input.url
      );
    }

    try {
      if (input.method === Method.GET) {
        response = await Got.get(input.url, { headers: input.headers });
      } else if (input.method === Method.POST) {
        response = await Got.post(input.url, { json: input.body, headers: input.headers });
      }
      // TODO: force exhaustive switch
    } catch (err) {
      error = err;
      if (input.logger) {
        input.logger.warn('failed on attempt %d of %d', attempts + 1, input.maxAttempts);
        input.logger.warn('err.statusCode', err.statusCode);
        input.logger.warn('err.response.body', err.response.body);
      }

      if (error.statusCode >= 500) {
        return;
      }

      await waitMs(input.delayBetweenRequestsSeconds * 1000);

      continue;
    }

    return <Record<string, any>>JSON.parse(response.body);
  }

  throw new Error(
    `Max attempts (${input.maxAttempts}) hit. Last error (${error.statusCode}): ` +
      error.response?.body
  );
}

interface LoadJsonPageInput {
  body?: Record<string, any>;
  delayBetweenRequestsSeconds: number;
  headers: Record<string, string>;
  logger?: typeof console;
  maxAttempts: number;
  method: Method;
  url: string;
}

export async function loadJsonPage<T>(input: LoadJsonPageInput) {
  const data = await makeRestRequest({
    url: input.url,
    method: input.method,
    maxAttempts: input.maxAttempts,
    delayBetweenRequestsSeconds: input.delayBetweenRequestsSeconds,
    body: input.body,
    logger: input.logger,
    headers: input.headers
  });

  if (!data) {
    return;
  }

  for (const [key, value] of Object.entries(data)) {
    if (key.endsWith('Page')) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return <T>value;
    }
  }
}

function withSuffix(uri: string, reservation: Reservation) {
  return (
    `${getBaseUrl()}/${uri}${reservation.confirmationNumber}` +
    `?first-name=${reservation.firstName}&last-name=${reservation.lastName}`
  );
}

export function getBaseUrl() {
  return 'https://mobile.southwest.com/api';
}

export function fetchCheckinData(
  reservation: Reservation,
  delayBetweenRequestsSeconds: number,
  maxAttempts: number,
  headers: Record<string, string>,
  logger?: typeof console
) {
  type Response = {
    _links: {
      checkIn: {
        body: Record<string, any>;
        href: string;
      };
    };
  };

  return loadJsonPage<Response>({
    url: withSuffix('mobile-air-operations/v1/mobile-air-operations/page/check-in/', reservation),
    delayBetweenRequestsSeconds,
    logger,
    maxAttempts,
    method: Method.GET,
    headers
  });
}

export enum Method {
  GET = 'GET',
  POST = 'POST'
}
