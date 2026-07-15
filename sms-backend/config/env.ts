import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}
function optionalNumber(key: string, fallback: number): number {
  const value = process.env[key]
  if (!value) return fallback
  const num = Number(value)
  if (isNaN(num)) throw new Error(`Environment variable ${key} must be a number`)
  return num
}
function optionalBool(key: string, fallback: boolean): boolean {
  const value = process.env[key]
  if (!value) return fallback
  return value === 'true'
}

export const env = {
  app: {
    nodeEnv: optional('NODE_ENV', 'development'),
    port: optionalNumber('PORT', 5000),
    baseUrl: optional('API_BASE_URL', 'http://localhost:5000'),
    isDev: optional('NODE_ENV', 'development') === 'development',
    isProd: optional('NODE_ENV', 'development') === 'production',
  },

  db: {
    host: optional('DB_HOST', 'localhost'),
    port: optionalNumber('DB_PORT', 5432),
    name: optional('DB_NAME', 'sms_agent_db'),
    user: optional('DB_USER', 'postgres'),
    password: optional('DB_PASSWORD', ''),
    ssl: optionalBool('DB_SSL', false),
  },

  redis: {
    host: optional('REDIS_HOST', 'localhost'),
    port: optionalNumber('REDIS_PORT', 6379),
    password: optional('REDIS_PASSWORD', ''),
  },

  jwt: {
    secret: optional('JWT_SECRET', 'dev_secret_change_in_production_min_32'),
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
    refreshSecret: optional('JWT_REFRESH_SECRET', 'dev_refresh_change_in_production_min_32'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '30d'),
    ownerSecret: optional('OWNER_TOKEN_SECRET', 'dev_owner_change_in_production_min_32'),
    ownerExpiresIn: optional('OWNER_TOKEN_EXPIRES_IN', '30d'),
  },

  daraja: {
    consumerKey: optional('DARAJA_CONSUMER_KEY', ''),
    consumerSecret: optional('DARAJA_CONSUMER_SECRET', ''),
    baseUrl: optional('DARAJA_BASE_URL', 'https://sandbox.safaricom.co.ke'),
    shortcode: optional('DARAJA_SHORTCODE', '174379'),
    passkey: optional('DARAJA_PASSKEY', ''),
    stkCallbackUrl: optional('DARAJA_STK_CALLBACK_URL', 'http://localhost:5000/webhooks/daraja/stk'),
    // C2B Paybill webhook URLs
    c2bConfirmUrl: optional('DARAJA_C2B_CONFIRM_URL', 'http://localhost:5000/webhooks/c2b/confirm'),
    c2bValidateUrl: optional('DARAJA_C2B_VALIDATE_URL', 'http://localhost:5000/webhooks/c2b/validate'),
    // B2C (future — auto-sweep commissions)
    b2cInitiatorName: optional('DARAJA_B2C_INITIATOR_NAME', ''),
    b2cSecurityCredential: optional('DARAJA_B2C_SECURITY_CREDENTIAL', ''),
    b2cQueueTimeoutUrl: optional('DARAJA_B2C_QUEUE_TIMEOUT_URL', ''),
    b2cResultUrl: optional('DARAJA_B2C_RESULT_URL', ''),
  },

  waltern: {
    commissionRate: optionalNumber('COMMISSION_RATE', 0.005),
    companyName: optional('WALTERN_COMPANY_NAME', 'Waltern Tech Ltd'),
    supportEmail: optional('WALTERN_SUPPORT_EMAIL', 'kisamboningtone41@gmail.com'),
    supportPhone: optional('WALTERN_SUPPORT_PHONE', '+254769805725'),
    // Waltern Tech's own Paybill for receiving the 0.5% commission
    paybillNumber: optional('WALTERN_PAYBILL', '247247'),
    paybillAccount: optional('WALTERN_PAYBILL_ACCOUNT', '1740187161848'),
  },

  africastalking: {
    apiKey: optional('AT_API_KEY', ''),
    username: optional('AT_USERNAME', 'sandbox'),
    senderId: optional('AT_SENDER_ID', 'WALTERN'),
    whatsappSender: optional('AT_WHATSAPP_SENDER', ''),
  },

  storage: {
    uploadDir: optional('UPLOAD_DIR', './uploads'),
    reportsDir: optional('REPORTS_DIR', './reports'),
    maxFileSizeMb: optionalNumber('MAX_FILE_SIZE_MB', 10),
  },

  cors: {
    frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),
    adminUrl: optional('ADMIN_URL', 'http://localhost:5174'),
  },

  rateLimit: {
    windowMs: optionalNumber('RATE_LIMIT_WINDOW_MS', 900000),
    max: optionalNumber('RATE_LIMIT_MAX', 100),
  },

  // KopoKopo kept for reference — replaced by Daraja C2B Paybill
  kopokopo: {
    walternTillNumber: process.env.KOPOKOPO_WALTERN_TILL ?? '247247',
    clientId: optional('KOPOKOPO_CLIENT_ID', ''),
    clientSecret: optional('KOPOKOPO_CLIENT_SECRET', ''),
    baseUrl: optional('KOPOKOPO_BASE_URL', 'https://sandbox.kopokopo.com'),
    webhookSecret: optional('KOPOKOPO_WEBHOOK_SECRET', ''),
    tillNumber: optional('KOPOKOPO_TILL_NUMBER', ''),
    walternAccount: optional('WALTERN_KOPOKOPO_ACCOUNT', ''),
  },

  logging: {
    level: optional('LOG_LEVEL', 'debug'),
    dir: optional('LOG_DIR', './logs'),
  },
}

export type Env = typeof env
