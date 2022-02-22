import * as EventBridge from '@aws-sdk/client-eventbridge';
import AWSLambda from 'aws-lambda';
import console from 'console';
import HttpStatus from 'http-status';
import * as Luxon from 'luxon';
import * as process from 'process';
import { putRule, putTarget } from '../lib/create-eventbridge-rule';
import * as CronUtils from '../lib/cron-utils';
import * as Reservation from '../lib/reservation';
import * as ResponseUtils from '../lib/response-utils';
import * as Queue from '../lib/scheduled-checkin-ready-queue';
import * as SwClient from '../lib/sw-client';
import * as Timezone from '../lib/timezones';

interface RequestBody {
  data: {
    confirmation_number: string;
    first_name: string;
    last_name: string;
  };
}

/**
 * On scheduled check in, check a user in
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

  const reservation: Reservation.Reservation = {
    confirmation_number: requestBody.data.confirmation_number,
    first_name: requestBody.data.first_name,
    last_name: requestBody.data.last_name
  };

  const allDepartureDates = await findAllDepartureLegs(reservation);

  if (!allDepartureDates) {
    const result: AWSLambda.APIGatewayProxyResult = {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      headers: ResponseUtils.getStandardResponseHeaders(),
      body: JSON.stringify({ error: 'No future legs found', error_code: 'no_future_legs' })
    };
    return result;
  }

  console.debug('allDepartureDates:', allDepartureDates);

  const responseBody: ResponseBody = {
    data: {
      checkin_times: []
    }
  };

  const checkinAvailableDateTimes = allDepartureDates.map(date =>
    Luxon.DateTime.fromJSDate(date).minus({
      hours: 24
    })
  );
  for (const checkinAvailableDateTime of checkinAvailableDateTimes) {
    // Boot Lambda 5 minutes before checkin is ready. Gives time for SQS message to invoke Lambda,
    // Lambda cold start, generating advanced headers, etc.)
    const ruleFireDateTime = checkinAvailableDateTime.minus({ minutes: 5 });

    // TODO: hash first and last name into a single string
    const ruleName =
      process.env.TRIGGER_SCHEDULED_CHECKIN_RULE_PREFIX +
      `${reservation.confirmation_number}-${reservation.first_name}-` +
      `${reservation.last_name}-${ruleFireDateTime.toSeconds()}`;

    const cronExpression = CronUtils.generateCronExpressionUtc(ruleFireDateTime.toJSDate());

    console.debug('cronExpression', cronExpression);

    const eventBridge = new EventBridge.EventBridgeClient({});

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

    const checkinTime: CheckinTime = {
      checkin_available_epoch: Math.floor(checkinAvailableDateTime.toSeconds()),
      checkin_boot_epoch: Math.floor(ruleFireDateTime.toSeconds())
    };

    responseBody.data.checkin_times.push(checkinTime);
  }

  const result: AWSLambda.APIGatewayProxyResult = {
    statusCode: HttpStatus.OK,
    headers: ResponseUtils.getStandardResponseHeaders(),
    body: JSON.stringify(responseBody)
  };
  return result;
}

async function findAllDepartureLegs(reservation: Reservation.Reservation) {
  const body = await SwClient.getReservation(reservation);

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

  if (validLegs.length < 1) {
    return;
  }

  return validLegs.map(legs => legs.toJSDate());
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
    checkin_times: CheckinTime[];
  };
}
