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

  const basicHeaders = await getHeadersWithRetry(
    () => SwClient.getBasicHeaders(), "basic headers", 10);
	  
  console.debug('basicHeaders', basicHeaders);
		
  const advancedHeaders = await getHeadersWithRetry(
    () => SwGenerateHeaders.generateHeaders(body.reservation), "advanced headers", 10);

  console.debug('advancedHeaders', advancedHeaders);

  const checkinDateTime = Luxon.DateTime.fromSeconds(body.checkin_available_epoch);

  // start trying to check in 5 seconds before checkin time
  const startTryingCheckinDateTime = checkinDateTime.minus({ seconds: 5 });

  const millisUntilTryingCheckin = startTryingCheckinDateTime.diffNow().toMillis();

  // this is the normal flow; we expect to have some extra time to wait
  if (millisUntilTryingCheckin > 0) {
    console.debug(
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

async function getHeadersWithRetry<HeaderType>(func: () => Promise<HeaderType>,
  headerName: string, maxRetries: int)
{
  const waitMs = util.promisify(setTimeout);
  while(true)
  {
    try{	
	  const headers = await func();
	  return headers;
    }
    catch(error){
	  if(maxRetries <= 0)
	    throw error;
	  console.debug(`Failed getting ${headerName}.  Retrying in 5s...\nException details: ${error}`)
	  await waitMs(5000);
	  maxRetries--;
    }
  }
}