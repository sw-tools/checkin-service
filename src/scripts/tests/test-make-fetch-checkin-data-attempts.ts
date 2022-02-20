import assert from 'assert';
import console from 'console';
import process from 'process';
import * as CheckIn from '../../lib/check-in';
import { Reservation } from '../../lib/reservation';
import * as SwClient from '../../lib/sw-client';

async function main() {
  assert(process.argv.length === 5, 'Invalid parameters');
  const reservation: Reservation = {
    confirmation_number: process.argv[2],
    first_name: process.argv[3],
    last_name: process.argv[4]
  };

  const basicHeaders = await SwClient.getBasicHeaders();

  await CheckIn.makeFetchCheckinDataAttempts(reservation, basicHeaders, console);
}

main().catch(console.error);
