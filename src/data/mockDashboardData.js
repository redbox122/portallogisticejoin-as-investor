/**
 * Mock dashboard data — no API calls. Set USE_MOCK_DASHBOARD to true to use this.
 * Maintenance Invoice model: monthly income + monthly maintenance accumulation → yearly invoice.
 */
/** Dashboard now uses real API (GET /portallogistice/dashboard). Kept for reference / fallback. */
export const USE_MOCK_DASHBOARD = false;

const MONTHS_IN_YEAR = 12;

export const mockData = {
  user: {
    first_name: 'محمد',
    last_name: 'أحمد',
    family_name: 'أحمد',
    email: 'user@test.com',
    phone: '0500000000',
    national_id: '1234567890',
    status: 'active',
    is_active: true
  },
  contracts: {
    total: 5,
    completed: 3,
    pending: 2,
    latest: 'عقد رقم #1023'
  },
  /** Deposit (monthly) + Profit (quarterly payout every 3 months) */
  investment: {
    total: 6600,
    monthlyDeposit: 660,
    payoutCycle: 3,
    monthlyMaintenance: 125,
    monthsPassed: 12,
    /** 5 عقود متفرقة تبدأ في الأشهر 1، 4، 6، 11، 12 */
    contractStartMonths: [1, 4, 6, 11, 12]
  },
  /**
   * العقود: إجمالي العقود ثابت 10.
   * المتاحة حالياً = 10 − (المستخدمة − المنتهية).
   * العقود المنتهية = عقود تصفية (مرتبطة).
   */
  contractsSystem: {
    used: 9,
    renewed: 0,
    ended: 2,
    renewalNotifications: 0
  }
};

/** Yearly maintenance invoice = monthlyMaintenance × 12 */
export const getMaintenanceInvoiceYearly = () =>
  (mockData.investment.monthlyMaintenance || 125) * MONTHS_IN_YEAR;

export const CURRENCY_LABEL = 'ريال';
