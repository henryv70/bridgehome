// Demo directory of institutions. Names are shown as text only; no logos or real connections.
export type Institution = { name: string; country: string; kind: 'bank' | 'wallet'; color: string };

export const COUNTRIES: Record<string, { name: string; currency: string }> = {
  US: { name: 'United States', currency: 'USD' }, CA: { name: 'Canada', currency: 'CAD' }, GB: { name: 'United Kingdom', currency: 'GBP' },
  AU: { name: 'Australia', currency: 'AUD' }, VN: { name: 'Vietnam', currency: 'VND' }, PH: { name: 'Philippines', currency: 'PHP' },
  MX: { name: 'Mexico', currency: 'MXN' }, IN: { name: 'India', currency: 'INR' }, NG: { name: 'Nigeria', currency: 'NGN' },
  KE: { name: 'Kenya', currency: 'KES' }, GT: { name: 'Guatemala', currency: 'GTQ' }, DO: { name: 'Dominican Republic', currency: 'DOP' },
  BD: { name: 'Bangladesh', currency: 'BDT' }, PK: { name: 'Pakistan', currency: 'PKR' }, ID: { name: 'Indonesia', currency: 'IDR' },
  KR: { name: 'South Korea', currency: 'KRW' }, BR: { name: 'Brazil', currency: 'BRL' }, CO: { name: 'Colombia', currency: 'COP' },
};

const I = (country: string, kind: Institution['kind'], color: string, ...names: string[]) => names.map(name => ({ name, country, kind, color }));

export const INSTITUTIONS: Institution[] = [
  ...I('US', 'bank', '#117aca', 'Chase'), ...I('US', 'bank', '#e31837', 'Bank of America'), ...I('US', 'bank', '#d71e28', 'Wells Fargo'),
  ...I('US', 'bank', '#056dae', 'Citi'), ...I('US', 'bank', '#004977', 'Capital One'), ...I('US', 'bank', '#0c2074', 'U.S. Bank'),
  ...I('US', 'bank', '#5a2d82', 'Navy Federal Credit Union'), ...I('CA', 'bank', '#d52b1e', 'RBC Royal Bank', 'Scotiabank'), ...I('CA', 'bank', '#008a00', 'TD Canada Trust'),
  ...I('GB', 'bank', '#00a5e0', 'Barclays'), ...I('GB', 'bank', '#db0011', 'HSBC UK'), ...I('GB', 'wallet', '#9fe870', 'Wise'),
  ...I('AU', 'bank', '#ffcc00', 'Commonwealth Bank'),
  ...I('VN', 'bank', '#006b3f', 'Vietcombank'), ...I('VN', 'bank', '#ed1c24', 'Techcombank'), ...I('VN', 'bank', '#006b68', 'BIDV'),
  ...I('VN', 'bank', '#00579c', 'VietinBank'), ...I('VN', 'bank', '#1e3a8a', 'MB Bank'), ...I('VN', 'bank', '#c41230', 'Agribank'),
  ...I('VN', 'wallet', '#a50064', 'MoMo'), ...I('VN', 'wallet', '#0068ff', 'ZaloPay'),
  ...I('PH', 'bank', '#0033a0', 'BDO Unibank'), ...I('PH', 'bank', '#b11116', 'BPI'), ...I('PH', 'bank', '#002d72', 'Metrobank'),
  ...I('PH', 'bank', '#1a3c6e', 'Landbank'), ...I('PH', 'wallet', '#007dfe', 'GCash'), ...I('PH', 'wallet', '#00b14f', 'Maya'),
  ...I('MX', 'bank', '#004481', 'BBVA México'), ...I('MX', 'bank', '#eb0029', 'Banorte'), ...I('MX', 'bank', '#ec0000', 'Santander México'),
  ...I('IN', 'bank', '#22409a', 'State Bank of India'), ...I('IN', 'bank', '#004c8f', 'HDFC Bank'), ...I('IN', 'bank', '#f58220', 'ICICI Bank'), ...I('IN', 'wallet', '#00baf2', 'Paytm'),
  ...I('NG', 'bank', '#ff6600', 'GTBank'), ...I('NG', 'bank', '#8b0000', 'Access Bank'), ...I('KE', 'wallet', '#4caf50', 'M-Pesa'), ...I('KE', 'bank', '#8b0000', 'Equity Bank'),
  ...I('GT', 'bank', '#0b5394', 'Banco Industrial'), ...I('DO', 'bank', '#002f87', 'Banco Popular Dominicano'), ...I('BD', 'wallet', '#e2136e', 'bKash'),
  ...I('PK', 'wallet', '#ef3e42', 'JazzCash'), ...I('ID', 'bank', '#005eac', 'BCA'), ...I('KR', 'bank', '#ffbc00', 'KB Kookmin'),
  ...I('BR', 'bank', '#ffef00', 'Banco do Brasil'), ...I('BR', 'wallet', '#820ad1', 'Nubank'), ...I('CO', 'bank', '#fdda24', 'Bancolombia'),
];

export const institution = (name: string) => INSTITUTIONS.find(i => i.name === name);

// Simulated delivery: a BridgeHome Pay transfer reads as processing, then deposited.
export const DEPOSIT_SECONDS = 25;
