// services/customer.service.ts

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  limit,
  runTransaction,
  serverTimestamp,
  Timestamp,
  DocumentData,
  setDoc,
} from "firebase/firestore";

import { db } from "@/services/firebase";

/* =============================================================================
 * Types
 * =============================================================================
 */

export type PaymentProvider = "mock" | "paystack";

export type PaymentMethod =
  | "pay_in_store"
  | "card"
  | "rewards"
  | "card_and_rewards";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type OrderStatus =
  | "Pending"
  | "Accepted"
  | "Preparing"
  | "Ready"
  | "Completed"
  | "Cancelled";

export type MerchantPaymentAccount = {
  provider: PaymentProvider;

  /**
   * This will later contain the real payment-provider subaccount code.
   * While testing, use a mock code.
   */
  subaccountCode?: string;

  settlementBankName?: string;
  settlementAccountName?: string;
  settlementAccountLast4?: string;

  paymentSetupComplete: boolean;
  payoutsEnabled: boolean;

  platformFeePercentage: number;
};

export type CustomerCartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;

  productId?: string;
  imageUrl?: string;

  category?: string;
};

export type PaymentBreakdown = {
  subtotal: number;
  rewardsRequested: number;
  rewardsUsed: number;
  customerAmount: number;

  platformFeePercentage: number;
  platformFee: number;

  /**
   * Amount owed to the merchant before any provider payout fees.
   */
  merchantAmount: number;
};

export type CreateCheckoutInput = {
  customerId: string;

  merchantId: string;
  merchantName: string;

  items: CustomerCartItem[];

  paymentMethod: PaymentMethod;

  /**
   * Amount of rewards the user selected at checkout.
   */
  requestedRewards?: number;

  /**
   * Optional order details.
   */
  collectionMethod?: "pickup" | "delivery";
  customerNote?: string;

  /**
   * Mock provider is used until the real payment account is available.
   */
  provider?: PaymentProvider;
};

export type CheckoutResult = {
  orderId: string;
  paymentId: string;
  orderNumber: string;

  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;

  breakdown: PaymentBreakdown;

  providerReference?: string;
};

type MerchantRecord = DocumentData & {
  id: string;
  shopName?: string;
  paymentAccount?: MerchantPaymentAccount;
};

/* =============================================================================
 * Constants
 * =============================================================================
 */

const DEFAULT_PLATFORM_FEE_PERCENTAGE = 10;

const DEFAULT_MOCK_PAYMENT_ACCOUNT: MerchantPaymentAccount = {
  provider: "mock",
  subaccountCode: "MOCK_SUBACCOUNT_DEFAULT",

  settlementBankName: "Test Bank",
  settlementAccountName: "Test Merchant",
  settlementAccountLast4: "0000",

  paymentSetupComplete: true,
  payoutsEnabled: true,

  platformFeePercentage: DEFAULT_PLATFORM_FEE_PERCENTAGE,
};

/* =============================================================================
 * Utility functions
 * =============================================================================
 */

function roundMoney(value: number): number {
  return Number((Number(value) || 0).toFixed(2));
}

