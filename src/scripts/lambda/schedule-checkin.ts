import console from 'console';
import Got from 'got';
import * as process from 'process';

/**
 * Schedule a checkin based on a reservation.
 *
 * @example ```sh
 * npm run compile
 * REGION=us-west-2 API_PREFIX=a12345bcd6 AUTHORIZER_TOKEN=your_chosen_token
 * ./dist/scripts/lambda/schedule-checkin.ts
 * ```
 */
async function main() {
  try {
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
    );

    console.debug(result.body);
    console.log('success');
  } catch (error) {
    console.error(error.response?.body);
  }
}

main().catch(console.error);
