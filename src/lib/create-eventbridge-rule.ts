import * as EventBridge from '@aws-sdk/client-eventbridge';
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
  targetId: string;
  message: Queue.Message;
  targetArn: string;
}

export function putTarget(input: PutTargetInput) {
  const putTargetsCommand = new EventBridge.PutTargetsCommand({
    Rule: input.ruleName,
    Targets: [
      {
        Id: input.targetId,
        Arn: input.targetArn,
        Input: JSON.stringify(input.message)
      }
    ]
  });

  return input.eventBridge.send(putTargetsCommand);
}
