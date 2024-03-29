import * as EventBridge from '@aws-sdk/client-eventbridge';
import * as Luxon from 'luxon';
import * as Uuid from 'uuid';
import { computeCrc32Hex } from './crc-utils';
import { Reservation } from './reservation';
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

/**
 * Find all rules that start with the trigger scheduled checkin prefix and the user's id.
 * Since a user can schedule checkins for other people, we don't check for the user's name.
 */
export function findRulesForUser(
  eventBridge: EventBridge.EventBridgeClient,
  triggerScheduledCheckinRulePrefix: string,
  userId: string,
  pageSize = 100
) {
  const prefix = `${composeUserPrefixForRule(triggerScheduledCheckinRulePrefix, userId)}`;
  const command = new EventBridge.ListRulesCommand({
    NamePrefix: prefix,
    Limit: pageSize
  });
  const cursor = new EventBridgeCursor<EventBridge.Rule>(eventBridge, command, 'Rules');
  const asyncIterable = { [Symbol.asyncIterator]: () => cursor };
  return asyncIterable;
}

export function findTargetsOfRule(
  eventBridge: EventBridge.EventBridgeClient,
  ruleName: string,
  pageSize = 100
) {
  const command = new EventBridge.ListTargetsByRuleCommand({
    Rule: ruleName,
    Limit: pageSize
  });
  const cursor = new EventBridgeCursor<EventBridge.Target>(eventBridge, command, 'Targets');
  const asyncIterable = { [Symbol.asyncIterator]: () => cursor };
  return asyncIterable;
}

class EventBridgeCursor<T> {
  private client: EventBridge.EventBridgeClient;
  private command: Parameters<EventBridge.EventBridgeClient['send']>[0];

  private nextToken: string | undefined;
  private hasNext: boolean | undefined;
  private property: string;

  constructor(
    client: EventBridge.EventBridgeClient,
    command: Parameters<EventBridge.EventBridgeClient['send']>[0],
    property: string
  ) {
    this.client = client;
    this.command = command;
    this.property = property;
  }

  public async next(): Promise<IteratorResult<T[]>> {
    // the first time this is called, _hasNext will be undefined, so we need to check for that and
    // allow the first call to proceed
    if (!this.hasNext && this.hasNext !== undefined) return { value: [], done: true };

    if (this.nextToken) {
      // @ts-ignore TODO: get the type of this.command set up correctly
      this.command.input.NextToken = this.nextToken;
    }

    const result = await this.client.send(this.command);

    // @ts-ignore TODO: get the type of this.command set up correctly
    if (result.NextToken) {
      this.hasNext = true;
      // @ts-ignore TODO: get the type of this.command set up correctly
      this.nextToken = result.NextToken;
    } else {
      this.hasNext = false;
      this.nextToken = undefined;
    }

    // @ts-ignore
    return { value: result[this.property], done: this.hasNext };
  }
}

export function composeRuleName(
  triggerScheduledCheckinRulePrefix: string,
  userId: string,
  reservation: Reservation,
  checkinAvailableDate: Date
) {
  const checkinAvailableDateTime = Luxon.DateTime.fromJSDate(checkinAvailableDate);
  const crc = computeCrc32Hex(
    `${reservation.first_name}-${reservation.last_name}-${
      reservation.confirmation_number
    }-${Math.floor(checkinAvailableDateTime.toSeconds())}`
  );
  return `${composeUserPrefixForRule(triggerScheduledCheckinRulePrefix, userId)}-${crc}`;
}

function composeUserPrefixForRule(triggerScheduledCheckinRulePrefix: string, userId: string) {
  return `${triggerScheduledCheckinRulePrefix}${userId}`;
}
