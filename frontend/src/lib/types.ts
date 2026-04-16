export type SplitMode = "equal" | "custom" | "percentage"

export interface User {
  id: string
  email: string
  full_name: string
  created_at: string
}

export interface Participant {
  id: string
  group_id: string
  name: string
  color: string | null
  avatar_initial: string | null
}

export interface Group {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface ExpenseSplit {
  id: number
  expense_id: string
  participant_id: string
  share_amount: string
}

export interface Expense {
  id: string
  group_id: string
  description: string
  amount: string
  date: string
  payer_id: string
  created_by: string
  split_mode: SplitMode
  created_at: string
  splits: ExpenseSplit[]
}

export interface Balance {
  id: number
  group_id: string
  from_participant_id: string
  to_participant_id: string
  amount: string
  updated_at: string
}

export interface Settlement {
  from_participant_id: string
  from_name: string
  to_participant_id: string
  to_name: string
  amount: string
}

export interface ParticipantSummary {
  participant_id: string
  name: string
  color: string | null
  avatar_initial: string | null
  total_paid: string
  total_share: string
  net: string
}

export interface GroupSummary {
  group_id: string
  total_spent: string
  participant_count: number
  expense_count: number
  participants: ParticipantSummary[]
}