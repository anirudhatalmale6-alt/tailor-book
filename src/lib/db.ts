import Dexie, { type Table } from 'dexie';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  photo: string;
  notes: string;
  stylePreferences: string;
  contactType: 'client' | 'colleague';
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementField {
  id: string;
  name: string;
  unit: 'inches' | 'cm';
  category: string;
  sortOrder: number;
  createdAt: string;
}

export interface Measurement {
  id: string;
  customerId: string;
  fields: Record<string, number | string>;
  notes: string;
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  fabricType: string;
  fabricPhoto: string;
  styleDescription: string;
  styleImages: string[];
  deliveryDate: string;
  status: 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
  totalAmount: number;
  depositPaid: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amount: number;
  type: 'deposit' | 'balance' | 'refund';
  method: 'cash' | 'transfer' | 'card' | 'mobile_money';
  notes: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  expenseType: 'business' | 'sewing';
  projectId?: string;
  projectItemId?: string;
  date: string;
  createdAt: string;
}

export interface Project {
  id: string;
  customerId: string;
  name: string;
  notes: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectItem {
  id: string;
  projectId: string;
  name: string;
  measurements: Record<string, string | number>;
  fabricType: string;
  styleDescription: string;
  styleImages: string[];
  price: number;
  status: 'pending' | 'in_progress' | 'ready' | 'delivered';
  deliveryDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  customerId: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  notes: string;
  createdAt: string;
}

export interface AppSettings {
  key: string;
  value: string;
}

class TailorDB extends Dexie {
  customers!: Table<Customer>;
  measurementFields!: Table<MeasurementField>;
  measurements!: Table<Measurement>;
  orders!: Table<Order>;
  payments!: Table<Payment>;
  expenses!: Table<Expense>;
  settings!: Table<AppSettings>;
  invoices!: Table<Invoice>;
  projects!: Table<Project>;
  projectItems!: Table<ProjectItem>;

  constructor() {
    super('TailorBookDB');
    this.version(1).stores({
      customers: 'id, name, phone, createdAt',
      measurementFields: 'id, name, category, sortOrder',
      measurements: 'id, customerId, createdAt',
      orders: 'id, customerId, status, deliveryDate, createdAt',
      payments: 'id, orderId, customerId, createdAt',
      expenses: 'id, category, date, createdAt',
      settings: 'key',
    });
    this.version(2).stores({
      customers: 'id, name, phone, createdAt',
      measurementFields: 'id, name, category, sortOrder',
      measurements: 'id, customerId, createdAt',
      orders: 'id, customerId, status, deliveryDate, createdAt',
      payments: 'id, orderId, customerId, createdAt',
      expenses: 'id, category, date, createdAt',
      settings: 'key',
      invoices: 'id, invoiceNumber, orderId, customerId, createdAt',
    });
    this.version(3).stores({
      customers: 'id, name, phone, createdAt',
      measurementFields: 'id, name, category, sortOrder',
      measurements: 'id, customerId, createdAt',
      orders: 'id, customerId, status, deliveryDate, createdAt',
      payments: 'id, orderId, customerId, createdAt',
      expenses: 'id, category, date, createdAt, expenseType, projectId',
      settings: 'key',
      invoices: 'id, invoiceNumber, orderId, customerId, createdAt',
      projects: 'id, customerId, status, createdAt',
      projectItems: 'id, projectId, status, createdAt',
    }).upgrade(tx => {
      return tx.table('expenses').toCollection().modify(expense => {
        if (!expense.expenseType) {
          expense.expenseType = 'business';
        }
      });
    });
    this.version(4).stores({
      customers: 'id, name, phone, contactType, createdAt',
      measurementFields: 'id, name, category, sortOrder',
      measurements: 'id, customerId, createdAt',
      orders: 'id, customerId, status, deliveryDate, createdAt',
      payments: 'id, orderId, customerId, createdAt',
      expenses: 'id, category, date, createdAt, expenseType, projectId',
      settings: 'key',
      invoices: 'id, invoiceNumber, orderId, customerId, createdAt',
      projects: 'id, customerId, status, createdAt',
      projectItems: 'id, projectId, status, createdAt',
    }).upgrade(tx => {
      return tx.table('customers').toCollection().modify(customer => {
        if (!customer.contactType) {
          customer.contactType = 'client';
        }
      });
    });
  }
}

export const db = new TailorDB();

export const DEFAULT_MEASUREMENT_FIELDS: Omit<MeasurementField, 'id' | 'createdAt'>[] = [
  { name: 'Chest', unit: 'inches', category: 'Upper Body', sortOrder: 1 },
  { name: 'Waist', unit: 'inches', category: 'Lower Body', sortOrder: 2 },
  { name: 'Hip', unit: 'inches', category: 'Lower Body', sortOrder: 3 },
  { name: 'Shoulder', unit: 'inches', category: 'Upper Body', sortOrder: 4 },
  { name: 'Sleeve Length', unit: 'inches', category: 'Upper Body', sortOrder: 5 },
  { name: 'Trouser Length', unit: 'inches', category: 'Lower Body', sortOrder: 6 },
  { name: 'Neck', unit: 'inches', category: 'Upper Body', sortOrder: 7 },
  { name: 'Back Length', unit: 'inches', category: 'Upper Body', sortOrder: 8 },
  { name: 'Arm Hole', unit: 'inches', category: 'Upper Body', sortOrder: 9 },
];
