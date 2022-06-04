import * as EventBridge from '@aws-sdk/client-eventbridge';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import console from 'console';
import { findRulesForUser } from '../lib/eventbridge-checkin-rules-new';

async function main() {
  const eventBridge = new EventBridge.EventBridge({
    region: 'us-west-2',
    credentials: fromIni({ profile: 'sw-tools' })
  });

  const cursor = findRulesForUser(eventBridge, '2EPRPW', 'Matthew', 'Dean');

  const results = [];
  do {
    const pageOfResults = await cursor.next();
    results.push(...pageOfResults);
  } while (cursor.hasNext());

  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
