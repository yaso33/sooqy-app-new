import React from "react";
import { Sentry } from "../utils/sentry";

export const AppErrorBoundary = Sentry.ErrorBoundary;

export const ErrorFallback = () => (
  <div
    role="alert"
    style={{
      display: "flex",
      minHeight: "100dvh",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      background: "#F8FAFC",
      fontFamily: "inherit",
      textAlign: "center",
    }}
  >
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
        حدث خطأ غير متوقع
      </h1>
      <p style={{ fontSize: 14, color: "#64748B", margin: 0 }}>
        أعد فتح التطبيق. إذا تكررت المشكلة، أرسل لنا التفاصيل من سجل التشخيص.
      </p>
    </div>
  </div>
);