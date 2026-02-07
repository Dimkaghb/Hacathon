export interface SubscriptionStatus {
  has_subscription: boolean;
  status: string | null;
  plan: string | null;
  credits_balance: number;
  credits_total: number;
  is_trial: boolean;
  trial_ends_at: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
}

export interface CreditTransaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  operation_type: string | null;
  description: string | null;
  created_at: string;
}

export const CREDIT_COSTS: Record<string, number> = {
  video_generation_standard: 25,
  video_generation_fast: 10,
  video_extension_standard: 25,
  video_extension_fast: 10,
  face_analysis: 5,
  prompt_enhancement: 0,
};
