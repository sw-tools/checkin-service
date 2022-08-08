import * as EventBridge from '@aws-sdk/client-eventbridge';
import type * as AWSLambda from 'aws-lambda';
import console from 'console';
import HttpStatus from 'http-status';
import process from 'process';
import { findRulesForUser, findTargetsOfRule } from '../lib/eventbridge-checkin-rules';
import { Reservation } from '../lib/reservation';
import { getStandardResponseHeaders } from '../lib/response-utils';
import * as Queue from '../lib/scheduled-checkin-ready-queue';

type RequestQueryParams = {
  user_id: string;
};

interface ResponseBody {
  data: Checkin[];
}

/**
 * Check the user into a single flight.
 */
export async function handle(event: AWSLambda.APIGatewayProxyEvent) {
  let result: AWSLambda.APIGatewayProxyResult;
  try {
    result = await handleInternal(event);
  } catch (error) {
    console.error(error);
    result = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      headers: getStandardResponseHeaders(),
      body: JSON.stringify({ error: error.message })
    };
    throw error;
  }
  return result;
}

async function handleInternal(event: AWSLambda.APIGatewayProxyEvent) {
  // validate request

  const queryParams = event.queryStringParameters;
  if (!isQueryParams(queryParams)) {
    const result: AWSLambda.APIGatewayProxyResult = {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      headers: getStandardResponseHeaders(),
      body: JSON.stringify({ error: 'Invalid parameters', error_code: 'invalid_parameters' })
    };
    return result;
  }

  const eventBridge = new EventBridge.EventBridgeClient({});

  const rulesIterator = findRulesForUser(
    eventBridge,
    process.env.TRIGGER_SCHEDULED_CHECKIN_RULE_PREFIX,
    queryParams.user_id
  );
  const rules = [];
  for await (const pageOfRules of rulesIterator) {
    rules.push(...pageOfRules);
  }

  const firstTargetOfEachRule = [];
  for (const rule of rules) {
    const targetsIterator = findTargetsOfRule(eventBridge, rule.Name);
    for await (const targets of targetsIterator) {
      firstTargetOfEachRule.push(targets[0]);
      break;
    }
  }

  const checkins = firstTargetOfEachRule.map(target => {
    const input = JSON.parse(target.Input) as Queue.Message;
    console.log('input', input);
    const checkin: Checkin = {
      status: 'scheduled',
      reservation: {
        confirmation_number: input.reservation.confirmation_number,
        first_name: input.reservation.first_name,
        last_name: input.reservation.last_name
      },
      checkin_available_epoch: input.checkin_available_epoch,
      departure_timezone: input.departure_timezone
    };
    return checkin;
  });

  const responseBody: ResponseBody = {
    data: checkins
  };
  const result: AWSLambda.APIGatewayProxyResult = {
    statusCode: HttpStatus.OK,
    headers: getStandardResponseHeaders(),
    body: JSON.stringify(responseBody)
  };
  return result;
}

function isQueryParams(value: any): value is RequestQueryParams {
  const typedValue = value as RequestQueryParams;
  return typeof typedValue.user_id === 'string';
}

interface Checkin {
  status: 'scheduled';
  reservation: Reservation;
  checkin_available_epoch: number;
  departure_timezone: string;
}
