import console from 'console';
import * as process from 'process';
import * as Reservation from '../lib/reservation';
import * as SwClient from '../lib/sw-client';

async function main() {
  const reservation: Reservation.Reservation = {
    confirmationNumber: process.argv[2],
    firstName: process.argv[3],
    lastName: process.argv[4]
  };

  const details = await SwClient.getReservation(reservation);

  console.log(details);
}

main().catch(console.error);
