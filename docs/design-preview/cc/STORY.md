# Agent serving video: one task, then concurrent agents

`story.html` is a roughly 49-second candidate for the Claude Code part of the
demo. The original session replay, with all waiting intervals, stays in
`session.html`. `?film=1` gives the video frame without playback controls;
`?t=12` pauses at a chosen video second. `storyDemo.seek(seconds)` is available
for deterministic capture.

The paired screen layout follows the existing computer-use video: Source Sans 3,
gray/red screen frames, segmented progress, step counters and large clocks.
`combined.html` plays an approximately 115-second preview with this structure:

| Start | Scene |
|---:|---|
| 0 s | Intro: 36 GB300 GPUs per system; 128 CUA / 126 CC concurrency |
| 7 s | One computer-use task, retimed with each system's measured model waits |
| 43.9 s | 128 computer-use agent slots; 55-minute measured window |
| 66 s | One matched Claude Code session, with tool-call playback time zero |
| ≈93.33 s | 126 coding agent slots; 60-minute measured window |

Each fleet scene has a 0.6-second opening hold, 18 seconds of accelerated
measured wall time, and a 3.5-second result hold. Fleet scenes default to a clean pair of larger Provider revenue and User cost
charts, plus a thin cache-hit line with moving marker and percentage.
`?layout=levels` adds a quieter grid inspired by S4. Both layouts have matching
CUA and CC video exports using the selected cost definition A. The baseline display name is `dynamo+sglang`.
The preview is silent. It does not replace production `media/merge_demo.mp4`.

The CUA single-task frames come from the existing merged video, SHA-256
`331ec5c3404ef04443c63c4f76d73d934e67726d461a178e5edf7f3e91f86fc0`.
That renderer already paired the same VM actions with actual model waits from
baseline job 356236 and Evolving Infra job 354801. It shows full task times
107:11 and 44:47, respectively. Titles are retouched and the old result cards
are replaced with the fleet scene. Recorded screens, actions and clocks are
preserved. The original source recordings are the November 5 OSWorld demo.

