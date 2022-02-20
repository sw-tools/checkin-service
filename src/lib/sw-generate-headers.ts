import chromium from 'chrome-aws-lambda';
import console from 'console';
import * as util from 'util';
import * as Reservation from './reservation';

/**
 * Based on https://github.com/byalextran/southwest-headers/blob/edd3d16d6b74640081cc8aab8f793b9873c28d1a/southwest-headers.py
 */
export async function generateHeaders(reservation: Reservation.Reservation) {
  const puppeteer = chromium.puppeteer;

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless
  });
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36'
  );

  const headers: Record<string, any> = {};

  page.on('requestfinished', request => {
    if (
      request
        .url()
        .startsWith(
          'https://mobile.southwest.com/api/mobile-air-operations/v1/mobile-air-operations/page/check-in'
        )
    ) {
      const allHeaders = request.headers();

      const regex = /x-api-key|x-user-experience-id|x-channel-id|^\w+?-\w$/i;

      headers['content-type'] = 'application/json';

      for (const header in allHeaders) {
        if (header.match(regex)) {
          headers[header] = allHeaders[header];
        }
      }
    }
  });

  page.on('request', request => {
    request.continue().catch(console.error);
  });

  await page.setRequestInterception(true);

  await page.goto('https://mobile.southwest.com/check-in');

  await page.waitForSelector("input[name='recordLocator']");

  await page.type("input[name='recordLocator']", reservation.confirmation_number);
  await page.type("input[name='firstName']", reservation.first_name);
  await page.type("input[name='lastName']", reservation.last_name);

  await page.click("button[type='submit']");

  const waitMs = util.promisify(setTimeout);

  // give time for network requests that will fetch the headers
  // TODO: we would prefer to use page.waitForNetworkIdle() here but can't get it working in Lambda
  await waitMs(10 * 1000);

  await browser.close();

  return headers;
}
