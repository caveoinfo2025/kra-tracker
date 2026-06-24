# UAT KRA.target Transform — Live Execution Output

Ran with CONFIRM_UAT_KRA_TARGET_TRANSFORM=YES. 8 of 34 rows updated, committed in a single transaction.

```
Target DB name: u686730471_Caveo_UAT
Target DB host (masked): srv2201.***
Mode: LIVE WRITE (CONFIRM_UAT_KRA_TARGET_TRANSFORM=YES)
Money-label allowlist (6 labels):
  - total sales revenue - booking
  - total sales revenue - billing
  - total funnel / pipeline value created (₹ lakhs)
  - total team booking target achievement (₹ lakhs)
  - total team billing achievement
  - total team pipeline coverage (₹ lakhs)
Known non-money labels (31 labels) — left unchanged.
EmployeeTarget / TeamTarget / structured KRA template tables are NOT touched (all confirmed 0 rows on UAT).
Live DB identity confirmed: u686730471_Caveo_UAT
Fetched 34 KRA row(s).

Rows with at least one money-label change: 8 of 34.

KRA #38 (Sales Revenue targets):
  - "total sales revenue - booking": 70 -> 7000000
  - "total sales revenue - billing": 63 -> 6300000
  BEFORE: total sales revenue - booking: 70; total sales revenue - billing: 63; average gross profit margin: 6.5; payment collections within due dates & credit days reduction: 0.9
  AFTER:  total sales revenue - booking: 7000000; total sales revenue - billing: 6300000; average gross profit margin: 6.5; payment collections within due dates & credit days reduction: 0.9

KRA #43 (Sales Revenue targets):
  - "total sales revenue - booking": 120 -> 12000000
  - "total sales revenue - billing": 108 -> 10800000
  BEFORE: total sales revenue - booking: 120; total sales revenue - billing: 108; average gross profit margin: 10; payment collections within due dates & credit days reduction: 0.9
  AFTER:  total sales revenue - booking: 12000000; total sales revenue - billing: 10800000; average gross profit margin: 10; payment collections within due dates & credit days reduction: 0.9

KRA #48 (Sales Revenue targets):
  - "total sales revenue - booking": 120 -> 12000000
  - "total sales revenue - billing": 108 -> 10800000
  BEFORE: total sales revenue - booking: 120; total sales revenue - billing: 108; average gross profit margin: 12; payment collections within due dates & credit days reduction: 0.9
  AFTER:  total sales revenue - booking: 12000000; total sales revenue - billing: 10800000; average gross profit margin: 12; payment collections within due dates & credit days reduction: 0.9

KRA #53 (Sales Revenue targets):
  - "total sales revenue - booking": 75 -> 7500000
  - "total sales revenue - billing": 67.5 -> 6750000
  BEFORE: total sales revenue - booking: 75; total sales revenue - billing: 67.5; average gross profit margin: 8; payment collections within due dates & credit days reduction: 0.9
  AFTER:  total sales revenue - booking: 7500000; total sales revenue - billing: 6750000; average gross profit margin: 8; payment collections within due dates & credit days reduction: 0.9

KRA #58 (Sales Revenue targets):
  - "total sales revenue - booking": 150 -> 15000000
  - "total sales revenue - billing": 135 -> 13500000
  BEFORE: total sales revenue - booking: 150; total sales revenue - billing: 135; average gross profit margin: 15; payment collections within due dates & credit days reduction: 0.9
  AFTER:  total sales revenue - booking: 15000000; total sales revenue - billing: 13500000; average gross profit margin: 15; payment collections within due dates & credit days reduction: 0.9

KRA #65 (Funnel Creation):
  - "total funnel / pipeline value created (₹ lakhs)": 75 -> 7500000
  BEFORE: total funnel / pipeline value created (₹ lakhs): 75; number of funnel opportunities created: 10
  AFTER:  total funnel / pipeline value created (₹ lakhs): 7500000; number of funnel opportunities created: 10

KRA #68 (Revenue & Profitability):
  - "total team booking target achievement (₹ lakhs)": 500 -> 50000000
  - "total team billing achievement": 450 -> 45000000
  BEFORE: total team booking target achievement (₹ lakhs): 500; total team billing achievement: 450; gross profit margin (%): 12; collections efficiency (% within due dates): 0.9
  AFTER:  total team booking target achievement (₹ lakhs): 50000000; total team billing achievement: 45000000; gross profit margin (%): 12; collections efficiency (% within due dates): 0.9

KRA #71 (Pipeline Health & Strategic Execution):
  - "total team pipeline coverage (₹ lakhs)": 1500 -> 150000000
  BEFORE: total team pipeline coverage (₹ lakhs): 1500; forecast accuracy: 0.9; average deal win rate: 0.3
  AFTER:  total team pipeline coverage (₹ lakhs): 150000000; forecast accuracy: 0.9; average deal win rate: 0.3

LIVE RUN: writing 8 row(s) inside a transaction...
LIVE RUN: committed. 8 row(s) updated.
```
