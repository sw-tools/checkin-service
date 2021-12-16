import * as OpenflightsClient from '../lib/openflights-client';

export async function fetchAirportTimezone(airportCode: string) {
  const airport = await OpenflightsClient.getAirport(airportCode);

  // TODO: validate that this comes back in a good format, like America/Los_Angeles
  return airport.airports[0].tz_id;
}
