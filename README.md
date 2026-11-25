# AtlasBank | Global Banking Intelligence

An offline analytics portfolio project by **Sanjiban Das**. AtlasBank is a fictional bank with six markets across North America, Europe and Asia-Pacific. The dashboard combines executive performance, credit risk and treasury reporting for January 2024 through December 2025.

## Run it

Open `index.html` in a browser. All code and demo data are local. For GitHub Pages, place the ZIP contents at the repository root, then select **Settings → Pages → Deploy from a branch** and choose the branch and root folder that contain `index.html`.

## Dashboard pages

| View | Decisions it supports |
|---|---|
| Executive Overview | Identify markets with large exposures, weak earnings or high NPL ratios |
| Profitability & FX | Compare reported and constant FX profit, budget variance and operating efficiency |
| Credit & Collections | Prioritize overdue balances by product and severity |
| Deposits & Liquidity | Review dependence on large depositors and 30-day funding positions by currency |
| Stress Testing | Compare base, adverse and severe outcomes by market |

The region, country, entity, product, month and currency-basis filters apply across pages. Click a country in a market table to narrow the view to its legal entity. Intramonth values are unavailable because each observation is monthly.
Line charts display values at spaced reporting months by default. Select **Show all monthly labels** to display each point value. The chart scrolls horizontally when needed.

![Executive Overview](screenshots/01-executive-overview.png)

[Profitability & FX](screenshots/02-profitability-fx.png) · [Credit & Collections](screenshots/03-credit-collections.png) · [Deposits & Liquidity](screenshots/04-deposits-liquidity.png) · [Stress Testing](screenshots/05-stress-testing.png) · [Mobile overview](screenshots/06-mobile-overview.png)

## Data and definitions

`data/AtlasBank_Synthetic_Data.xlsx` contains the 432 rows used by the application. One row represents one month, legal entity and product. There is one fictional legal entity per country. The underlying dataset was generated with a fixed random seed. Running `python data/generate.py` reproduces the bundled browser data in `data/demo.js`. The workbook is a snapshot of those same inputs.

| Fields | Definition |
|---|---|
| month, region, country, entity, currency, product | Reporting dimensions |
| fx | USD per unit of local currency. Multiplying the local amount by this rate gives USD |
| loans, deposits | Month-end gross loan balances and allocated customer deposits |
| nii, fees, cost, ecl, budget | Monthly net interest income, fee income, operating expense, credit loss expense and PBT budget |
| dpd30, dpd60, npl | Disjoint 30–59 DPD, 60–89 DPD and 90+ DPD balances. The demo treats 90+ DPD as NPL |
| matured, liquid, inflows | Next 30 days' deposit maturities, opening liquid assets and expected contractual inflows |
| top20 | Modeled exposure to large depositors. Figures are allocated across products and may be summed as a proxy |

All monetary fields are in local currency millions before translation. Reported USD uses each observation's monthly FX rate. Constant FX applies December 2025 FX for each currency to every month and both actual and budget. The same monthly rate translates balances and flows in this model. Each trend shows up to 12 months ending at the selected month. Snapshot balances and monthly earnings are evaluated for the selected month. Year-over-year measures use the same month one year earlier when available.

- **PBT** = net interest income + fee income − operating expense − credit loss expense.
- **Budget variance** = actual PBT − budget PBT. Percentage variance divides the difference by budget PBT.
- **Annualized NIM proxy** = monthly net interest income × 12 ÷ average of current and previous month gross loans. January 2024 uses the current month balance.
- **Cost-to-income** = operating expense ÷ (net interest income + fee income).
- **NPL ratio** = 90+ DPD balance ÷ gross loans. **30+ DPD rate** sums all three overdue buckets and divides by gross loans.
- **Loan-to-deposit ratio** = gross loans ÷ customer deposits. **Large-depositor proxy** = top20 ÷ customer deposits.
- **30-day funding surplus** = liquid assets + expected inflows − deposit maturities.
- Ratios use aggregated numerators and denominators after currency translation.

## Stress testing

| Scenario | Incremental runoff | Annual replacement funding rate | One-time additional loan loss |
|---|---:|---:|---:|
| Base | 0% | 0% | 0% |
| Adverse | 8% | 1.5% | 0.8% |
| Severe | 16% | 3% | 1.8% |

Runoff is a share of customer deposits and incremental to scheduled maturities. The earnings sensitivity assumes that the runoff balance incurs one month of replacement funding cost. Stressed PBT deducts that expense and the one-time additional loss from base PBT. The liquidity sensitivity reports the gross gap before replacement funding proceeds and deducts runoff from the base 30-day funding position. The model is illustrative and is designed for portfolio demonstration. It uses aggregate delinquency buckets, which do not support borrower-level migration or roll-rate measurement.
