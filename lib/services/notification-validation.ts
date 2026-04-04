import {
  audience_type,
  notification_channel,
} from "@prisma/client";

export class NotificationCampaignValidationError extends Error {}

export const NOTIFICATION_CHANNEL_VALUES = Object.values(notification_channel);
export const NOTIFICATION_AUDIENCE_VALUES = Object.values(audience_type);

export type NotificationCampaignDraftInput = {
  title: unknown;
  channel: unknown;
  audience_type: unknown;
  sender_label: unknown;
  subject?: unknown;
  body: unknown;
  selected_contact_ids?: unknown;
};

export type NotificationCampaignDraftValidatedInput = {
  title: string;
  channel: notification_channel;
  audience_type: audience_type;
  sender_label: string;
  subject: string | null;
  body: string;
  selected_contact_ids: string[];
};

export type NotificationCampaignSendValidatedInput =
  NotificationCampaignDraftValidatedInput & {
    channel: "email";
    subject: string;
  };

export function validateNotificationCampaignDraftInput(
  input: NotificationCampaignDraftInput,
): NotificationCampaignDraftValidatedInput {
  return {
    title: parseRequiredText(input.title, "Title"),
    channel: parseNotificationChannel(input.channel),
    audience_type: parseAudienceType(input.audience_type),
    sender_label: parseRequiredText(input.sender_label, "Sender label"),
    subject: parseOptionalText(input.subject),
    body: parseRequiredText(input.body, "Body"),
    selected_contact_ids: parseIdentifierList(input.selected_contact_ids),
  };
}

export function validateNotificationCampaignReadyToSend(
  input: NotificationCampaignDraftValidatedInput,
): NotificationCampaignSendValidatedInput {
  if (input.channel !== "email") {
    throw new NotificationCampaignValidationError(
      "Only email sending is supported in Phase 7.",
    );
  }

  const subject = parseRequiredText(input.subject, "Subject");

  return {
    ...input,
    channel: "email",
    subject,
  };
}

export function parseNotificationChannel(value: unknown): notification_channel {
  return parseEnumValue(
    value,
    NOTIFICATION_CHANNEL_VALUES,
    "Channel",
  );
}

export function parseAudienceType(value: unknown): audience_type {
  return parseEnumValue(
    value,
    NOTIFICATION_AUDIENCE_VALUES,
    "Audience",
  );
}

function parseRequiredText(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new NotificationCampaignValidationError(`${fieldName} is required.`);
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    throw new NotificationCampaignValidationError(`${fieldName} is required.`);
  }

  return trimmedValue;
}

function parseOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

function parseIdentifierList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  const identifiers: string[] = [];

  for (const entry of values) {
    if (typeof entry !== "string") {
      continue;
    }

    const trimmedValue = entry.trim();

    if (trimmedValue.length === 0) {
      continue;
    }

    if (!identifiers.includes(trimmedValue)) {
      identifiers.push(trimmedValue);
    }
  }

  return identifiers;
}

function parseEnumValue<TValue extends string>(
  value: unknown,
  allowedValues: readonly TValue[],
  fieldName: string,
): TValue {
  if (typeof value !== "string") {
    throw new NotificationCampaignValidationError(`${fieldName} is required.`);
  }

  const trimmedValue = value.trim();

  if (!allowedValues.includes(trimmedValue as TValue)) {
    throw new NotificationCampaignValidationError(`${fieldName} is invalid.`);
  }

  return trimmedValue as TValue;
}
