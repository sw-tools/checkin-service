import * as EventBridge from '@aws-sdk/client-eventbridge';
import AWSLambda from 'aws-lambda';
import console from 'console';
import HttpStatus from 'http-status';
import * as Luxon from 'luxon';
import * as process from 'process';
import * as util from 'util';
import * as CronUtils from '../lib/cron-utils';
import { doesRuleExist, putRule, putTarget } from '../lib/eventbridge-checkin-rules-new';
import { Reservation } from '../lib/reservation';
import * as ResponseUtils from '../lib/response-utils';
import * as Queue from '../lib/scheduled-checkin-ready-queue';
import * as SwClient from '../lib/sw-client';
import * as Timezone from '../lib/timezones';

interface RequestBody {
  data: Reservation;
}

/**
 * Given a reservation, determine when checkin can first be performed for each leg of the trip and
 * create an EventBridge rule for each. Configure the rule to send a message to the
 * scheduled-checkin-ready queue 5 minutes before it's time to check in.
 */
export async function handle(event: AWSLambda.APIGatewayProxyEvent) {
  let result: AWSLambda.APIGatewayProxyResult;

  try {
    result = await handleInternal(event);
  } catch (error) {
    console.error(error);

    const result: AWSLambda.APIGatewayProxyResult = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      headers: ResponseUtils.getStandardResponseHeaders(),
      body: JSON.stringify({ error: 'Internal server error', error_code: 'internal_server_error' })
    };

    return result;
  }

  return result;
}

async function handleInternal(event: AWSLambda.APIGatewayProxyEvent) {
  const requestBody = JSON.parse(event.body);

  if (!isRequestBody(requestBody)) {
    const result: AWSLambda.APIGatewayProxyResult = {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      headers: ResponseUtils.getStandardResponseHeaders(),
      body: JSON.stringify({ error: 'Invalid parameters', error_code: 'invalid_parameters' })
    };
    return result;
  }

  const reservation: Reservation = requestBody.data;

  const allDepartureDates = await findAllDepartureLegs(reservation);

  if (allDepartureDates.error) {
    const result: AWSLambda.APIGatewayProxyResult = {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      headers: ResponseUtils.getStandardResponseHeaders(),
      body: JSON.stringify({
        error: allDepartureDates.error,
        error_code: 'unable_to_find_departure_legs'
      })
    };
    return result;
  }

  if (allDepartureDates.legs.length < 1) {
    const result: AWSLambda.APIGatewayProxyResult = {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      headers: ResponseUtils.getStandardResponseHeaders(),
      body: JSON.stringify({ error: 'No future legs found', error_code: 'no_future_legs' })
    };
    return result;
  }

  console.debug('allDepartureDates', util.inspect(allDepartureDates, { depth: null }));

  const addedCheckinTimes = [];
  const alreadyScheduledCheckinTimes = [];

  const checkinAvailableDateTimes = allDepartureDates.legs.map(date =>
    Luxon.DateTime.fromJSDate(date).minus({ hours: 24 })
  );

  for (const checkinAvailableDateTime of checkinAvailableDateTimes) {
    // Boot Lambda 5 minutes before checkin is ready. Gives time for SQS message to invoke Lambda,
    // Lambda cold start, generating advanced headers, etc.)
    const ruleFireDateTime = checkinAvailableDateTime.minus({ minutes: 5 });

    // TODO: hash first name, last name, and confirmation number into a single string
    const ruleName =
      process.env.TRIGGER_SCHEDULED_CHECKIN_RULE_PREFIX +
      `${reservation.confirmation_number}-${reservation.first_name}-` +
      `${reservation.last_name}-${ruleFireDateTime.toSeconds()}`;

    const checkinTime: CheckinTime = {
      checkin_available_epoch: Math.floor(checkinAvailableDateTime.toSeconds()),
      checkin_boot_epoch: Math.floor(ruleFireDateTime.toSeconds())
    };

    const eventBridge = new EventBridge.EventBridgeClient({});

    // Don't schedule a checkin if it's already scheduled.
    // A rule's name is essentially a serialized reservation, so we can simply check if there is
    // already a rule with this name to determine if the checkin is already scheduled.

    const ruleExists = await doesRuleExist(eventBridge, ruleName);
    if (ruleExists) {
      alreadyScheduledCheckinTimes.push(checkinTime);
      continue;
    }

    // create the rule

    const cronExpression = CronUtils.generateCronExpressionUtc(ruleFireDateTime.toJSDate());

    console.debug('cronExpression', cronExpression);

    await putRule({ eventBridge, ruleName, cronExpression });

    // have the eventbridge rule send an sqs message to the scheduled-checkin-ready queue

    const message: Queue.Message = {
      reservation,
      checkin_available_epoch: checkinAvailableDateTime.toSeconds()
    };

    await putTarget({
      eventBridge,
      ruleName,
      message,
      targetArn: process.env.SCHEDULED_CHECKIN_READY_QUEUE_ARN
    });

    addedCheckinTimes.push(checkinTime);
  }

  const responseBody: ResponseBody = {
    data: {
      added_checkin_times: addedCheckinTimes,
      already_scheduled_checkin_times: alreadyScheduledCheckinTimes
    }
  };

  const result: AWSLambda.APIGatewayProxyResult = {
    statusCode: HttpStatus.OK,
    headers: ResponseUtils.getStandardResponseHeaders(),
    body: JSON.stringify(responseBody)
  };
  return result;
}

async function findAllDepartureLegs(reservation: Reservation) {
  let body;
  try {
    body = await SwClient.getReservation(reservation);
  } catch (error) {
    console.error(error);

    return {
      error: 'Failed to look up reservation. Try again later.'
    };
  }

  const validLegs = [];

  for (const leg of body['bounds']) {
    const airportTimezone = await Timezone.fetchAirportTimezone(leg.departureAirport.code);

    // TODO: consider finding a better way to turn these strings into a DateTime
    const takeoff = `${leg.departureDate} ${leg.departureTime}`;
    const takeoffDateTime = Luxon.DateTime.fromFormat(takeoff, 'yyyy-MM-dd HH:mm', {
      zone: airportTimezone
    });

    console.debug('takeoffDateTime', takeoffDateTime.toUTC().toISO());

    validLegs.push(takeoffDateTime);
  }

  return {
    legs: validLegs.map(legs => legs.toJSDate())
  };
}

function isRequestBody(value: any): value is RequestBody {
  return !!(
    value &&
    value.data &&
    value.data.confirmation_number &&
    value.data.first_name &&
    value.data.last_name
  );
}

interface CheckinTime {
  checkin_available_epoch: number;
  checkin_boot_epoch: number;
}

interface ResponseBody {
  data: {
    /**
     * The checkins added by this request.
     * There can be more than one because a reservation can have multiple legs.
     */
    added_checkin_times: CheckinTime[];
    /**
     * The checkins that were already scheduled and which this request made no changes to.
     * There can be more than one because a reservation can have multiple legs.
     */
    already_scheduled_checkin_times: CheckinTime[];
  };
}
