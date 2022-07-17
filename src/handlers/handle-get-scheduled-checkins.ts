import * as EventBridge from '@aws-sdk/client-eventbridge';
import assert from 'assert';
import console from 'console';
import HttpStatus from 'http-status';
import { CheckinTime } from '../lib/checkin-time';
import { findRulesForUser, findTargetsOfRule } from '../lib/eventbridge-checkin-rules';
import { Reservation } from '../lib/reservation';
import { getStandardResponseHeaders } from '../lib/response-utils';

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
  const queryParams = event.queryStringParameters;
  assert(isQueryParams(queryParams), 'Invalid request');

  const eventBridge = new EventBridge.EventBridgeClient({});

  const rulesIterator = findRulesForUser(eventBridge, body.data.first_name, body.data.last_name);

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
    const reservation = JSON.parse(target.Input) as Reservation;
    const checkin: Checkin = {
      confirmation_number: reservation.confirmation_number,
      status: 'scheduled',
      checkin_available_epoch: 0,
      checkin_boot_epoch: 0
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

interface Checkin extends CheckinTime {
  confirmation_number: string;
  status: 'scheduled';
}
