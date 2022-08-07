import * as EventBridge from '@aws-sdk/client-eventbridge';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import console from 'console';
import { findTargetsOfRule } from '../lib/eventbridge-checkin-rules';

async function main() {
  const eventBridge = new EventBridge.EventBridge({
    region: 'us-west-2',
    credentials: fromIni({ profile: 'sw-tools' })
  });

  const rulesIterator = findTargetsOfRule(
    eventBridge,
    'trigger-checkin-2EPRPW-Matthew-Dean-1654685700'
  );

  const results = [];
  for await (const rules of rulesIterator) {
    results.push(...rules);
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
