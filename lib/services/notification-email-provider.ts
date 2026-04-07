export class NotificationEmailProviderConfigurationError extends Error {}
export class NotificationEmailSendError extends Error {}

export type NotificationEmailSendRequest = {
  sender_label: string;
  destination: string;
  subject: string;
  body: string;
};

export type NotificationEmailSendResult = {
  provider_message_id: string | null;
};

export interface NotificationEmailProvider {
  sendEmail(
    request: NotificationEmailSendRequest,
  ): Promise<NotificationEmailSendResult>;
}

export type NotificationEmailProviderBehavior = (
  request: NotificationEmailSendRequest,
) => Promise<NotificationEmailSendResult>;

export class FakeNotificationEmailProvider
  implements NotificationEmailProvider
{
  constructor(
    private readonly behavior: NotificationEmailProviderBehavior = async () => ({
      provider_message_id: "fake-message-id",
    }),
  ) {}

  async sendEmail(
    request: NotificationEmailSendRequest,
  ): Promise<NotificationEmailSendResult> {
    return this.behavior(request);
  }
}

export class ResendNotificationEmailProvider
  implements NotificationEmailProvider
{
  constructor(
    private readonly options: {
      apiKey: string;
      fromEmail: string;
      fetchImplementation?: typeof fetch;
      apiBaseUrl?: string;
    },
  ) {}

  async sendEmail(
    request: NotificationEmailSendRequest,
  ): Promise<NotificationEmailSendResult> {
    const fetchImplementation = this.options.fetchImplementation ?? fetch;
    const response = await fetchImplementation(
      `${this.options.apiBaseUrl ?? "https://api.resend.com"}/emails`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: formatFromAddress(request.sender_label, this.options.fromEmail),
          to: [request.destination],
          subject: request.subject,
          text: request.body,
        }),
      },
    );

    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      throw new NotificationEmailSendError(
        extractProviderErrorMessage(responseBody) ??
          `Email provider request failed with status ${response.status}.`,
      );
    }

    return {
      provider_message_id:
        responseBody &&
        typeof responseBody === "object" &&
        "id" in responseBody &&
        typeof responseBody.id === "string"
          ? responseBody.id
          : null,
    };
  }
}

export function createNotificationEmailProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  fetchImplementation?: typeof fetch,
): NotificationEmailProvider {
  const apiKey = env.RESEND_API_KEY?.trim();
  const fromEmail = env.NOTIFICATION_FROM_EMAIL?.trim();

  if (!apiKey) {
    throw new NotificationEmailProviderConfigurationError(
      "RESEND_API_KEY must be configured before sending notification emails.",
    );
  }

  if (!fromEmail) {
    throw new NotificationEmailProviderConfigurationError(
      "NOTIFICATION_FROM_EMAIL must be configured before sending notification emails.",
    );
  }

  return new ResendNotificationEmailProvider({
    apiKey,
    fromEmail,
    fetchImplementation,
    apiBaseUrl: env.RESEND_API_BASE_URL?.trim() || undefined,
  });
}

function formatFromAddress(senderLabel: string, fromEmail: string): string {
  return `${senderLabel} <${fromEmail}>`;
}

function extractProviderErrorMessage(responseBody: unknown): string | null {
  if (
    responseBody &&
    typeof responseBody === "object" &&
    "message" in responseBody &&
    typeof responseBody.message === "string"
  ) {
    return responseBody.message;
  }

  if (
    responseBody &&
    typeof responseBody === "object" &&
    "error" in responseBody &&
    typeof responseBody.error === "string"
  ) {
    return responseBody.error;
  }

  return null;
}
