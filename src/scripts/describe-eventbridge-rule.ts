import * as EventBridge from '@aws-sdk/client-eventbridge';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import console from 'console';
import { doesRuleExist } from '../lib/eventbridge-checkin-rules';

async function main() {
  const eventBridge = new EventBridge.EventBridge({
    region: 'us-west-2',
    credentials: fromIni({ profile: 'sw-tools' })
  });

  const result = await doesRuleExist(
    eventBridge,
    'trigger-scheduled-checkin-CONFNUM-FIRSTNAME-LASTNAME-1647915900'
  );

  console.log(result);
}

main().catch(console.error);
