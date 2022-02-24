import * as EventBridge from '@aws-sdk/client-eventbridge';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import console from 'console';
import { doesRuleExist } from '../lib/create-eventbridge-rule';

async function main() {
  const result = await doesRuleExist({
    eventBridge: new EventBridge.EventBridge({
      region: 'us-west-2',
      credentials: fromIni({ profile: 'sw-tools' })
    }),
    ruleName: 'trigger-scheduled-checkin-CONFNUM-FIRSTNAME-LASTNAME-1647915900'
  });

  console.log(result);
}

main().catch(console.error);
