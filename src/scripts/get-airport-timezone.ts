import console from 'console';
import * as Timezone from '../lib/timezones';

async function main() {
  const headers = await Timezone.fetchAirportTimezone('DEN');

  console.log(headers);
}

main().catch(console.error);
