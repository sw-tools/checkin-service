import console from 'console';
import Got from 'got';
import * as Luxon from 'luxon';
import * as process from 'process';

/**
 * Schedule a checkin based on a reservation.
 *
 * @example ```sh
 * npm run compile
 * REGION=us-west-2 API_PREFIX=a12345bcd6 AUTHORIZER_TOKEN=your_chosen_token
 * node ./dist/scripts/lambda/schedule-checkin.ts CONFIRMATION_NUMBER FIRST_NAME LAST_NAME
 * ```
 */
async function main() {
  try {
    const result = await Got.put<ResponseBody>(
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

    const checkinAvailable = Luxon.DateTime.fromSeconds(
      result.body.data.checkin_available_epoch
    ).toLocaleString(Luxon.DateTime.DATETIME_FULL_WITH_SECONDS);

    const checkinBoot = Luxon.DateTime.fromSeconds(
      result.body.data.checkin_boot_epoch
    ).toLocaleString(Luxon.DateTime.DATETIME_FULL_WITH_SECONDS);

    console.log(
      'Will boot at %s to get ready to attempt checkin. Your checkin is available at',
      checkinBoot,
      checkinAvailable
    );
  } catch (error) {
    console.error(error.response?.body);
  }
}

interface ResponseBody {
  data: {
    checkin_available_epoch: number;
    checkin_boot_epoch: number;
  };
}

main().catch(console.error);