function createOrderNumber(): string {
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${randomNumber}`;
}

function calculateCartSubtotal(items: CustomerCartItem[]): number {
  return roundMoney(
    items.reduce((total, item) => {
      const price = Math.max(Number(item.price) || 0, 0);
      const quantity = Math.max(Number(item.quantity) || 0, 0);

      return total + price * quantity;
    }, 0)
  );
}

function getMockProviderReference(): string {
  return `MOCK-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Returns the merchant's payment setup.
 *
 * If the merchant has no payment configuration yet, a mock account is returned
 * so development can continue without real banking or provider details.
 */
function resolveMerchantPaymentAccount(
  merchant: MerchantRecord
): MerchantPaymentAccount {
  const account = merchant.paymentAccount;

  if (!account) {
    return {
      ...DEFAULT_MOCK_PAYMENT_ACCOUNT,
      subaccountCode: `MOCK_SUBACCOUNT_${merchant.id}`,
      settlementAccountName:
        merchant.shopName ?? DEFAULT_MOCK_PAYMENT_ACCOUNT.settlementAccountName,
    };
  }

  return {
    provider: account.provider ?? "mock",

    subaccountCode:
      account.subaccountCode ?? `MOCK_SUBACCOUNT_${merchant.id}`,

    settlementBankName:
      account.settlementBankName ??
      DEFAULT_MOCK_PAYMENT_ACCOUNT.settlementBankName,

    settlementAccountName:
      account.settlementAccountName ??
      merchant.shopName ??
      DEFAULT_MOCK_PAYMENT_ACCOUNT.settlementAccountName,

    settlementAccountLast4:
      account.settlementAccountLast4 ??
      DEFAULT_MOCK_PAYMENT_ACCOUNT.settlementAccountLast4,

    paymentSetupComplete: account.paymentSetupComplete ?? false,
    payoutsEnabled: account.payoutsEnabled ?? false,

    platformFeePercentage:
      Number(account.platformFeePercentage) ||
      DEFAULT_PLATFORM_FEE_PERCENTAGE,
  };
}

/* =============================================================================
 * Merchant functions
 * =============================================================================
 */

/**
 * Return all merchants.
 */
export async function fetchMerchants(max = 50) {
  const merchantCollection = collection(db, "merchants");

  const merchantQuery = query(
    merchantCollection,
    orderBy("shopName"),
    limit(max)
  );

  const snapshot = await getDocs(merchantQuery);

  return snapshot.docs.map((merchantDocument) => ({
    id: merchantDocument.id,
    ...merchantDocument.data(),
  })) as MerchantRecord[];
}

/**
 * Case-insensitive merchant search.
 *
 * For now, this performs client-side filtering over the first 100 merchants.
 * Later, add shopNameLowercase to merchant documents for indexed searching.
 */
export async function searchMerchants(term: string, max = 20) {
  const normalizedTerm = term.trim().toLowerCase();

  if (!normalizedTerm) {
    return [];
  }

  const merchants = await fetchMerchants(100);

  return merchants
    .filter((merchant) =>
      String(merchant.shopName ?? "")
        .toLowerCase()
        .includes(normalizedTerm)
    )
    .slice(0, max);
}

/**
 * Get a merchant's public profile.
 */
export async function getMerchantById(merchantId: string) {
  if (!merchantId) {
    throw new Error("Merchant ID is required.");
  }

  const merchantReference = doc(db, "merchants", merchantId);
  const merchantSnapshot = await getDoc(merchantReference);

  if (!merchantSnapshot.exists()) {
    return null;
  }

  return {
    id: merchantSnapshot.id,
    ...merchantSnapshot.data(),
  } as MerchantRecord;
}

/**
 * Get menu items for a merchant.
 */
export async function getMerchantMenu(merchantId: string) {
  const { getMenuItems } = await import("@/services/merchant.service");

  return getMenuItems(merchantId);
}

/**
 * Get the payment account that should be used for a merchant.
 *
 * Until real payment setup is available, this returns mock settlement details.
 */
export async function getMerchantPaymentAccount(
  merchantId: string
): Promise<MerchantPaymentAccount> {
  const merchant = await getMerchantById(merchantId);

  if (!merchant) {
    throw new Error("Merchant not found.");
  }

  return resolveMerchantPaymentAccount(merchant);
}

/* =============================================================================
 * Payment calculation
 * =============================================================================
 */

/**
 * Calculate how an order amount is divided.
 *
 * Platform fees are calculated from the original order subtotal.
 * Rewards reduce what the customer pays but do not reduce merchant revenue.
 */
export function calculatePaymentBreakdown(
  subtotal: number,
  requestedRewards: number,
  rewardBalance: number,
  platformFeePercentage: number
): PaymentBreakdown {
  const safeSubtotal = Math.max(roundMoney(subtotal), 0);

  const safeRequestedRewards = Math.max(
    roundMoney(requestedRewards),
    0
  );

  const safeRewardBalance = Math.max(roundMoney(rewardBalance), 0);

  const safeFeePercentage = Math.max(
    Number(platformFeePercentage) || 0,
    0
  );

  const rewardsUsed = roundMoney(
    Math.min(
      safeRequestedRewards,
      safeRewardBalance,
      safeSubtotal
    )
  );

  const customerAmount = roundMoney(
    Math.max(safeSubtotal - rewardsUsed, 0)
  );

  const platformFee = roundMoney(
    safeSubtotal * (safeFeePercentage / 100)
  );

  const merchantAmount = roundMoney(
    Math.max(safeSubtotal - platformFee, 0)
  );

  return {
    subtotal: safeSubtotal,

    rewardsRequested: safeRequestedRewards,
    rewardsUsed,

    customerAmount,

    platformFeePercentage: safeFeePercentage,
    platformFee,

    merchantAmount,
  };
}

/* =============================================================================
 * Checkout and transaction persistence
 * =============================================================================
 */

/**
 * Creates an order and its related payment record in one Firestore transaction.
 *
 * This function:
 * 1. Reads the merchant payment account.
 * 2. Reads the customer's reward balance.
 * 3. Calculates the platform fee and merchant amount.
 * 4. Deducts rewards safely.
 * 5. Creates the order.
 * 6. Creates the payment transaction.
 *
 * Mock card payments are marked as paid immediately for development.
 * Pay-in-store payments remain pending until confirmed by the merchant.
 */
export async function createCustomerCheckout(
  input: CreateCheckoutInput
): Promise<CheckoutResult> {
  if (!input.customerId) {
    throw new Error("Customer ID is required.");
  }

  if (!input.merchantId) {
    throw new Error("Merchant ID is required.");
  }

  if (!input.items?.length) {
    throw new Error("Your cart is empty.");
  }

  const subtotal = calculateCartSubtotal(input.items);

  if (subtotal <= 0) {
    throw new Error("The order total must be greater than zero.");
  }

  const customerReference = doc(db, "customers", input.customerId);
  const merchantReference = doc(db, "merchants", input.merchantId);

  const orderReference = doc(collection(db, "orders"));
  const paymentReference = doc(collection(db, "payments"));

  const orderNumber = createOrderNumber();

  const requestedProvider = input.provider ?? "mock";

  return runTransaction(db, async (transaction) => {
    const [customerSnapshot, merchantSnapshot] = await Promise.all([
      transaction.get(customerReference),
      transaction.get(merchantReference),
    ]);

    if (!merchantSnapshot.exists()) {
      throw new Error("Merchant not found.");
    }

    const merchant = {
      id: merchantSnapshot.id,
      ...merchantSnapshot.data(),
    } as MerchantRecord;

    const merchantPaymentAccount =
      resolveMerchantPaymentAccount(merchant);

    const customerData = customerSnapshot.exists()
      ? customerSnapshot.data()
      : {};

    const rewardBalance = Math.max(
      Number(
        customerData.rewardBalance ??
        customerData.rewardPoints ??
        0
      ),
      0
    );

    const requestedRewards =
      input.paymentMethod === "rewards" ||
        input.paymentMethod === "card_and_rewards"
        ? Number(input.requestedRewards ?? rewardBalance)
        : 0;

    const breakdown = calculatePaymentBreakdown(
      subtotal,
      requestedRewards,
      rewardBalance,
      merchantPaymentAccount.platformFeePercentage
    );

    let paymentStatus: PaymentStatus = "pending";
    let providerReference: string | undefined;
    let paidAt: ReturnType<typeof serverTimestamp> | null = null;

    /*
     * Development behaviour:
     *
     * - mock card payment succeeds immediately
     * - rewards-only payment succeeds immediately
     * - pay in store remains pending
     */
    if (
      input.paymentMethod === "card" ||
      input.paymentMethod === "card_and_rewards"
    ) {
      if (requestedProvider === "mock") {
        paymentStatus = "paid";
        providerReference = getMockProviderReference();
        paidAt = serverTimestamp();
      } else {
        paymentStatus = "processing";
      }
    }

    if (
      input.paymentMethod === "rewards" &&
      breakdown.customerAmount === 0
    ) {
      paymentStatus = "paid";
      providerReference = getMockProviderReference();
      paidAt = serverTimestamp();
    }

    if (input.paymentMethod === "pay_in_store") {
      paymentStatus = "pending";
    }

    const orderStatus: OrderStatus = "Pending";

    /*
     * Deduct rewards as part of the same transaction.
     */
    if (breakdown.rewardsUsed > 0) {
      if (!customerSnapshot.exists()) {
        throw new Error(
          "Customer profile is required before rewards can be used."
        );
      }

      if (breakdown.rewardsUsed > rewardBalance) {
        throw new Error("Insufficient reward balance.");
      }

      const updatedRewardBalance = roundMoney(
        rewardBalance - breakdown.rewardsUsed
      );

      transaction.update(customerReference, {
        rewardBalance: updatedRewardBalance,
        rewardPoints: updatedRewardBalance,
        updatedAt: serverTimestamp(),
      });

      const rewardTransactionReference = doc(
        collection(
          db,
          "customers",
          input.customerId,
          "rewardTransactions"
        )
      );

      transaction.set(rewardTransactionReference, {
        customerId: input.customerId,
        orderId: orderReference.id,
        paymentId: paymentReference.id,

        type: "redeemed",

        points: -breakdown.rewardsUsed,
        value: -breakdown.rewardsUsed,

        balanceBefore: rewardBalance,
        balanceAfter: updatedRewardBalance,

        description: `Rewards used for order ${orderNumber}`,

        createdAt: serverTimestamp(),
      });
    }

    /*
     * Persist order.
     */
    transaction.set(orderReference, {
      orderNumber,

      customerId: input.customerId,

      merchantId: input.merchantId,
      merchantName:
        input.merchantName ||
        merchant.shopName ||
        "Merchant",

      items: input.items.map((item) => ({
        id: item.id,
        productId: item.productId ?? item.id,
        name: item.name,
        imageUrl: item.imageUrl ?? null,
        category: item.category ?? "Other",
        price: roundMoney(item.price),
        quantity: Number(item.quantity),
        lineTotal: roundMoney(item.price * item.quantity),
      })),

      itemCount: input.items.reduce(
        (count, item) => count + Number(item.quantity || 0),
        0
      ),

      collectionMethod: input.collectionMethod ?? "pickup",
      customerNote: input.customerNote?.trim() ?? "",

      subtotal: breakdown.subtotal,
      rewardsUsed: breakdown.rewardsUsed,

      /**
       * Keep total compatible with your existing Orders screen.
       */
      total: breakdown.customerAmount,
      customerAmount: breakdown.customerAmount,

      platformFeePercentage:
        breakdown.platformFeePercentage,

      platformFee: breakdown.platformFee,
      merchantAmount: breakdown.merchantAmount,

      currency: "ZAR",

      status: orderStatus,

      paymentId: paymentReference.id,
      paymentMethod: input.paymentMethod,
      paymentStatus,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    /*
     * Persist payment transaction.
     */
    transaction.set(paymentReference, {
      orderId: orderReference.id,
      orderNumber,

      customerId: input.customerId,

      merchantId: input.merchantId,
      merchantName:
        input.merchantName ||
        merchant.shopName ||
        "Merchant",

      provider:
        requestedProvider === "paystack" &&
          merchantPaymentAccount.provider === "paystack"
          ? "paystack"
          : "mock",

      providerReference: providerReference ?? null,
      providerTransactionId: providerReference ?? null,

      merchantSubaccountCode:
        merchantPaymentAccount.subaccountCode ?? null,

      paymentMethod: input.paymentMethod,
      paymentStatus,

      currency: "ZAR",

      subtotal: breakdown.subtotal,
      rewardsUsed: breakdown.rewardsUsed,
      customerAmount: breakdown.customerAmount,

      platformFeePercentage:
        breakdown.platformFeePercentage,

      platformFee: breakdown.platformFee,
      merchantAmount: breakdown.merchantAmount,

      settlement: {
        provider: merchantPaymentAccount.provider,

        subaccountCode:
          merchantPaymentAccount.subaccountCode ?? null,

        bankName:
          merchantPaymentAccount.settlementBankName ?? null,

        accountName:
          merchantPaymentAccount.settlementAccountName ?? null,

        accountLast4:
          merchantPaymentAccount.settlementAccountLast4 ?? null,

        payoutStatus:
          paymentStatus === "paid"
            ? "pending"
            : "not_ready",
      },

      isTestPayment: requestedProvider === "mock",

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      paidAt,
    });

    return {
      orderId: orderReference.id,
      paymentId: paymentReference.id,
      orderNumber,

      paymentStatus,
      orderStatus,

      breakdown,

      providerReference,
    };
  });
}

/* =============================================================================
 * Payment retrieval
 * =============================================================================
 */

/**
 * Get a single payment transaction.
 */
export async function getPaymentById(paymentId: string) {
  if (!paymentId) {
    throw new Error("Payment ID is required.");
  }

  const paymentReference = doc(db, "payments", paymentId);
  const paymentSnapshot = await getDoc(paymentReference);

  if (!paymentSnapshot.exists()) {
    return null;
  }

  return {
    id: paymentSnapshot.id,
    ...paymentSnapshot.data(),
  };
}

/**
 * Get payments for a customer.
 */
export async function getCustomerPayments(
  customerId: string,
  max = 50
) {
  const paymentsCollection = collection(db, "payments");

  const paymentsQuery = query(
    paymentsCollection,
    orderBy("createdAt", "desc"),
    limit(max)
  );

  const snapshot = await getDocs(paymentsQuery);

  /*
   * Client-side filter keeps this working without immediately requiring
   * another Firestore composite index.
   *
   * Later, replace this with:
   *
   * where("customerId", "==", customerId),
   * orderBy("createdAt", "desc")
   */
  return snapshot.docs
    .map((paymentDocument) => ({
      id: paymentDocument.id,
      ...paymentDocument.data(),
    }))
    .filter(
      (payment: any) => payment.customerId === customerId
    );
}

/* =============================================================================
 * Customer budgeting
 * =============================================================================
 */

export type CustomerBudgetProfile = {
  monthlyFoodBudget: number;

  savingGoal?: {
    title: string;
    targetAmount: number;
    savedAmount: number;
  };
};

export type CustomerSpendingStats = {
  thisMonth: number;
  allTime: number;
  averageOrder: number;
  completedOrders: number;
  remainingBudget: number;
  budgetPercentage: number;

  categoryBreakdown: {
    label: string;
    amount: number;
  }[];
};

function getDateFromFirestore(value: any): Date | null {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function getCustomerBudgetProfile(
  customerId: string
): Promise<CustomerBudgetProfile> {
  const customerReference = doc(db, "customers", customerId);

  const snapshot = await getDoc(customerReference);

  if (!snapshot.exists()) {
    return {
      monthlyFoodBudget: 0,
      savingGoal: {
        title: "",
        targetAmount: 0,
        savedAmount: 0,
      },
    };
  }

  const data = snapshot.data();

  return {
    monthlyFoodBudget: Number(data.monthlyFoodBudget || 0),

    savingGoal: {
      title: data.savingGoal?.title || "",
      targetAmount: Number(
        data.savingGoal?.targetAmount || 0
      ),
      savedAmount: Number(
        data.savingGoal?.savedAmount || 0
      ),
    },
  };
}

export async function updateCustomerFoodBudget(
  customerId: string,
  monthlyFoodBudget: number
) {
  const customerReference = doc(
    db,
    "customers",
    customerId
  );

  await setDoc(
    customerReference,
    {
      monthlyFoodBudget: Math.max(
        Number(monthlyFoodBudget) || 0,
        0
      ),

      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    }
  );
}

export async function updateCustomerSavingGoal(
  customerId: string,
  savingGoal: {
    title: string;
    targetAmount: number;
    savedAmount: number;
  }
) {
  const customerReference = doc(
    db,
    "customers",
    customerId
  );

  await setDoc(
    customerReference,
    {
      savingGoal: {
        title: savingGoal.title.trim(),

        targetAmount: Math.max(
          Number(savingGoal.targetAmount) || 0,
          0
        ),

        savedAmount: Math.max(
          Number(savingGoal.savedAmount) || 0,
          0
        ),
      },

      updatedAt: serverTimestamp(),
    },
    {
      merge: true,
    }
  );
}

export async function getCustomerCompletedOrders(
  customerId: string,
  max = 200
) {
  const ordersCollection = collection(db, "orders");

  const ordersQuery = query(
    ordersCollection,
    orderBy("createdAt", "desc"),
    limit(max)
  );

  const snapshot = await getDocs(ordersQuery);

  return snapshot.docs
    .map((orderDocument) => ({
      id: orderDocument.id,
      ...orderDocument.data(),
    }))
    .filter(
      (order: any) =>
        order.customerId === customerId &&
        String(order.status).toLowerCase() === "completed"
    );
}

export async function getCustomerSpendingStats(
  customerId: string
): Promise<CustomerSpendingStats> {
  const [orders, profile] = await Promise.all([
    getCustomerCompletedOrders(customerId),
    getCustomerBudgetProfile(customerId),
  ]);

  const now = new Date();

  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyOrders = orders.filter(
    (order: any) => {
      const date = getDateFromFirestore(
        order.createdAt
      );

      if (!date) {
        return false;
      }

      return (
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      );
    }
  );

  const thisMonth = roundMoney(
    monthlyOrders.reduce(
      (total: number, order: any) =>
        total + Number(order.total || 0),
      0
    )
  );

  const allTime = roundMoney(
    orders.reduce(
      (total: number, order: any) =>
        total + Number(order.total || 0),
      0
    )
  );

  const averageOrder =
    orders.length > 0
      ? roundMoney(allTime / orders.length)
      : 0;

  const remainingBudget = Math.max(
    roundMoney(
      profile.monthlyFoodBudget - thisMonth
    ),
    0
  );

  const budgetPercentage =
    profile.monthlyFoodBudget > 0
      ? Math.min(
        (thisMonth /
          profile.monthlyFoodBudget) *
        100,
        100
      )
      : 0;

  const categories: Record<string, number> = {};

  monthlyOrders.forEach((order: any) => {
    (order.items || []).forEach((item: any) => {
      const label =
        item.category ||
        item.categoryName ||
        "Other";

      const lineTotal =
        Number(item.lineTotal) ||
        Number(item.price || 0) *
        Number(item.quantity || 1);

      categories[label] =
        (categories[label] || 0) + lineTotal;
    });
  });

  const categoryBreakdown = Object.entries(
    categories
  )
    .map(([label, amount]) => ({
      label,
      amount: roundMoney(amount),
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    thisMonth,
    allTime,
    averageOrder,
    completedOrders: orders.length,
    remainingBudget,
    budgetPercentage,
    categoryBreakdown,
  };
}