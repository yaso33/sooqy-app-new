import * as Sentry from "@sentry/react";

const sentryDsn = import.meta.env["VITE_SENTRY_DSN"] as string | undefined;

Sentry.init({
  dsn: sentryDsn || undefined,
  environment: import.meta.env.MODE,

  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
      delete event.request.data;
    }

    return event;
  },
});

export { Sentry };