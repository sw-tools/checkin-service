import Got from 'got';

export async function getAirport(airportCode: string) {
  const request = {
    iata: airportCode,
    country: 'ALL',
    db: 'airports',
    iatafilter: 'true',
    action: 'SEARCH',
    offset: '0'
  };

  type Response = {
    airports: {
      tz_id: string;
    }[];
  };

  const result = await Got.post('https://openflights.org/php/apsearch.php', { form: request });

  const airport = JSON.parse(result.body);

  return <Response>airport;
}
