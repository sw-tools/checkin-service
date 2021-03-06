# Checkin Service

Allows a user to schedule a checkin based on their flight reservation, then invokes a function just before the checkin time and checks the user in.

Can be considered in a beta stage; should be monitored. If you absolutely need a really good seat on a particular flight, please babysit it and be ready to check in manually.

PR and Issue contributions are welcome.

Uses airline's API in an unsupported manner. Use at your own risk.

## Deploying

1. [Set up an AWS profile on your computer](https://docs.aws.amazon.com/toolkit-for-visual-studio/latest/user-guide/keys-profiles-credentials.html#adding-a-profile-to-the-aws-credentials-profile-file) called 'sw-tools'

1. Add Chromium/Puppeteer Lambda layer:

   - Build `chrome_aws_lambda.zip`: https://github.com/alixaxel/chrome-aws-lambda#aws-lambda-layer
   - Copy `chrome_aws_lambda.zip` to `layers/chrome_aws_lambda.zip`

1. Deploy service to AWS (ensure you've got your AWS credentials configured first)

   ```sh
   AUTHORIZER_TOKEN=your_chosen_token npm run deploy
   ```

## Scheduling a Checkin

- With a script: [src/scripts/lambda/schedule-checkin.ts](src/scripts/lambda/schedule-checkin.ts), or

- Example frontend: https://github.com/sw-tools/checkin-service-frontend

## Attributions

- Most of the code is essentially a translation of https://github.com/pyro2927/SouthwestCheckin from Python to TypeScript
- Getting the required checkin headers is essentially a translation of https://github.com/byalextran/southwest-headers/blob/main/southwest-headers.py from Python/Selenium to TypeScript/Puppeteer

## TODO

- Use something like dotenv to read authorization token so that user does not have to add it to their environment manually
- After checkin remove the associated eventBridge rule and eventBridge trigger
- Try a publicly maintained Lambda layer for Puppeteer/Chromium (e.g. https://github.com/shelfio/chrome-aws-lambda-layer)
- Use Serverless V3
