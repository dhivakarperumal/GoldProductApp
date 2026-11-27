import { fs, open } from 'react-native-blob-util';
import { generatePDF } from 'react-native-html-to-pdf';
import api from '../../api';

export type LoanAgreementData = {
  id: number | string;
  loan_number?: string;
  loan_status?: string;
  release_status?: string;
  customer_id?: number | string;
  customer_kyc_status?: string;
  gold_pledge_number?: string;
  loan_date?: string;
  maturity_date?: string;
  customer_name?: string;
  customer_code?: string;
  customer_mobile?: string;
  customer_alternate_mobile?: string;
  customer_email?: string;
  customer_date_of_birth?: string;
  customer_gender?: string;
  customer_occupation?: string;
  customer_address?: string;
  customer_city?: string;
  customer_district?: string;
  customer_state?: string;
  customer_pincode?: string;
  guarantor_name?: string;
  guarantor_mobile?: string;
  guarantor_email?: string;
  guarantor_relationship?: string;
  guarantor_address?: string;
  jewellery_type?: string;
  metal_type?: string;
  gold_purity?: string;
  gross_weight?: string | number;
  stone_weight?: string | number;
  net_gold_weight?: string | number;
  rate_unit?: string;
  gold_rate_per_gram?: string | number | null;
  gold_rate_date?: string;
  gold_valuation?: string | number;
  principal_amount?: string | number;
  outstanding_principal?: string | number | null;
  interest_type?: string;
  interest_rate?: string | number;
  interest_frequency?: string;
  fixed_interest_amount?: string | number | null;
  custom_period_days?: string | number | null;
  compounding_frequency?: string;
  payment_frequency?: string;
  interest_calculation_start_date?: string;
  day_count_convention?: string;
  grace_period_days?: string | number;
  interest_free_days?: string | number;
  late_payment_interest_rate?: string | number | null;
  minimum_interest_amount?: string | number | null;
  maximum_interest_amount?: string | number | null;
  processing_fee?: string | number;
  other_charges?: string | number;
  notes?: string;
};

function text(value: unknown) {
  return value == null || value === '' ? '—' : String(value);
}

function currency(value: string | number | null | undefined) {
  if (value == null || value === '') return '—';
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : String(value);
}

function date(value?: string) {
  if (!value) return '—';
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
}

