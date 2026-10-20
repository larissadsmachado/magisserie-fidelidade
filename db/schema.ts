import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const customers = sqliteTable('customers', { id: text('id').primaryKey(), name: text('name').notNull(), phone: text('phone').notNull(), created: text('created').notNull() });
export const events = sqliteTable('events', { id: text('id').primaryKey(), customer: text('customer').notNull().references(()=>customers.id), type: text('type').notNull(), created: text('created').notNull(), delta: integer('delta').notNull() });
