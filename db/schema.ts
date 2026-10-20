import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const customers = sqliteTable('customers', { id: text('id').primaryKey(), name: text('name').notNull(), phone: text('phone').notNull(), created: text('created').notNull(), pinHash: text('pin_hash') });
export const events = sqliteTable('events', { id: text('id').primaryKey(), customer: text('customer').notNull().references(()=>customers.id), type: text('type').notNull(), created: text('created').notNull(), delta: integer('delta').notNull() });
export const accessAttempts = sqliteTable('access_attempts', {
  identifier: text('identifier').primaryKey(),
  attempts: integer('attempts').notNull(),
  resetAt: integer('reset_at').notNull(),
});