function escapeHtml(value: unknown) {
  const entities: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&#39;',
    '"': '&quot;',
  };
  return String(value ?? '—').replace(/[<>&'"]/g, character => entities[character]);
}

function agreementHtml(loan: LoanAgreementData) {
  const unit = loan.rate_unit === 'carat' ? 'ct' : 'g';
  const address = [
    loan.customer_address,
    loan.customer_city,
    loan.customer_district,
    loan.customer_state,
    loan.customer_pincode,
  ]
    .filter(Boolean)
    .join(', ');
  const sections: Array<{ title: string; rows: Array<[string, string]> }> = [
    {
      title: 'Agreement details',
      rows: [
        ['Loan number', text(loan.loan_number)],
        ['Status', text(loan.loan_status)],
        ['Pledge number', text(loan.gold_pledge_number)],
        ['Loan date', date(loan.loan_date)],
        ['Maturity date', date(loan.maturity_date)],
      ],
    },
    {
      title: 'Borrower details',
      rows: [
        ['Customer name', text(loan.customer_name)],
        ['Customer ID', text(loan.customer_code || loan.customer_id)],
        ['Mobile number', text(loan.customer_mobile)],
        ['Alternate mobile', text(loan.customer_alternate_mobile)],
        ['Email', text(loan.customer_email)],
        ['Date of birth', date(loan.customer_date_of_birth)],
        ['Gender', text(loan.customer_gender)],
        ['Occupation', text(loan.customer_occupation)],
        ['KYC status', text(loan.customer_kyc_status)],
        ['Address', address || '—'],
        ['Guarantor name', text(loan.guarantor_name)],
        ['Guarantor mobile', text(loan.guarantor_mobile)],
        ['Guarantor email', text(loan.guarantor_email)],
        ['Guarantor relationship', text(loan.guarantor_relationship)],
        ['Guarantor address', text(loan.guarantor_address)],
      ],
    },
    {
      title: 'Pledged jewellery and valuation',
      rows: [
        ['Jewellery type', text(loan.jewellery_type)],
        ['Metal', text(loan.metal_type || 'Gold')],
        ['Purity / quality', text(loan.gold_purity)],
        ['Gross weight', `${text(loan.gross_weight)} ${unit}`],
        ['Stone weight', `${text(loan.stone_weight)} ${unit}`],
        ['Net weight', `${text(loan.net_gold_weight)} ${unit}`],
        [
          'Rate snapshot',
          loan.gold_rate_per_gram == null
            ? 'Not recorded'
            : `${currency(loan.gold_rate_per_gram)} / ${unit}`,
        ],
        ['Rate effective date', date(loan.gold_rate_date)],
        ['Pledged metal valuation', currency(loan.gold_valuation)],
      ],
    },
    {
      title: 'Loan and repayment terms',
      rows: [
        ['Principal amount', currency(loan.principal_amount)],
        [
          'Outstanding principal',
          currency(loan.outstanding_principal ?? loan.principal_amount),
        ],
        ['Interest method', text(loan.interest_type)],
        ['Interest rate', `${text(loan.interest_rate)}% per ${text(loan.interest_frequency)}`],
        ['Fixed interest amount', currency(loan.fixed_interest_amount)],
        ['Calculation start date', date(loan.interest_calculation_start_date)],
        ['Day-count convention', text(loan.day_count_convention)],
        ['Compounding frequency', text(loan.compounding_frequency)],
        ['Custom interest period', loan.custom_period_days == null ? '—' : `${loan.custom_period_days} days`],
        ['Payment frequency', text(loan.payment_frequency)],
        ['Grace period', `${text(loan.grace_period_days)} days`],
        ['Interest-free period', `${text(loan.interest_free_days)} days`],
        [
          'Late payment rate',
          loan.late_payment_interest_rate == null
            ? 'Not set'
            : `${loan.late_payment_interest_rate}% per ${text(loan.interest_frequency)} period`,
        ],
        ['Minimum interest', currency(loan.minimum_interest_amount)],
        ['Maximum interest', currency(loan.maximum_interest_amount)],
        ['Processing fee', currency(loan.processing_fee)],
        ['Other authorized charges', currency(loan.other_charges)],
        ['Notes', text(loan.notes)],
      ],
    },
  ];

  const rows = sections
    .map(
      section => `
        <section>
          <h2>${escapeHtml(section.title)}</h2>
          <div class="grid">
            ${section.rows
              .map(
                ([label, value]) => `
                  <div class="detail">
                    <span>${escapeHtml(label)}</span>
                    <strong>${escapeHtml(value)}</strong>
                  </div>`,
              )
              .join('')}
          </div>
        </section>`,
    )
    .join('');
  const status =
    loan.release_status === 'Released'
      ? 'Completed · Gold Released'
      : loan.release_status === 'Pending Release' &&
          Number(loan.outstanding_principal ?? loan.principal_amount) === 0
        ? 'Paid · Awaiting Gold Release'
        : text(loan.loan_status);

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Loan Agreement - ${escapeHtml(loan.loan_number || loan.id)}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 28px; color: #172b28; font: 13px/1.45 Arial, sans-serif; background: #eef3f1; }
          .page { width: 100%; max-width: 850px; margin: auto; padding: 32px; background: white; }
          header { display: flex; justify-content: space-between; gap: 20px; padding-bottom: 16px; border-bottom: 2px solid #087263; }
          h1 { margin: 0; color: #07564b; font: 700 27px Georgia, serif; }
          header p { margin: 5px 0 0; color: #52625e; }
          .title { text-align: right; }
          .title h2 { margin: 0; color: #07564b; font-size: 17px; }
          .title p { font-weight: 700; }
          .meta { display: flex; justify-content: space-between; gap: 12px; margin: 16px 0; padding: 10px 12px; background: #f0f8f5; }
          .meta p { margin: 0; }
          section { margin-top: 16px; break-inside: avoid; }
          section h2 { margin: 0 0 8px; padding-bottom: 5px; border-bottom: 1px solid #dce8e3; color: #07564b; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
          .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px 14px; }
          .detail { min-width: 0; }
          .detail span { display: block; color: #71817c; font-size: 9px; text-transform: uppercase; }
          .detail strong { display: block; overflow-wrap: anywhere; color: #1e302b; font-size: 11px; }
          .acknowledgment { margin-top: 18px; padding: 10px 12px; border: 1px solid #dce8e3; color: #52625e; font-size: 10px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 42px 24px; margin-top: 44px; }
          .signature { padding-top: 6px; border-top: 1px solid #485752; color: #52625e; font-size: 10px; }
          .footer { margin-top: 20px; padding-top: 8px; border-top: 1px solid #e3ebe7; color: #71817c; text-align: center; font-size: 9px; }
          @page { size: A4 portrait; margin: 12mm; }
          @media print { body { padding: 0; background: white; } .page { max-width: none; padding: 0; } }
        </style>
      </head>
      <body>
        <article class="page">
          <header>
            <div>
              <h1>Sri Golds</h1>
              <p>No.58 Vaitheeshwaran Nagar, Tirupattur - 635653</p>
              <p>Phone: 9659133504</p>
            </div>
            <div class="title">
              <h2>Gold Loan Agreement</h2>
              <p>${escapeHtml(loan.loan_number || `Loan ${loan.id}`)}</p>
            </div>
          </header>
          <div class="meta">
            <p><strong>Agreement date:</strong> ${escapeHtml(date(loan.loan_date))}</p>
            <p><strong>Loan status:</strong> ${escapeHtml(status)}</p>
            <p><strong>Pledge number:</strong> ${escapeHtml(text(loan.gold_pledge_number))}</p>
          </div>
          ${rows}
          <p class="acknowledgment">The borrower confirms these customer and pledged-item details and accepts the loan amount, interest and repayment terms, charges, maturity date, and account review process. Both parties should review and sign this agreement and keep a signed copy.</p>
          <div class="signatures">
            <div class="signature"><strong>${escapeHtml(text(loan.customer_name))}</strong><br />Borrower signature / thumb impression<br />Date: ____________________</div>
            <div class="signature"><strong>Sri Golds</strong><br />Authorized shop representative signature<br />Date: ____________________</div>
            <div class="signature">Witness 1<br />Name and signature</div>
            <div class="signature">Witness 2<br />Name and signature</div>
          </div>
          <p class="footer">Generated from the saved loan record on ${escapeHtml(new Date().toLocaleString('en-IN'))}.</p>
        </article>
      </body>
    </html>`;
}

export async function printLoanAgreement(
  loanOrId: LoanAgreementData | number | string,
) {
  let loan: LoanAgreementData;
  if (typeof loanOrId === 'object') {
    loan = loanOrId;
  } else {
    const response = await api.get(`/loans/${loanOrId}`);
    if (!response.data || !response.data.id) {
      throw new Error('The server returned invalid loan details.');
    }
    loan = response.data as LoanAgreementData;
  }
  if (!loan.id) throw new Error('Loan details are unavailable.');
  const fileName = `loan-agreement-${String(loan.loan_number || loan.id).replace(
    /[^a-zA-Z0-9_-]/g,
    '-',
  )}`;
  const pdf = await generatePDF({
    html: agreementHtml(loan),
    fileName,
    directory: 'Documents',
    shouldPrintBackgrounds: true,
  });
  if (!pdf.filePath || !(await fs.exists(pdf.filePath))) {
    throw new Error('The loan agreement PDF could not be generated.');
  }
  await open.chooser(pdf.filePath, {
    mime: 'application/pdf',
    title: 'Print or share loan agreement PDF',
  });
  return pdf.filePath;
}
