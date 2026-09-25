# Gemini IDX Pro — Complete Clone Package

Paket ini adalah **functional clone configuration** untuk memindahkan perilaku Analisa Teknikal IDX Pro ke Gemini tanpa menyalin instruksi platform internal.

## Isi paket

- `SYSTEM_INSTRUCTION_GEMINI.md`  
  Prompt utama versi penuh.

- `SYSTEM_INSTRUCTION_COMPACT.md`  
  Versi pendek jika surface Gemini Anda memiliki limit lebih ketat.

- `gemini_function_declarations.json`  
  26 function declarations untuk EOD/IHSG, MaxScreener, Bandarmology, dan Broksum.

- `state_schema.json`  
  JSON Schema state/carry-over.

- `state_default.json`  
  Initial state.

- `knowledge_manifest.json`  
  Urutan upload Knowledge Base dan conflict rules.

- `regression_tests.json`  
  26 test cases untuk memastikan routing, state, failure handling, dan anti-hallucination.

- `implementation/BACKEND_ADAPTER_CONTRACT.md`  
  Kontrak adapter antara Gemini function calling dan API MAXLONG Anda.

- `implementation/gemini_agent_skeleton.py`  
  Skeleton Interactions API + function calling loop.

- `knowledge/`  
  Salinan knowledge/reference yang tersedia dari GPT sumber.

## Recommended architecture

```text
User
  |
  v
Gemini Interactions API
  |  system_instruction
  |  tools/function declarations
  |  previous_interaction_id
  v
Function call(s)
  |
  v
MAXLONG Adapter / Your Backend
  |
  +--> EOD/IHSG
  +--> MaxScreener
  +--> Bandarmology
  +--> Broksum
  |
  v
function_result
  |
  v
Gemini final analysis
```

## Installation path

### Option A — Gemini API / custom app (recommended)
Use:
- full system instruction,
- all function declarations,
- external session state,
- adapter to your existing API,
- uploaded/reference KB as needed.

This is the closest match to the original GPT because dynamic market data requires function calling.

### Option B — Gemini Gem / AI Studio without backend tools
You can upload:
- System Instruction,
- Knowledge files.

But it will NOT be a full clone: it cannot reliably execute MAXLONG endpoints unless your selected Gemini surface supports custom function tools or an external agent runtime.

## Function calling
The package follows the current Gemini declaration shape:
- `type: "function"`
- `name`
- `description`
- `parameters` as JSON schema.

The app executes functions and sends `function_result` back to the model. Use the current Google Gemini SDK/Interactions API in production.

## State
Do not rely only on prompt memory.
Persist `state_schema.json` server-side and also use `previous_interaction_id`.

## EOD file_url
The model must request upstream EOD/IHSG using `format=file_url`.
Your adapter may resolve the returned signed CSV and attach its content to Gemini for analysis.
That is backend plumbing, not a model-side market-data fetch.

## Ownership route
The historical router KB mentions an Ownership route, but the supplied active function set has no dedicated ownership endpoint. This package does not invent one. Add it only after you have a real ownership data API and function schema.

## PNG
Use code execution/plotting only after market data exists.
Do not use generative image tools for technical charts.
The four `DESIGN_REF_PNG_FASE*.py` files are style/layout references only.

## Regression
Run `regression_tests.json` before deployment and whenever:
- System Instruction changes,
- tool schema changes,
- MaxScreener logic changes,
- Bandarmology Factor Stack changes.

## Production checklist
1. Put `SYSTEM_INSTRUCTION_GEMINI.md` in system_instruction.
2. Register `gemini_function_declarations.json`.
3. Implement `execute_maxlong_tool`.
4. Normalize tool responses.
5. Resolve file_url CSV server-side and provide it to Gemini.
6. Persist state.
7. Upload/reference KB.
8. Disable market-data web fallback.
9. Run all regression tests.
10. Validate with 3 real tickers + IHSG before production.
