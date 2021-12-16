import AWSLambda from 'aws-lambda';
import console from 'console';
import * as process from 'process';

export async function handle(event: AWSLambda.APIGatewayRequestAuthorizerEvent) {
  let result: AWSLambda.CustomAuthorizerResult;

  try {
    result = await handleInternal(event);
  } catch (error) {
    console.error(error);
    result = getUnauthorizedResult();
  }

  console.log('output principalId:', result.principalId);

  return result;
}

async function handleInternal(event: AWSLambda.APIGatewayRequestAuthorizerEvent) {
  const token = process.env.AUTHORIZER_TOKEN;

  if (event.headers.token !== token) {
    return getUnauthorizedResult();
  }

  const result: AWSLambda.CustomAuthorizerResult = {
    principalId: 'random239tg23t35tas464',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn
        }
      ]
    },
    context: {}
  };

  return result;
}

function getUnauthorizedResult() {
  const result: AWSLambda.CustomAuthorizerResult = {
    principalId: 'Unauthorized',
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: '*',
          Effect: 'Deny',
          Resource: '*'
        }
      ]
    }
  };

  return result;
}
