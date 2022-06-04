import * as EventBridge from '@aws-sdk/client-eventbridge';
import * as Uuid from 'uuid';
import * as Queue from '../lib/scheduled-checkin-ready-queue';

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
