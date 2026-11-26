import { Share } from 'react-native';
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

function agreementText(loan: LoanAgreementData) {
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
  const terms = [
    ['Loan number', text(loan.loan_number)],
    ['Status', text(loan.loan_status)],
    ['Pledge number', text(loan.gold_pledge_number)],
    ['Loan date', date(loan.loan_date)],
    ['Maturity date', date(loan.maturity_date)],
    ['Customer', text(loan.customer_name)],
    ['Customer ID', text(loan.customer_code)],
    ['Mobile', text(loan.customer_mobile)],
    ['Alternate mobile', text(loan.customer_alternate_mobile)],
    ['Email', text(loan.customer_email)],
    ['Address', address || '—'],
    ['Guarantor', text(loan.guarantor_name)],
    ['Guarantor mobile', text(loan.guarantor_mobile)],
    ['Jewellery', text(loan.jewellery_type)],
    ['Metal', text(loan.metal_type || 'Gold')],
    ['Purity / quality', text(loan.gold_purity)],
    ['Gross weight', `${text(loan.gross_weight)} ${unit}`],
    ['Stone weight', `${text(loan.stone_weight)} ${unit}`],
    ['Net weight', `${text(loan.net_gold_weight)} ${unit}`],
    ['Gold valuation', currency(loan.gold_valuation)],
    ['Principal amount', currency(loan.principal_amount)],
    ['Outstanding principal', currency(loan.outstanding_principal ?? loan.principal_amount)],
    ['Interest method', text(loan.interest_type)],
    ['Interest rate', `${text(loan.interest_rate)}% per ${text(loan.interest_frequency)}`],
    ['Calculation start', date(loan.interest_calculation_start_date)],
    ['Day-count convention', text(loan.day_count_convention)],
    ['Payment frequency', text(loan.payment_frequency)],
    ['Grace period', `${text(loan.grace_period_days)} days`],
    ['Interest-free period', `${text(loan.interest_free_days)} days`],
    [
      'Late payment rate',
      loan.late_payment_interest_rate == null
        ? 'Not set'
        : `${loan.late_payment_interest_rate}% per ${text(loan.interest_frequency)} period`,
    ],
    ['Processing fee', currency(loan.processing_fee)],
    ['Other authorized charges', currency(loan.other_charges)],
    ['Notes', text(loan.notes)],
  ];

  return [
    'SRI GOLDS',
    'GOLD LOAN AGREEMENT',
    '',
    ...terms.map(([label, value]) => `${label}: ${value}`),
    '',
    'The borrower confirms these customer and pledged-item details and accepts the loan amount, interest and repayment terms, charges, and maturity date.',
    '',
    'Borrower signature: ____________________',
    'Authorized representative: ____________________',
    'Witness 1: ____________________',
    'Witness 2: ____________________',
  ].join('\n');
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
  return Share.share({
    title: `Loan Agreement ${loan.loan_number || loan.id}`,
    message: agreementText(loan),
  });
}
