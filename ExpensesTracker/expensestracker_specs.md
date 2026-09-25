# Expenses Tracker

A personal expense tracker that runs as a Claude artifact. You upload a receipt and it reads the merchant, amount, date, category and payment method for you. Then it tracks your spending against a monthly budget for each category.

**Owner:** Jas (Omega 365 Singapore)
**Currency:** SGD by default (other currencies are detected and kept separate)
**Status:** Live, private to the owner. Use the Share menu on the page to give others access.

---

## Features

### 1. Receipt upload and scanning
- Click **Upload receipt** or drag a file onto the upload area.
- Accepted files: **JPG, PNG, WebP, GIF and PDF** (up to 25 MB for PDFs).
- For PDFs, the first 1–3 pages are read. Password-protected PDFs are rejected with a message.
- After scanning, a review form opens with the details filled in. Any field it had to guess is **highlighted in amber** so you can check it before saving.
- **Add manually** lets you type an expense in without a receipt.

### 2. How the scan works
1. **Text extraction.**
   - PDFs that already contain text (e-invoices, e-receipts) are read directly.
   - Photos and scanned PDFs go through **OCR (Tesseract)**, which runs inside the page with a progress bar.
2. **Reading the details.**
   - When Claude is available, it reads the receipt image together with the OCR text.
   - If Claude isn't available, the page picks the details out of the OCR text itself.
3. The raw text is shown under **"Text found on receipt"** and is saved with the expense.

What it looks for:

| Field | What it reads |
|---|---|
| Merchant | Business name at the top of the receipt |
| Amount | The **final total paid** (after GST, service charge and discounts), not the subtotal |
| Date | Transaction date. Singapore day-first format (DD/MM/YYYY) is assumed |
| Currency | SGD unless the receipt shows RM, US$, €, £ and so on |
| Category | One of the 10 categories below, based on the merchant and items |
| Payment method | VISA / Mastercard / Amex → Credit Card; NETS; PayNow / PayLah; GrabPay; Apple / Google Pay; Cash; and more |

### 3. Categories and payment methods
**Categories:** Food & Dining, Groceries, Transport, Shopping, Utilities & Bills, Entertainment, Travel, Health & Medical, Office & Business, Other.

**Payment methods:** Cash, Credit Card, Debit Card, PayNow / PayLah, GrabPay, Apple Pay / Google Pay, NETS, Bank Transfer, Other.

### 4. Monthly budgets
Each category has a monthly budget, which you can change with **Edit budgets**. The current budget is **S$2,000 per month** (not counting rent or mortgage):

| Category | Monthly budget |
|---|---:|
| Food & Dining | S$550 |
| Groceries | S$250 |
| Transport | S$200 |
| Shopping | S$200 |
| Travel | S$200 |
| Utilities & Bills | S$180 |
| Other | S$150 |
| Entertainment | S$120 |
| Health & Medical | S$100 |
| Office & Business | S$50 |
| **Total** | **S$2,000** |

- **Budget by category** shows spent / budget for each category, with a progress bar.
  - Bars turn **amber at 80%** and **red when over budget**.
- The **Budget left** card shows how much of the total remains for the period, and how many categories are over.
- When a saved expense takes a category past 80% or over budget, the save message tells you.
- **Use suggested budget** puts the S$2,000 split above back.
- Budgets only count expenses in **SGD**.

### 5. Filters
- **Period:** Last 7 days, Last 30 days, Last 3 months, This year, All time, any single month, or **Custom range** (from and to dates).
- **Category:** show one category or all of them.
- For any range other than a full month, budgets are **prorated**: each day counts as 1/(days in that month) of the monthly budget. For example, 1–15 September counts as half of each budget.

### 6. Pie chart: "Where the money went"
- A donut chart of spending by category for the selected period.
- The legend lists each category's amount and percentage, largest first.
- Hovering a slice or row shows its amount and share in the middle of the ring.
- **Tapping a slice or row** filters the expense list to that category. Tap again to clear the filter.
- Shows at most 6 slices: the top 5 categories plus "Everything else".

### 7. Summary cards
- **Spent** in the selected period, with the number of receipts
- **Top category**, with its share of spending
- **Budget left**, or the monthly budget when the period is All time

### 8. Expense list
- Receipt thumbnail, merchant, date, category, payment method and note
- **Edit** to change any field, or **Delete** (with an on-page confirmation)
- **Export CSV** downloads every expense (Date, Merchant, Amount, Currency, Category, Payment method, Note)

---

## Data and storage
- Expenses and budgets are stored in the artifact's database, so they persist and sync across your devices.
- Each expense saves: merchant, amount, currency, date, category, payment method, note, a small receipt thumbnail, and the text read from the receipt.
- The full-size receipt image is **not** stored, only a small thumbnail.
- Until the first real expense is saved, five **example entries** are shown with a banner. They are never saved.

## Permissions
- **Receipt scanning with Claude** asks for permission the first time and uses your Claude usage.
- **OCR** runs inside the page and needs no permission. The first scan downloads about 12 MB of OCR files, so it takes a few seconds longer.
- **CSV export** asks you to confirm the download.

## Known limitations
- OCR reads **English** text only. Claude can still read other scripts from the image.
- Crumpled, faded or tilted receipts read less reliably, so check the highlighted fields.
- Only the first 1–3 pages of a PDF are read.
- The pie chart and totals show the most common currency in the period. Other currencies are listed separately under Spent.
- CSV export includes every expense, not just the current filter.

## Change log
| Version | Change |
|---|---|
| 1 | Receipt upload with AI scanning, expense list, summary, category breakdown, CSV export |
| 2 | PDF receipt support |
| 3 | OCR (Tesseract) text extraction, plus reading details from the OCR text when Claude isn't available |
| 4 | Monthly budgets for each category (S$2,000 suggested split), budget warnings |
| 5 | Date-range filter with presets and custom range, prorated budgets |
| 6 | "Where the money went" pie chart; category colours changed so they're easier to tell apart |

## Technical notes
- Single-page HTML artifact that saves its data in the artifact's own database.
- Libraries: pdf.js 3.11.174 (from the cdnjs CDN) for PDFs; Tesseract.js 5.1.1 with the English model, packaged with the page.
- Data locations: expenses in the `expenses` collection; budgets in `settings/budgets` (`{currency, byCategory}`).

## Standalone web app version
`index.html` + `style.css` + `app.js` run the same app outside Claude. Open `index.html` directly in a browser; there is no build step. It differs from the artifact in these ways:
- **Storage:** everything is saved in the browser's `localStorage`: expenses under `expenses-items`, budgets under `expenses-budgets`. Data stays on that browser only and doesn't sync. Malformed entries are dropped when the data loads.
- **Scanning:** there's no Claude step. Details are always picked out of the OCR text, or out of the PDF's text layer when it has one. Tesseract.js 5.1.1 and its English data load from the jsDelivr CDN the first time you scan, so you need to be online.
- **Budgets:** start at the suggested S$2,000 split until you edit them.
- **CSV export:** downloads the file straight away (UTF-8, opens in Excel).
- A `Content-Security-Policy` meta tag allows scripts only from the page itself, cdnjs and jsDelivr.
- `artifact-export.html` is the original Claude artifact file, kept for reference.
