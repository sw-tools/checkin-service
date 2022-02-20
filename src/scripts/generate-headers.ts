import assert from 'assert';
import console from 'console';
import * as process from 'process';
import * as Reservation from '../lib/reservation';
import * as SwGenerateHeaders from '../lib/sw-generate-headers';

async function main() {
  assert(process.argv.length === 5, 'Invalid parameters');
  const reservation: Reservation.Reservation = {
    confirmation_number: process.argv[2],
    first_name: process.argv[3],
    last_name: process.argv[4]
  };

  const headers = await SwGenerateHeaders.generateHeaders(reservation);

  console.log(headers);
}

main().catch(console.error);
