export type FirmicEventPayload = unknown;

export type FirmicEventMetadata = {
  source?: string;
  workspaceId?: string;
  userId?: string;
  correlationId?: string;
  causationId?: string;
  tags?: string[];
};

export type FirmicEvent<TPayload = FirmicEventPayload> = {
  id: string;
  type: string;
  payload: TPayload;
  occurredAt: string;
  metadata: FirmicEventMetadata;
};

export type PublishEventInput<TPayload = FirmicEventPayload> = {
  type: string;
  payload: TPayload;
  metadata?: FirmicEventMetadata;
};

export type FirmicEventHandler<TPayload = FirmicEventPayload> = (
  event: FirmicEvent<TPayload>,
) => void | Promise<void>;

export type FirmicEventSubscription = () => void;

export type FirmicEventFailure = {
  eventId: string;
  eventType: string;
  message: string;
};

export type PublishEventResult<TPayload = FirmicEventPayload> = {
  event: FirmicEvent<TPayload>;
  delivered: number;
  failures: FirmicEventFailure[];
};

export type EventHistoryFilter = {
  type?: string;
  source?: string;
  workspaceId?: string;
  correlationId?: string;
  limit?: number;
};
