import * as EventBridge from '@aws-sdk/client-eventbridge';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import console from 'console';
import * as Luxon from 'luxon';
import { putRule, putTarget } from '../../lib/create-eventbridge-rule';
import { generateCronExpressionUtc } from '../../lib/cron-utils';

async function main() {
  const ruleFireDateTime = Luxon.DateTime.now().plus({ minutes: 1 });

  const cronExpression = generateCronExpressionUtc(ruleFireDateTime.toJSDate());

  const firstName = 'John';
  const lastName = 'Doe';
  const confirmationNumber = '12345';

  const ruleName =
    'trigger-scheduled-checkin-' +
    `${confirmationNumber}-${firstName}-` +
    `${lastName}-${ruleFireDateTime.toSeconds()}`;

  const eventBridge = new EventBridge.EventBridgeClient({
    region: 'us-west-2',
    credentials: fromIni({ profile: 'sw-tools' })
  });

  await putRule(eventBridge, ruleName, cronExpression);

  await putTarget(
    eventBridge,
    ruleName,
    `test-${ruleFireDateTime.toSeconds()}`,
    {
      reservation: {
        confirmationNumber: '12345',
        firstName: 'John',
        lastName: 'Doe'
      },
      checkin_available_epoch: Math.floor(ruleFireDateTime.plus({ minutes: 5 }).toSeconds())
    },
    'arn:aws:sqs:us-west-2:737977559054:prod-checkin-service-scheduled-checkin-ready'
  );
}

main().catch(console.error);