The terminal interior was independently redrawn after studying the CLI UI in
[codeaashu/claude-code](https://github.com/codeaashu/claude-code) at
`b983a3b8106bf77cbae6d439f700cc74d74ccd15`, especially its condensed welcome,
message/tool indentation, prompt, spinner and dark-theme colors. No upstream
application source is bundled. Its native Ink UI, rather than the separate web
chat wrapper, is the reference. TTFT remains an external benchmark annotation.

## Session scene

The scene replays all 25 requests from matched session `fd0aecb95d7f`, using
`session-data.js`. Every request retains its recorded TTFT, decode duration,
prompt length, cached-token count and output length. Only between-request gaps
with no request in flight are removed. The two initial overlapping requests
remain overlapping. Both sides contain the same 15,028 output tokens.

The model-serving clock excludes those omitted intervals. Both panels share the
same playback rate: 8× while either streams, 120× when neither streams. Time
continues advancing at the displayed rate. The source session elapsed times
remain 1863.4 s and 651.2 s; the animation is not a new experiment with tool
latency changed to zero. In particular, the measured cache outcomes still come
from the original run, with its real tool waits.

Each system's clock stops when its model calls finish: 23:15 for dynamo+sglang and
02:55 for Evolving Infra. Cache hit and user cost update when calls complete;
neither shows a future whole-session total. Both are undefined before the first
completion. Cache hit is cumulative cached input divided by cumulative input.
User cost per million tokens is cumulative charge divided by cumulative input
plus output tokens, multiplied by one million. Cached input is counted once.
The annotation beside the clock shows the current first-token wait.

| Whole selected session | dynamo+sglang | Evolving Infra |
|---|---:|---:|
| Input-token-weighted cache hit | 80.8390% | 94.3499% |
| Sum of request TTFT | 1335.2 s | 114.4 s |
| Sum of decode durations | 62.5 s | 63.1 s |
| Cost at the demo token rates | $0.81015192 | $0.57062424 |
| Input + output tokens | 1,570,158 | 1,570,158 |
| User cost / 1M input + output tokens | $0.5159684 | $0.3634184 |

The terminal transcript is illustrative. `story-terminal.js` draws a Claude Code
terminal with a compact welcome, user prompt, assistant replies, Read/Update/Bash
rows, indented results, file diffs, working indicator, prompt and permission footer.
Tool commands, filenames, code edits and test results are authored examples, not
recorded benchmark outputs. Both arms use the same illustration. Tool results
appear immediately at model-call completion and add no playback time. Source logs
contain request boundaries and token counts, not response text or individual
token-arrival timestamps. Text reveal is interpolated within each recorded decode
interval; a completed session is not a correctness score for the illustrative
coding task. Cache reuse reduces prefill work, but this comparison also changes
allocation and routing and does not isolate a cache-only causal speedup.

## Fleet scenes and cost definitions

`fleet-data.js` contains 10-second cumulative samples and per-slot request states
for both workloads. CC comes from the repository's `video/data.json`; CUA comes
from the recorded client lifecycle logs of jobs 356236 and 354801. No prompts or
response text are exported. CUA is configured for 128 concurrent trajectories,
not the 126 shown in the old merged intro. CC remains 126.

The cohorts are successful, non-warmup model calls completing inside
`[1800, 5100)` for CUA and `[1800, 5400)` for CC, relative to each run's start.
Tool waits remain in this wall-time axis. The CUA cohorts reproduce the archived
scorer counts, 6,652 / 14,199. Every billed call has recorded input, cached input,
and output usage. Values interpolate cumulative samples; there are no future
whole-window values at time zero. Cache hit and cost are undefined until the
first nonempty completion sample.

The optional grid uses S4-style grouped state levels: waiting fills from the
bottom, generating is stacked above it, and tools/between calls occupy the next
rows; idle space is dark. Small hourglass, generation and terminal symbols
identify the states. Tile fills are muted, with no glow or completion flashes.
Counts are averaged over the current and preceding six 10-second state samples
(a trailing 60-second span), then interpolated. Tile positions represent counts,
not persistent session identities. This averaging applies only to the state
visualization; revenue, cost and cache-hit values keep their original cumulative
samples. Every displayed state-count vector still sums to configured concurrency.

Underlying CC activity uses recorded task slots. CUA groups client events by
sender shard, trace hash and cycle. A trace runs from its first recorded admit
to TRACE_COMPLETE, or its last recorded request completion/failure if no trace
completion exists. The latter is an activity boundary, not a completed task.

The thin cache line shows cumulative cached input / cumulative input, weighted
by input tokens. It is not a trailing-window rate or the arithmetic mean of
request percentages. Provider revenue is the cumulative sum of token charges.
User selected A on November 12. `cost-options.html` now switches workloads,
visual layouts and time; all current previews use A. The normalization options
considered were:

| Option | User cost definition |
|---|---|
| A | All input + output charges / (input + output tokens) × 1M |
| B | All input + output charges / output tokens × 1M |
| C | All input + output charges / completed model calls |

A counts cached input once. B includes input charges, so it is not an output-token
list price. B and C also depend on the mix of calls completed by each system;
they do not establish the cost of an identical completed task. A is the selected
definition for both layouts. Switching layouts preserves the chosen time. Each
layout has a corresponding combined MP4 and CC MP4.

Per-million token prices (uncached input / cached input / output):

- CC: $1.40 / $0.26 / $4.40, preserving the original demo rates.
- CUA: $0.95 / $0.16 / $4.00 for Kimi K2.6, verified against the
  [official price table](https://platform.kimi.ai/docs/pricing/chat) on November 12, 2026.

Both provider revenue and user cost are valuations at these prices, not measured
payments. The single-session example and aggregate cohort have different scopes.

### Computer-use agents — 55 minutes

| Metric | dynamo+sglang | Evolving Infra |
|---|---:|---:|
| Completed model calls | 6,652 | 14,199 |
| Provider revenue | $95.9220 | $204.7980 |
| Avg cache hit | 93.1916% | 93.9553% |
| A: cost / 1M input + output | $0.222109 | $0.215129 |
| B: cost / 1M output | $101.0420 | $110.6010 |
| C: cost / model call | $0.01442002 | $0.01442341 |

### Coding agents — 60 minutes

| Metric | dynamo+sglang | Evolving Infra |
|---|---:|---:|
| Completed model calls | 7,710 | 21,302 |
| Provider revenue | $459.7243 | $1,082.7686 |
| Avg cache hit | 90.9046% | 96.2819% |
| A: cost / 1M input + output | $0.395208 | $0.331201 |
| B: cost / 1M output | $50.6075 | $47.0983 |
| C: cost / model call | $0.05962702 | $0.05082943 |

CUA has 2.14× provider revenue; A is about 3.1% lower, B is about 9.5%
higher, and C is nearly unchanged (0.0235% higher). CC has 2.36× provider
revenue; A, B and C are about 16.2%, 6.9% and 14.8% lower. The preview retains
these differences rather than assuming every cost definition must decrease.

## Workload comparison on the main page

`js/shift-data.js` contains the recorded counts from the report's
`figures/data/eval_shift_splits.csv`, with a source SHA-256. Both the Evidence
animation and the compute-allocation demo use it. Each of the nine separate
node boxes represents four GB300 GPUs. During dynamo+sglang restarts the recorded
prefill and decode counts sum to eight; the remaining node is explicitly
unavailable. Nodes are grouped by role, not identified by physical node ID.
