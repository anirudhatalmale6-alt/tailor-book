export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${formatDate(dateString)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getStatusColor(status: string): { bg: string; text: string; dot: string } {
  switch (status) {
    case 'pending':
      return { bg: 'bg-yellow-400/10', text: 'text-yellow-400', dot: 'bg-yellow-400' };
    case 'in_progress':
      return { bg: 'bg-blue-400/10', text: 'text-blue-400', dot: 'bg-blue-400' };
    case 'ready':
      return { bg: 'bg-green-400/10', text: 'text-green-400', dot: 'bg-green-400' };
    case 'delivered':
      return { bg: 'bg-royal-hover', text: 'text-white', dot: 'bg-gray-400' };
    case 'cancelled':
      return { bg: 'bg-red-400/10', text: 'text-red-400', dot: 'bg-red-400' };
    default:
      return { bg: 'bg-royal-hover', text: 'text-white', dot: 'bg-gray-400' };
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return 'Pending';
    case 'in_progress': return 'In Progress';
    case 'ready': return 'Ready';
    case 'delivered': return 'Delivered';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function isThisMonth(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

export function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, '');
  // Remove leading +
  cleaned = cleaned.replace(/^\+/, '');
  // Nigerian local format: 0XXXXXXXXXX (11 digits starting with 0) → 234XXXXXXXXXX
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '234' + cleaned.slice(1);
  }
  return cleaned;
}

export function getWhatsAppLink(phone: string): string {
  return `https://wa.me/${formatPhoneForWhatsApp(phone)}`;
}

export function getPhoneLink(phone: string): string {
  return `tel:${phone.replace(/[^0-9+]/g, '')}`;
}

/**
 * Convert local Nigerian numbers to international format with +234 prefix.
 * e.g. 08037481552 → +2348037481552
 * Already international numbers are left as-is.
 */
export function formatPhoneInternational(phone: string): string {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  if (!cleaned) return phone;
  // Nigerian local format: 0XXXXXXXXXX (11 digits starting with 0)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '+234' + cleaned.slice(1);
  }
  // Already has country code (starts with + or 234)
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('234') && cleaned.length >= 13) {
    return '+' + cleaned;
  }
  return phone;
}

/**
 * Check if Contact Picker API is available (Chrome on Android, etc.)
 */
export function isContactPickerSupported(): boolean {
  return typeof window !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;
}

/**
 * Pick a contact from the phone's contact list.
 * Returns { name, phone } or null if cancelled.
 */
export async function pickContact(): Promise<{ name: string; phone: string } | null> {
  if (!isContactPickerSupported()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: false });
    if (!contacts || contacts.length === 0) return null;
    const contact = contacts[0];
    const name = contact.name?.[0] || '';
    const phone = contact.tel?.[0] || '';
    return { name, phone: formatPhoneInternational(phone) };
  } catch {
    return null;
  }
}
