import console from 'console';
import Got from 'got';
import * as process from 'process';

/* eslint-disable max-len */
/**
 * Schedule a checkin based on a reservation.
 *
 * @example ```sh
 * npm run compile
 *
 * REGION=us-west-2 API_PREFIX=your_given_api_gateway_prefix AUTHORIZER_TOKEN=your_chosen_token node ./dist/scripts/lambda/schedule-checkin.js CONFIRMATION_NUMBER FIRST_NAME LAST_NAME
 * ```
 */
/* eslint-enable max-len */
async function main() {
  const result = await Got.put(
    `https://${process.env.API_PREFIX}.execute-api.${process.env.REGION}.amazonaws.com/prod/v1/checkin-service/checkin`,
    {
      headers: { token: process.env.AUTHORIZER_TOKEN },
      json: {
        data: {
          confirmation_number: process.argv[2],
          first_name: process.argv[3],
          last_name: process.argv[4]
        }
      }
    }
  ).json();

  console.log('result', JSON.stringify(result, null, 2));
}

main().catch(console.error);
