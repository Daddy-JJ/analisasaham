# DEPLOYMENT CHECKLIST

## System
- [ ] Full System Instruction installed.
- [ ] Model name configured via environment variable, not hard-coded.
- [ ] Gemini API key server-side only.

## Tools
- [ ] 26 function declarations registered.
- [ ] Every function maps to a real MAXLONG handler.
- [ ] No invented endpoint URL/path.
- [ ] Argument validation enabled.
- [ ] Tool errors returned as structured JSON.

## EOD
- [ ] getEodHistory requests file_url for analysis.
- [ ] getIhsgHistory requests file_url for analysis.
- [ ] file_url failure falls back only to csv.
- [ ] EOD/IHSG never fall back to json.
- [ ] latest_available_date captured.

## State
- [ ] External session state persists.
- [ ] previous_interaction_id stored.
- [ ] ticker/phase/mode/lookback/style/risk carry over.
- [ ] new ticker resets conflicting analysis state.
- [ ] render approval state is explicit.

## Knowledge
- [ ] Router KB uploaded.
- [ ] EOD hard-rule KB uploaded.
- [ ] EW workflow KB uploaded.
- [ ] MaxScreener KB uploaded.
- [ ] Bandarmology V22.6 uploaded.
- [ ] PNG QA KB uploaded.
- [ ] Frost & Prechter uploaded.
- [ ] MaX V7.30 source uploaded or otherwise accessible.
- [ ] Design scripts marked reference-only.

## Safety / Quality
- [ ] No market-number hallucination.
- [ ] No broker code treated as guaranteed beneficial owner.
- [ ] No EW certainty language.
- [ ] No one-factor Bandarmology conclusion.
- [ ] No image generation for technical charts.
- [ ] PNG requires approval.
- [ ] Visual QA implemented.

## Regression
- [ ] T01–T26 pass.
- [ ] Test at least 3 saham tickers.
- [ ] Test IHSG phase boundary.
- [ ] Test MaxScreener missing weight.
- [ ] Test EOD file_url failure.
- [ ] Test Bandarmology mixed signals.
