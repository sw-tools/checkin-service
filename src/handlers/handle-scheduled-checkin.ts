import * as Sqs from '@aws-sdk/client-sqs';
import assert from 'assert';
import console from 'console';
import * as Got from 'got';
import * as Luxon from 'luxon';
import process from 'process';
import * as util from 'util';
import * as CheckIn from '../lib/check-in';
import * as Queue from '../lib/scheduled-checkin-ready-queue';
import * as SwClient from '../lib/sw-client';
import * as SwGenerateHeaders from '../lib/sw-generate-headers';

/**
 * Check the user into a single flight.
 */
export async function handle(event: AWSLambda.SQSEvent) {
  try {
    await handleInternal(event);
  } catch (error) {
    console.error(error);

    // allow sending to dlq immediately
    await adjustMessageVisibilityTimeout({
      queueUrl: process.env.SCHEDULED_CHECKIN_READY_QUEUE_URL,
      receiptHandle: event.Records[0].receiptHandle,
      visibilityTimeout: 0
    });

    // send to dlq
    throw error;
  }
}

async function handleInternal(event: AWSLambda.SQSEvent) {
  const body = JSON.parse(event.Records[0].body);

  console.log('Received SQS message', util.inspect(body, { depth: null }));

  // TODO: is the message nested within the EventBridge message that triggered this message?
  assert(Queue.isMessage(body), 'Invalid message');

  const basicHeaders = await SwClient.getBasicHeaders();
  const advancedHeaders = await SwGenerateHeaders.generateHeaders(body.reservation);

  const checkinDateTime = Luxon.DateTime.fromSeconds(body.checkin_available_epoch);

  // start trying to check in 5 seconds before checkin time
  const startTryingCheckinDateTime = checkinDateTime.minus({ seconds: 5 });

  const millisUntilTryingCheckin = startTryingCheckinDateTime.diffNow().toMillis();

  // this is the normal flow; we expect to have some extra time to wait
  if (millisUntilTryingCheckin > 0) {
    console.log(
      'Waiting %d seconds before checking in',
      Math.floor(millisUntilTryingCheckin / 1000)
    );

    const waitMs = util.promisify(setTimeout);

    await waitMs(millisUntilTryingCheckin);
  }

  console.log(
    'Starting fetch checkin data attempts at',
    Luxon.DateTime.now().toLocaleString(Luxon.DateTime.DATETIME_FULL_WITH_SECONDS)
  );

  // Retrieve data necessary to perform the checkin. This is where we really pound the API. After
  // we get a response indicating that the checkin is ready, it's smooth sailing to actually
  // perform the checkin.
  let data;
  try {
    data = await CheckIn.makeFetchCheckinDataAttempts({
      reservation: body.reservation,
      headers: basicHeaders,
      attemptLimit: 80,
      millisPerRequest: 250,
      logger: console
    });
  } catch (error) {
    if (error instanceof Got.HTTPError) {
      const dataFailure = <Got.Response<CheckIn.CheckinFailedResponse>>error.response;
      throw new Error(`Failed to fetch checkin data: ${dataFailure}`);
    } else {
      throw error;
    }
  }

  console.log(
    'Checking in at',
    Luxon.DateTime.now().toLocaleString(Luxon.DateTime.DATETIME_FULL_WITH_SECONDS)
  );

  // Perform the checkin. Since we've already gotten a response indicating that the checkin is
  // ready, we only need to make one request.
  const result = await SwClient.loadJsonPage<CheckIn.CheckinSuccessfulResponse>({
    url: `${SwClient.getBaseUrl()}/mobile-air-operations${data['_links'].checkIn.href}`,
    json: data['_links'].checkIn.body,
    method: SwClient.Method.POST,
    headers: advancedHeaders
  });

  console.log('Checkin succeeded', JSON.stringify(result, null, 2));
}

interface AdjustMessageVisibilityTimeoutInput {
  queueUrl: string;
  receiptHandle: string;
  visibilityTimeout: number;
}

function adjustMessageVisibilityTimeout(input: AdjustMessageVisibilityTimeoutInput) {
  const client = new Sqs.SQSClient({});

  const command = new Sqs.ChangeMessageVisibilityCommand({
    QueueUrl: input.queueUrl,
    ReceiptHandle: input.receiptHandle,
    VisibilityTimeout: input.visibilityTimeout
  });

  return client.send(command);
}
