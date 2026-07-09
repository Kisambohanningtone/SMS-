export enum UnitStatus {
  VACANT = 'vacant',
  OCCUPIED = 'occupied',
  OVERDUE = 'overdue',
  PARTIAL = 'partial',
  PAID = 'paid',
}

export enum PaymentMethod {
  MPESA_STK = 'mpesa_stk',
  MPESA_TILL = 'mpesa_till',
  BANK = 'bank',
  CASH = 'cash',
}

export enum ReminderChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  BOTH = 'both',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  EXPIRED = 'expired',
}
