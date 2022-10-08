import console from 'console';
import process from 'process';
import { AirportCode, getAirportTimezone } from '../lib/timezones';

async function main() {
  const headers = await getAirportTimezone(process.argv[2] as AirportCode);

  console.log(headers);
}

main().catch(console.error);
