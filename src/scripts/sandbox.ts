import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import console from 'console';

export default async () => {
  console.debug('-+'.replace(/-/g, 'minus').replace(/\+/g, 'plus'));

  const client = new DynamoDB({
    credentials: {
      accessKeyId: '',
      secretAccessKey: ''
    }
  });
  const ddbDocClient = DynamoDBDocument.from(client);

  const result = await ddbDocClient.query({
    TableName: 'test',
    IndexName: '',
    KeyConditionExpression: '#id = :id',
    ExpressionAttributeNames: {
      '#id': 'id'
    },
    ExpressionAttributeValues: {
      ':id': ''
    }
  });

  const items = result.Items as { something: string }[];

  for (const item of items) {
    console.debug(item.something);
  }
};
