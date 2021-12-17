import console from 'console';
import process from 'process';
import * as Timezone from '../lib/timezones';

async function main() {
  const headers = await Timezone.fetchAirportTimezone(process.argv[2]);

  console.log(headers);
}

main().catch(console.error);
