import * as OpenflightsClient from '../lib/openflights-client';

export async function fetchAirportTimezone(airportCode: string) {
  const airport = await OpenflightsClient.getAirport(airportCode);

  return airport.airports[0].tz_id;
}
