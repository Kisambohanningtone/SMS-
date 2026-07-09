import { sequelize } from '@config/db'
import { logger } from '@config/logger'

import { User } from './User'
import { Agent } from './Agent'
import { Owner } from './Owner'
import { Property } from './Property'
import { Unit } from './Unit'
import { Tenant } from './Tenant'
import { Payment } from './Payment'
import { Maintenance } from './Maintenance'
import { OwnerReport } from './OwnerReport'
import { ReminderLog } from './ReminderLog'
import { StkRequest } from './StkRequest'
import { UnitTypeGroup } from './UnitTypeGroup'

// Add models to the sequelize instance (sequelize-typescript handles init)
sequelize.addModels([
  User, Agent, Owner, Property, Unit, Tenant,
  Payment, Maintenance, OwnerReport, ReminderLog, StkRequest, UnitTypeGroup,
])

// ── Associations ──────────────────────────────────────────────────────────────

// User ↔ Agent (1:1)
User.hasOne(Agent, { foreignKey: 'user_id', as: 'agent', onDelete: 'CASCADE' })
Agent.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

// User ↔ Owner (1:1, nullable)
User.hasOne(Owner, { foreignKey: 'user_id', as: 'owner', onDelete: 'SET NULL' })
Owner.belongsTo(User, { foreignKey: 'user_id', as: 'user' })

// Agent ↔ Owner (1:many)
Agent.hasMany(Owner, { foreignKey: 'agent_id', as: 'owners', onDelete: 'RESTRICT' })
Owner.belongsTo(Agent, { foreignKey: 'agent_id', as: 'agent' })

// Agent ↔ Property (1:many)
Agent.hasMany(Property, { foreignKey: 'agent_id', as: 'properties', onDelete: 'RESTRICT' })
Property.belongsTo(Agent, { foreignKey: 'agent_id', as: 'agent' })

// Owner ↔ Property (1:many)
Owner.hasMany(Property, { foreignKey: 'owner_id', as: 'properties', onDelete: 'RESTRICT' })
Property.belongsTo(Owner, { foreignKey: 'owner_id', as: 'owner' })

// Property ↔ Unit (1:many)
Property.hasMany(Unit, { foreignKey: 'property_id', as: 'units', onDelete: 'CASCADE' })
Unit.belongsTo(Property, { foreignKey: 'property_id', as: 'property' })

// Property <-> UnitTypeGroup (1:many)
Property.hasMany(UnitTypeGroup, { foreignKey: 'property_id', as: 'unit_type_groups', onDelete: 'CASCADE' })
UnitTypeGroup.belongsTo(Property, { foreignKey: 'property_id', as: 'property' })

// UnitTypeGroup <-> Unit (1:many)
UnitTypeGroup.hasMany(Unit, { foreignKey: 'unit_type_group_id', as: 'units', onDelete: 'SET NULL' })
Unit.belongsTo(UnitTypeGroup, { foreignKey: 'unit_type_group_id', as: 'unit_type_group' })

// Unit ↔ Tenant (1:many)
Unit.hasMany(Tenant, { foreignKey: 'unit_id', as: 'tenants', onDelete: 'RESTRICT' })
Tenant.belongsTo(Unit, { foreignKey: 'unit_id', as: 'unit' })

// Unit ↔ Payment (1:many)
Unit.hasMany(Payment, { foreignKey: 'unit_id', as: 'payments', onDelete: 'RESTRICT' })
Payment.belongsTo(Unit, { foreignKey: 'unit_id', as: 'unit' })

// Tenant ↔ Payment (1:many)
Tenant.hasMany(Payment, { foreignKey: 'tenant_id', as: 'payments', onDelete: 'SET NULL' })
Payment.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' })

// Property ↔ Payment (denormalised)
Property.hasMany(Payment, { foreignKey: 'property_id', as: 'payments', onDelete: 'RESTRICT' })
Payment.belongsTo(Property, { foreignKey: 'property_id', as: 'property' })

