import console from 'console';
import * as process from 'process';
import * as CheckIn from '../lib/check-in';
import * as Reservation from '../lib/reservation';
import * as SwGenerateHeaders from '../lib/sw-generate-headers';

async function main() {
  const reservation: Reservation.Reservation = {
    confirmationNumber: process.argv[2],
    firstName: process.argv[3],
    lastName: process.argv[4]
  };

  const advancedHeaders = await SwGenerateHeaders.generateHeaders(reservation);

  return CheckIn.checkIn(reservation, 0.25, 1, advancedHeaders, console);
}

main().catch(console.error);
