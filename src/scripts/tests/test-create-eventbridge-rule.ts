import * as EventBridge from '@aws-sdk/client-eventbridge';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import assert from 'assert';
import console from 'console';
import * as Luxon from 'luxon';
import process from 'process';
import { generateCronExpressionUtc } from '../../lib/cron-utils';
import { putRule, putTarget } from '../../lib/eventbridge-checkin-rules';
import { Reservation } from '../../lib/reservation';
import * as Queue from '../../lib/scheduled-checkin-ready-queue';

/**
 * Create an eventbridge rule and a target for it.
 */
async function main() {
  assert(process.argv.length === 3, 'Invalid parameters');
  const awsAccountId = process.argv[2];

  const ruleFireDateTime = Luxon.DateTime.now().plus({ minutes: 1 });

  const cronExpression = generateCronExpressionUtc(ruleFireDateTime.toJSDate());

  const reservation: Reservation = {
    confirmation_number: 'A12345',
    first_name: 'John',
    last_name: 'Doe'
  };

  const userId = 'asdfafe3at4agdss';

  const ruleName =
    'trigger-scheduled-checkin-' +
    `${userId}-${reservation.confirmation_number}-${Math.floor(ruleFireDateTime.toSeconds())}`;

  const eventBridge = new EventBridge.EventBridgeClient({
    region: 'us-west-2',
    credentials: fromIni({ profile: 'sw-tools' })
  });

  await putRule({ eventBridge, ruleName, cronExpression });

  const message: Queue.Message = {
    reservation,
    checkin_available_epoch: Math.floor(ruleFireDateTime.plus({ minutes: 5 }).toSeconds())
  };

  await putTarget({
    eventBridge,
    ruleName,
    message,
    targetArn: `arn:aws:sqs:us-west-2:${awsAccountId}:prod-checkin-service-scheduled-checkin-ready`
  });
}

main().catch(console.error);
