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
  date: string;
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
