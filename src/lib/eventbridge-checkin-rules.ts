import * as EventBridge from '@aws-sdk/client-eventbridge';
import * as Uuid from 'uuid';
import * as Queue from './scheduled-checkin-ready-queue';

export interface PutRuleInput {
  eventBridge: EventBridge.EventBridgeClient;
  ruleName: string;
  cronExpression: string;
}

export function putRule(input: PutRuleInput) {
  const putRuleCommand = new EventBridge.PutRuleCommand({
    Name: input.ruleName,
    ScheduleExpression: `cron(${input.cronExpression})`
  });

  return input.eventBridge.send(putRuleCommand);
}

export interface PutTargetInput {
  eventBridge: EventBridge.EventBridgeClient;
  ruleName: string;
  message: Queue.Message;
  targetArn: string;
}

export function putTarget(input: PutTargetInput) {
  const putTargetsCommand = new EventBridge.PutTargetsCommand({
    Rule: input.ruleName,
    Targets: [
      {
        Id: Uuid.v4(),
        Arn: input.targetArn,
        Input: JSON.stringify(input.message)
      }
    ]
  });

  return input.eventBridge.send(putTargetsCommand);
}

export async function doesRuleExist(eventBridge: EventBridge.EventBridgeClient, ruleName: string) {
  const getRuleCommand = new EventBridge.DescribeRuleCommand({
    Name: ruleName
  });

  try {
    await eventBridge.send(getRuleCommand);
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }

  return true;
}

export function findRulesForUser(
  eventBridge: EventBridge.EventBridgeClient,
  confirmationNumber: string,
  firstName: string,
  lastName: string
) {
  const cursor = new FindRulesForUserCursor(eventBridge, confirmationNumber, firstName, lastName);
  return cursor;
}

class FindRulesForUserCursor {
  private client: EventBridge.EventBridgeClient;
  private confirmationNumber: string;
  private firstName: string;
  private lastName: string;

  private nextToken: string | undefined;
  private _hasNext: boolean;

  constructor(
    client: EventBridge.EventBridgeClient,
    confirmationNumber: string,
    firstName: string,
    lastName: string
  ) {
    this.client = client;
    this.confirmationNumber = confirmationNumber;
    this.firstName = firstName;
    this.lastName = lastName;

    this._hasNext = true;
  }

  public hasNext() {
    return this._hasNext;
  }

  public async next() {
    if (!this.hasNext()) return [];

    const getRuleCommand = new EventBridge.ListRulesCommand({
      NamePrefix: `trigger-scheduled-checkin-${this.confirmationNumber}-${this.firstName}-${this.lastName}-`,
      Limit: 100
    });
    if (this.nextToken) {
      getRuleCommand.input.NextToken = this.nextToken;
    }

    const result = await this.client.send(getRuleCommand);

    if (result.NextToken) {
      this._hasNext = true;
      this.nextToken = result.NextToken;
    } else {
      this._hasNext = false;
      this.nextToken = undefined;
    }

    return result.Rules;
  }
}
