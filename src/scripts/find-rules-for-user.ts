import * as EventBridge from '@aws-sdk/client-eventbridge';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import console from 'console';
import { findRulesForUser } from '../lib/eventbridge-checkin-rules';

async function main() {
  const eventBridge = new EventBridge.EventBridge({
    region: 'us-west-2',
    credentials: fromIni({ profile: 'sw-tools' })
  });

  const rulesIterator = findRulesForUser(eventBridge, 'trigger-checkin-', 'asdf');

  const results = [];
  for await (const rules of rulesIterator) {
    results.push(...rules);
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
