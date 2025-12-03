import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface BonusRule {
  id: string;
  bonus_name: string;
  calculation_type: 'fixed' | 'multiplier' | 'unlimited';
  multiplier: number;
  fixed_amount: number;
  max_withdrawal_formula: string;
}

export interface Deposit {
  id: string;
  customer_id: string;
  amount: number;
  deposit_date: string;
}

export interface Bonus {
  id: string;
  customer_id: string;
  bonus_name: string;
  amount: number;
  acceptance_date: string;
  deposit_id: string | null;
  created_date?: string;
  created_by?: string;
  btag?: string;
}

export interface Withdrawal {
  id: string;
  customer_id: string;
  amount: number;
  request_date: string;
  payment_date: string;
  staff_name: string;
  konum: string | null;
  deposit_id: string | null;
  bonus_id: string | null;
  max_allowed_withdrawal: number | null;
  is_overpayment: boolean;
  overpayment_amount: number;
  processing_time_minutes: number | null;
  rejection_date?: string | null;
  btag?: string | null;
}

export interface PaymentSystemTransaction {
  id: string;
  payment_system_name: string;
  processing_started_at: string;
  completed_at: string;
  processing_time_minutes: number;
  created_at: string;
}

export interface AnalysisReport {
  id: string;
  report_type: string;
  report_data: any;
  last_data_upload: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  name: string;
  color?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}
