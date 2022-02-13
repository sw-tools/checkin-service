import * as EventBridge from '@aws-sdk/client-eventbridge';
import * as Queue from '../lib/scheduled-checkin-ready-queue';

export function putRule(
  eventBridge: EventBridge.EventBridgeClient,
  ruleName: string,
  cronExpression: string
) {
  const putRuleCommand = new EventBridge.PutRuleCommand({
    Name: ruleName,
    ScheduleExpression: `cron(${cronExpression})`
  });

  return eventBridge.send(putRuleCommand);
}

export function putTarget(
  eventBridge: EventBridge.EventBridgeClient,
  ruleName: string,
  targetId: string,
  detail: Queue.Message,
  targetArn: string
) {
  const putTargetsCommand = new EventBridge.PutTargetsCommand({
    Rule: ruleName,
    Targets: [
      {
        Id: targetId,
        Arn: targetArn,
        Input: JSON.stringify(detail)
      }
    ]
  });

  return eventBridge.send(putTargetsCommand);
}
