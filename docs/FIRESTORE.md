# Firestore data model

## users/{uid}

```ts
{
  email: string;
  displayName?: string;
  countryCode?: string;       // display preference only
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## resumes/{resumeId}

```ts
{
  ownerId: string;
  originalFileName: string;
  storagePath: string;
  fileType: "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  uploadedAt: Timestamp;
  status: "uploaded" | "parsing" | "ready" | "analyzing" | "failed";
  parsedContent?: string;
  metadata: {
    fileSizeBytes: number;
    pageCount?: number;
    language?: string;
  };
}
```

## analyses/{analysisId}

```ts
{
  ownerId: string;
  resumeId: string;
  overallScore: number;
  categoryScores: { ats: number; content: number; structure: number; impact: number; clarity: number };
  summary: string;
  strengths: string[];
  criticalIssues: string[];
  recommendations: string[];
  sections: object;
  keywords: { present: string[]; missing: string[] };
  createdAt: Timestamp;
  model: { provider: "openai"; model: string; schemaVersion: string; analyzedAt: string };
}
```

## subscriptions/{subscriptionId}

Stores provider-neutral subscription state plus provider/customer/subscription identifiers.

## payments/{paymentId}

Stores normalized payment records. Provider payloads should be minimized and raw webhook bodies should not be retained unless legally/operationally necessary.

## usage/{usageId}

Recommended ID: `{ownerId}_{periodKey}`. Counters are incremented by trusted server code/transactions.

## webhookEvents/{provider_event_id}

Stores provider, provider event ID, received timestamp, processing status, and a short processing result. This supports idempotency and prevents double application of subscription/payment events.
