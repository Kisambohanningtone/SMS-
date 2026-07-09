export enum UserRole {
  AGENT = 'agent',
  OWNER = 'owner',
  ADMIN = 'admin',
}

export interface JwtPayload {
  id: string
  agentId?: string
  role: UserRole
  email: string
  iat?: number
  exp?: number
}

export interface RegisterDto {
  firstName: string
  lastName: string
  email: string
  password: string
  phone: string
  businessName?: string
}

export interface LoginResult {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: UserRole
    agentId?: string
  }
}
