# BACKEND ADAPTER CONTRACT

## Why this layer is required
Gemini function calling selects a function and produces arguments. Your application/backend executes the function and returns the function result to Gemini. Do not put API keys or private base URLs in the System Instruction.

## Recommended flow
1. User message -> Gemini Interactions API with:
   - system_instruction
   - tools from `gemini_function_declarations.json`
   - prior `previous_interaction_id` when available.
2. Gemini emits `function_call`.
3. Backend validates args against tool schema.
4. Backend calls the existing MAXLONG endpoint.
5. Backend normalizes response.
6. Send a `function_result` back using the function call's `call_id` and `previous_interaction_id`.
7. Repeat until model produces final text.

## Response envelope
For JSON tool response:
```json
{
  "ok": true,
  "function": "getBroksumTickerInsight",
  "format": "json",
  "data": {}
}
```

For upstream `format=file_url`:
```json
{
  "ok": true,
  "function": "getEodHistory",
  "format": "file_url",
  "downloadUrl": "SIGNED_OR_INTERNAL_URL",
  "mimeType": "text/csv",
  "filename": "BBCA_eod.csv",
  "latestAvailableDate": "YYYY-MM-DD"
}
```

## Critical file_url note
The upstream request MUST remain `format=file_url` to preserve the IDX Pro contract.

However, Gemini cannot analyze a private signed URL unless your application makes the file content available to the model. The adapter should therefore do one of these:

A. Preferred:
- backend resolves/downloads the signed CSV,
- sends the CSV content (or an uploaded Gemini File reference) as part of the tool result / next interaction,
- also preserves metadata that it originated from `format=file_url`.

B. If the URL is publicly fetchable and your Gemini runtime supports URL/file context:
- attach the file through the supported file mechanism,
- do not tell the model to replace it with web search.

This backend retrieval is tool plumbing, not "Python market-data fetching" by the analysis model.

## Error envelope
```json
{
  "ok": false,
  "function": "getEodHistory",
  "errorCode": "UPSTREAM_ERROR",
  "message": "Human-readable error",
  "retryable": true
}
```

System behavior:
- EOD/IHSG file_url error -> retry same function with format=csv.
- Never retry EOD/IHSG with format=json.
- Other long-data endpoints may fallback file_url -> csv when appropriate.
- Never fabricate missing values.

## State persistence
Store `state_schema.json` in your own session store keyed by user/session.
Use Gemini `previous_interaction_id` for conversational continuity, but keep business state externally too, so ticker/phase/status survives model/runtime changes.

## Security
- Keep MAXLONG API key server-side.
- Keep Gemini API key server-side.
- Never expose signed URLs in logs longer than necessary.
- Validate ticker, date, enums, limit/topN bounds before upstream calls.
- Add timeout, retry policy, and structured errors.