// Agent ↔ Payment (denormalised)
Agent.hasMany(Payment, { foreignKey: 'agent_id', as: 'payments', onDelete: 'RESTRICT' })
Payment.belongsTo(Agent, { foreignKey: 'agent_id', as: 'agent' })

// User ↔ Payment (recorded_by)
User.hasMany(Payment, { foreignKey: 'recorded_by', as: 'recorded_payments', onDelete: 'SET NULL' })
Payment.belongsTo(User, { foreignKey: 'recorded_by', as: 'recorder' })

// Property ↔ Maintenance (1:many)
Property.hasMany(Maintenance, { foreignKey: 'property_id', as: 'maintenance_items', onDelete: 'RESTRICT' })
Maintenance.belongsTo(Property, { foreignKey: 'property_id', as: 'property' })

// Unit ↔ Maintenance (1:many, nullable)
Unit.hasMany(Maintenance, { foreignKey: 'unit_id', as: 'maintenance_items', onDelete: 'SET NULL' })
Maintenance.belongsTo(Unit, { foreignKey: 'unit_id', as: 'unit' })

// User ↔ Maintenance (created_by)
User.hasMany(Maintenance, { foreignKey: 'created_by', as: 'created_maintenance', onDelete: 'RESTRICT' })
Maintenance.belongsTo(User, { foreignKey: 'created_by', as: 'creator' })

// Property ↔ OwnerReport (1:many)
Property.hasMany(OwnerReport, { foreignKey: 'property_id', as: 'owner_reports', onDelete: 'RESTRICT' })
OwnerReport.belongsTo(Property, { foreignKey: 'property_id', as: 'property' })

// Tenant ↔ ReminderLog (1:many)
Tenant.hasMany(ReminderLog, { foreignKey: 'tenant_id', as: 'reminder_logs', onDelete: 'CASCADE' })
ReminderLog.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' })

// Unit ↔ ReminderLog (1:many)
Unit.hasMany(ReminderLog, { foreignKey: 'unit_id', as: 'reminder_logs', onDelete: 'CASCADE' })
ReminderLog.belongsTo(Unit, { foreignKey: 'unit_id', as: 'unit' })

// Property ↔ ReminderLog (1:many)
Property.hasMany(ReminderLog, { foreignKey: 'property_id', as: 'reminder_logs', onDelete: 'CASCADE' })
ReminderLog.belongsTo(Property, { foreignKey: 'property_id', as: 'property' })

// Unit ↔ StkRequest (1:many)
Unit.hasMany(StkRequest, { foreignKey: 'unit_id', as: 'stk_requests', onDelete: 'RESTRICT' })
StkRequest.belongsTo(Unit, { foreignKey: 'unit_id', as: 'unit' })

// Tenant ↔ StkRequest (1:many)
Tenant.hasMany(StkRequest, { foreignKey: 'tenant_id', as: 'stk_requests', onDelete: 'SET NULL' })
StkRequest.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' })

// Agent ↔ StkRequest (1:many)
Agent.hasMany(StkRequest, { foreignKey: 'agent_id', as: 'stk_requests', onDelete: 'RESTRICT' })
StkRequest.belongsTo(Agent, { foreignKey: 'agent_id', as: 'agent' })

logger.debug('All Sequelize associations registered')

// ── Named exports ─────────────────────────────────────────────────────────────
export {
  User, Agent, Owner, Property, Unit, Tenant,
  Payment, Maintenance, OwnerReport, ReminderLog, StkRequest, UnitTypeGroup,
}

// ── Re-export enums ───────────────────────────────────────────────────────────
export { UserRole } from './User'
export { ReminderSchedule } from './Agent'
export { PaymentMethod as PropertyPaymentMethod } from './Property'
export { UnitStatus } from './Unit'
export { PaymentMethod } from './Payment'
export { ReminderChannel, ReminderStatus, ReminderTrigger } from './ReminderLog'
export { StkStatus } from './StkRequest'
