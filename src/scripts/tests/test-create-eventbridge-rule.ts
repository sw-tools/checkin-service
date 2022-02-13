import * as EventBridge from '@aws-sdk/client-eventbridge';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import console from 'console';
import * as Luxon from 'luxon';
import { putRule, putTarget } from '../../lib/create-eventbridge-rule';
import { generateCronExpressionUtc } from '../../lib/cron-utils';
import { Reservation } from '../../lib/reservation';
import * as Queue from '../../lib/scheduled-checkin-ready-queue';

async function main() {
  const ruleFireDateTime = Luxon.DateTime.now().plus({ minutes: 1 });

  const cronExpression = generateCronExpressionUtc(ruleFireDateTime.toJSDate());

  const reservation: Reservation = {
    confirmationNumber: '12345',
    firstName: 'John',
    lastName: 'Doe'
  };

  const ruleName =
    'trigger-scheduled-checkin-' +
    `${reservation.confirmationNumber}-${reservation.firstName}-` +
    `${reservation.lastName}-${ruleFireDateTime.toSeconds()}`;

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
    targetId: `test-${ruleFireDateTime.toSeconds()}`,
    message,
    targetArn: 'arn:aws:sqs:us-west-2:737977559054:prod-checkin-service-scheduled-checkin-ready'
  });
}

main().catch(console.error);
