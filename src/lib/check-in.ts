import console from 'console';
import HttpStatus from 'http-status';
import * as Luxon from 'luxon';
import { Reservation } from '../lib/reservation';
import * as SwClient from '../lib/sw-client';

export function makeFetchCheckinDataAttempts(
  reservation: Reservation,
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

  return SwClient.loadJsonPage<Response>({
    url: SwClient.withSuffix(
      'mobile-air-operations/v1/mobile-air-operations/page/check-in/',
      reservation
    ),
    method: SwClient.Method.GET,
    headers,
    retry: {
      // We'll try a total of 80 times.
      // This should give us 5 seconds of checkin tries before checkin time and 15 seconds after.
      limit: 79,
      methods: [SwClient.Method.POST],
      statusCodes: [400, HttpStatus.NOT_FOUND],
      calculateDelay: state => {
        const nowTimestamp = Luxon.DateTime.now().toLocaleString(
          Luxon.DateTime.DATETIME_FULL_WITH_SECONDS
        );
        if (logger) {
          // It's normal to see many of these messages before we get the good response. We try
          // many times because checkin does not become available at exactly the time expected.
          logger.log(
            'Failed on attempt %d of %d at %s with error:',
            state.attemptCount,
            state.retryOptions.limit,
            nowTimestamp,
            state.error.response?.body
          );
        }

        // cancel retry when limit is hit
        if (state.attemptCount > state.retryOptions.limit) {
          return 0;
        }

        // retry every 250 milliseconds
        return 250;
      }
    }
  });
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
