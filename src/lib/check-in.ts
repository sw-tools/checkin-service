import console from 'console';
import { Reservation } from '../lib/reservation';
import * as SwClient from '../lib/sw-client';

export interface MakeFetchCheckinDataAttemptsInput {
  reservation: Reservation;
  headers: Record<string, string>;
  attemptLimit: number;
  millisPerRequest: number;
  logger?: typeof console;
}

/**
 * Make many requests in attempt to fetch checkin data as quickly as possible.
 *
 * Does not wait for each request to complete. Instead simply makes requests on an interval until
 * one is successful. Thus, we will likely have multiple requests in flight at once.
 */
export async function makeFetchCheckinDataAttempts(input: MakeFetchCheckinDataAttemptsInput) {
  // Create a cancel function that can be used to cancel the attempts. We are essentially
  // implementing a cancelable promise. We use this to cancel the remaining attempts once we get one
  // successful response.

  const signal = createCancellableSignal();

  const promises = [];
  for (let attempt = 0; attempt < input.attemptLimit; attempt++) {
    const waitMillis = attempt * input.millisPerRequest;

    const requestPromise = makeDelayedRequest({
      reservation: input.reservation,
      headers: input.headers,
      waitMillis,
      cancelSignal: signal.signal,
      attempt,
      attemptLimit: input.attemptLimit,
      logger: input.logger
    });

    promises.push(requestPromise);
  }

  const response = await Promise.any(promises);

  // we got the checkin data; cancel the remaining attempts
  signal.cancel();

  return response;
}

interface MakeDelayedRequestInput {
  reservation: Reservation;
  headers: Record<string, string>;
  waitMillis: number;
  cancelSignal: Promise<void>;
  attempt?: number;
  attemptLimit?: number;
  logger?: typeof console;
}

async function makeDelayedRequest(input: MakeDelayedRequestInput) {
  // NOTE: we don't concern ourselves with cancelling in-flight http requests, only in-flight
  // setTimeouts

  await new Promise<void>((resolve, reject) => {
    const timeOut = setTimeout(() => {
      resolve();
    }, input.waitMillis);

    input.cancelSignal.catch(err => {
      clearTimeout(timeOut);
      reject(err);
    });
  });

  type Response = {
    _links: {
      checkIn: {
        body: Record<string, any>;
        href: string;
      };
    };
  };

  let response;
  try {
    response = await SwClient.loadJsonPage<Response>({
      url: SwClient.withSuffix(
        'mobile-air-operations/v1/mobile-air-operations/page/check-in/',
        input.reservation
      ),
      method: SwClient.Method.GET,
      headers: input.headers
    });
  } catch (error) {
    if (input.logger) {
      // It's normal to see many of these messages before we get the good response. We try
      // many times because the airline's API has a quirk of not making checking available at
      // exactly the time expected.
      input.logger.log(
        'Failed on attempt %d of %d at %s with error:',
        input.attempt,
        input.attemptLimit,
        error
      );
    }
  }

  return response;
}

export interface CheckinSuccessfulResponse {
  messages: null;
  contactInformationMessage: {
    key: 'VERIFY_CONTACT_METHOD';
    /** @example null */
    header: unknown;
    body: string;
    icon: 'NONE';
    textColor: TextColor;
    linkText: string;
  };
  title: {
    key: 'CHECKIN__YOURE_CHECKEDIN';
    body: string;
    icon: 'SUCCESS';
    textColor: TextColor;
  };
  flights: {
    boundIndex: number;
    segmentType: FlightSegmentType;
    /** @example "08:30" */
    departureTime: string;
    /** @example "C23" */
    gate: string;
    /** @todo */
    passengers: unknown[];
    /** @example "LAX" */
    originAirportCode: string;
    /** @example "LGA" */
    destinationAirportCode: string;
    /** @example "1111" **/
    flightNumber: string;
    hasWifi: boolean;
    /** @example "5h 10m" */
    travelTime: string;
  }[];
  /** @example { 'checkin.odout': "LAXLGA" } */
  _analytics: Record<string, string>;
  _links: {
    checkInSessionToken: string;
    viewAllBoardingPasses: {
      href: string;
      method: SwClient.Method.POST;
      /** @todo */
      body: unknown[];
      labelText: string;
      /** @example null */
      nonSequentialPositionsMessage: unknown;
    };
    contactInformation: {
      href: string;
      method: SwClient.Method.POST;
      query: unknown[];
    };
  };
}

enum TextColor {
  DEFAULT = 'DEFAULT',
  NORMAL = 'NORMAL'
}

enum FlightSegmentType {
  DEPARTING = 'DEPARTING',
  ARRIVING = 'ARRIVING'
}

export interface CheckinFailedResponse {
  code: number;
  /** @example "Sorry! This reservation is not eligible for check in." */
  message: string;
  /** @example "ERROR__AIR_TRAVEL__BEFORE_CHECKIN_WINDOW" */
  messageKey: string;
  /** @example null */
  header: unknown;
  /** @example "BAD_REQUEST" */
  httpStatusCode: string;
  requestId: string;
  infoList: unknown[];
}

/**
 * https://medium.com/@masnun/creating-cancellable-promises-33bf4b9da39c
 */
function createCancellableSignal() {
  type CancellableSignal = {
    signal: Promise<void>;
    cancel: () => void;
  };

  const result = <CancellableSignal>{};

  result.signal = new Promise((resolve, reject) => {
    result.cancel = () => {
      reject(new Error('Promise was cancelled'));
    };
  });

  return result;
}
