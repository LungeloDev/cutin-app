const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const OpenAI = require("openai");
const admin = require("firebase-admin");
const crypto = require("crypto");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

const PAYSTACK_SECRET_KEY = defineSecret("PAYSTACK_SECRET_KEY");

exports.budgetChat = onCall(
    {
        secrets: [OPENAI_API_KEY],
        region: "us-central1",
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "You must be signed in to use Cutin Coach."
            );
        }

        const data = request.data || {};

        const message = String(data.message || "").trim();

        if (!message) {
            throw new HttpsError(
                "invalid-argument",
                "A message is required."
            );
        }

        const financialContext = data.financialContext || {};
        const history = Array.isArray(data.history) ? data.history : [];

        const monthlyBudget = Number(financialContext.monthlyBudget) || 0;
        const thisMonth = Number(financialContext.thisMonth) || 0;
        const remaining = Number(financialContext.remaining) || 0;
        const averageOrder = Number(financialContext.averageOrder) || 0;
        const completedOrders = Number(financialContext.completedOrders) || 0;
        const allTime = Number(financialContext.allTime) || 0;

        const savingGoalTitle = String(
            financialContext.savingGoalTitle || ""
        ).trim();

        const savingGoalAmount =
            Number(financialContext.savingGoalAmount) || 0;

        const savedAmount =
            Number(financialContext.savedAmount) || 0;

        const budgetUsedPercentage =
            monthlyBudget > 0
                ? Math.round((thisMonth / monthlyBudget) * 100)
                : 0;

        const recentHistory = history
            .slice(-8)
            .filter(
                (item) =>
                    item &&
                    (item.role === "user" || item.role === "assistant") &&
                    typeof item.content === "string"
            )
            .map((item) => ({
                role: item.role,
                content: item.content,
            }));

        const openai = new OpenAI({
            apiKey: OPENAI_API_KEY.value(),
        });

        const instructions = `
You are Cutin Coach, an AI food-spending assistant inside Cutin, a South African food marketplace.

Your role is to help customers understand and control their food spending.

CUTIN SPENDING DATA

Monthly food budget: R${monthlyBudget.toFixed(2)}
Spent this month: R${thisMonth.toFixed(2)}
Remaining this month: R${remaining.toFixed(2)}
Budget used: ${budgetUsedPercentage}%
Average completed order: R${averageOrder.toFixed(2)}
Completed Cutin orders: ${completedOrders}
All-time Cutin spending: R${allTime.toFixed(2)}

Saving goal: ${savingGoalTitle || "No saving goal set"}
Saving goal target: R${savingGoalAmount.toFixed(2)}
Amount saved: R${savedAmount.toFixed(2)}

RULES

- Always use South African Rand.
- Keep responses concise, useful and conversational.
- Focus on food budgeting and spending behaviour.
- Use the supplied Cutin data when giving advice.
- Never invent transactions outside Cutin.
- Never claim to know the user's salary, bank balance, debt or credit profile.
- Do not give regulated investment, loan, tax, insurance or credit advice.
- You may calculate simple spending targets from the supplied data.
- If no monthly budget has been set, encourage the user to create one.
- If the customer is over budget, explain it clearly without judgment.
- When useful, calculate how much they could spend per future order.
- You are called Cutin Coach.
`;

        try {
            const response = await openai.responses.create({
                model: "gpt-5-mini",
                instructions,
                input: [
                    ...recentHistory,
                    {
                        role: "user",
                        content: message,
                    },
                ],
            });

            const responseText = response.output_text?.trim();

            if (!responseText) {
                throw new Error("OpenAI returned an empty response.");
            }

            return {
                message: responseText,
            };
        } catch (error) {
            console.error("Cutin Coach OpenAI error:", error);

            throw new HttpsError(
                "internal",
                "Cutin Coach is temporarily unavailable."
            );
        }
    }
);

exports.listPaystackBanks = onCall(
    {
        secrets: [PAYSTACK_SECRET_KEY],
        region: "us-central1",
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "You must be signed in."
            );
        }

        try {
            const response = await fetch(
                "https://api.paystack.co/bank?country=south%20africa&currency=ZAR",
                {
                    headers: {
                        Authorization: `Bearer ${PAYSTACK_SECRET_KEY.value()}`,
                    },
                }
            );

            const result = await response.json();

            if (!response.ok || !result.status) {
                console.error("Paystack bank list:", result);

                throw new HttpsError(
                    "internal",
                    "Could not retrieve banks."
                );
            }

            return {
                banks: result.data.map((bank) => ({
                    name: bank.name,
                    code: bank.code,
                    slug: bank.slug || null,
                })),
            };
        } catch (error) {
            console.error("List banks error:", error);

            if (error instanceof HttpsError) {
                throw error;
            }

            throw new HttpsError(
                "internal",
                "Could not retrieve banks."
            );
        }
    }
);

exports.validatePaystackAccount = onCall(
    {
        secrets: [PAYSTACK_SECRET_KEY],
        region: "us-central1",
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "You must be signed in."
            );
        }

        const {
            accountNumber,
            bankCode,
            accountName,
            accountType = "business",
            documentNumber,
            documentType,
        } = request.data || {};

        if (
            !accountNumber ||
            !bankCode ||
            !accountName ||
            !documentNumber
        ) {
            throw new HttpsError(
                "invalid-argument",
                "Account details and identification number are required."
            );
        }

        const resolvedDocumentType =
            documentType ||
            (
                accountType === "business"
                    ? "businessRegistrationNumber"
                    : "identityNumber"
            );

        try {
            const response = await fetch(
                "https://api.paystack.co/bank/validate",
                {
                    method: "POST",

                    headers: {
                        Authorization:
                            `Bearer ${PAYSTACK_SECRET_KEY.value()}`,

                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        account_name:
                            accountName.trim(),

                        account_number:
                            accountNumber.trim(),

                        account_type:
                            accountType,

                        bank_code:
                            bankCode,

                        country_code:
                            "ZA",

                        document_type:
                            resolvedDocumentType,

                        document_number:
                            documentNumber.trim(),
                    }),
                }
            );

            const result =
                await response.json();

            console.log(
                "Paystack validation full response:",
                JSON.stringify(result, null, 2)
            );

            if (!response.ok || !result.status) {
                throw new HttpsError(
                    "failed-precondition",
                    result.message ||
                    "Could not validate this bank account."
                );
            }

            const verification =
                result.data || {};

            return {
                success: true,

                verified:
                    verification.verified === true,

                verificationMessage:
                    verification.verificationMessage ||
                    result.message ||
                    "Account verification attempted.",

                checks: {
                    accountHolderMatch:
                        verification.accountHolderMatch ??
                        null,

                    accountOpen:
                        verification.accountOpen ??
                        null,

                    accountAcceptsCredits:
                        verification.accountAcceptsCredits ??
                        null,

                    accountAcceptsDebits:
                        verification.accountAcceptsDebits ??
                        null,

                    accountOpenForMoreThanThreeMonths:
                        verification.accountOpenForMoreThanThreeMonths ??
                        null,
                },
            };
        } catch (error) {
            console.error(
                "Validate Paystack account error:",
                error
            );

            if (error instanceof HttpsError) {
                throw error;
            }

            throw new HttpsError(
                "internal",
                "Could not validate this bank account."
            );
        }
    }
);

exports.createMerchantPaystackSubaccount = onCall(
    {
        secrets: [PAYSTACK_SECRET_KEY],
        region: "us-central1",
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "You must be signed in."
            );
        }

        const merchantId = request.auth.uid;

        const {
            businessName,
            bankCode,
            bankName,
            accountNumber,
            accountName,
            phone,
        } = request.data || {};

        if (
            !businessName ||
            !bankCode ||
            !accountNumber ||
            !accountName
        ) {
            throw new HttpsError(
                "invalid-argument",
                "Complete and verify your payout details first."
            );
        }

        const merchantRef =
            db.collection("merchants").doc(merchantId);

        const merchantSnapshot =
            await merchantRef.get();

        if (!merchantSnapshot.exists) {
            throw new HttpsError(
                "not-found",
                "Merchant profile not found."
            );
        }

        const merchant =
            merchantSnapshot.data();

        /*
         * Don't accidentally create multiple Paystack
         * subaccounts every time the merchant taps Save.
         */
        if (
            merchant.paymentAccount?.subaccountCode
        ) {
            throw new HttpsError(
                "already-exists",
                "This merchant already has a payout account."
            );
        }

        /*
         * Default percentage is not important because
         * Cutin will override it per transaction using
         * transaction_charge.
         */
        const percentageCharge = 0;

        try {
            /*
             * IMPORTANT:
             * Resolve again SERVER-SIDE.
             *
             * We don't trust accountName sent by the phone.
             */
            const resolveUrl =
                "https://api.paystack.co/bank/resolve" +
                `?account_number=${encodeURIComponent(accountNumber)}` +
                `&bank_code=${encodeURIComponent(bankCode)}`;

            const resolveResponse =
                await fetch(resolveUrl, {
                    headers: {
                        Authorization:
                            `Bearer ${PAYSTACK_SECRET_KEY.value()}`,
                    },
                });

            const resolved =
                await resolveResponse.json();

            if (
                !resolveResponse.ok ||
                !resolved.status
            ) {
                throw new HttpsError(
                    "failed-precondition",
                    "The bank account could not be verified."
                );
            }

            const verifiedAccountName =
                resolved.data.account_name;

            // -------------------------------------------
            // CREATE PAYSTACK SUBACCOUNT
            // -------------------------------------------

            const response = await fetch(
                "https://api.paystack.co/subaccount",
                {
                    method: "POST",

                    headers: {
                        Authorization:
                            `Bearer ${PAYSTACK_SECRET_KEY.value()}`,

                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        business_name:
                            businessName,

                        bank_code:
                            bankCode,

                        account_number:
                            accountNumber,

                        percentage_charge:
                            percentageCharge,

                        description:
                            `Cutin merchant - ${businessName}`,

                        primary_contact_email:
                            request.auth.token.email || undefined,

                        primary_contact_phone:
                            phone || undefined,

                        metadata: {
                            merchantId,
                            platform: "cutin",
                        },
                    }),
                }
            );

            const result =
                await response.json();

            if (
                !response.ok ||
                !result.status
            ) {
                console.error(
                    "Create Paystack subaccount:",
                    result
                );

                throw new HttpsError(
                    "internal",
                    result.message ||
                    "Could not create payout account."
                );
            }

            const subaccount =
                result.data;

            const last4 =
                accountNumber.slice(-4);

            // -------------------------------------------
            // SAVE SAFE INFORMATION TO FIRESTORE
            // -------------------------------------------

            await merchantRef.set(
                {
                    paymentAccount: {
                        provider:
                            "paystack",

                        subaccountCode:
                            subaccount.subaccount_code,

                        accountName:
                            verifiedAccountName,

                        bankName:
                            bankName ||
                            subaccount.settlement_bank ||
                            "",

                        bankCode,

                        accountNumberLast4:
                            last4,

                        status:
                            subaccount.active === false
                                ? "inactive"
                                : "active",

                        payoutsEnabled:
                            subaccount.active !== false,

                        setupComplete:
                            true,

                        paystackSubaccountId:
                            subaccount.id,

                        createdAt:
                            admin.firestore.FieldValue.serverTimestamp(),
                    },

                    updatedAt:
                        admin.firestore.FieldValue.serverTimestamp(),
                },
                {
                    merge: true,
                }
            );

            return {
                success: true,

                subaccountCode:
                    subaccount.subaccount_code,

                accountName:
                    verifiedAccountName,

                bankName:
                    bankName ||
                    subaccount.settlement_bank,

                accountNumberLast4:
                    last4,
            };
        } catch (error) {
            console.error(
                "Merchant payout setup:",
                error
            );

            if (error instanceof HttpsError) {
                throw error;
            }

            throw new HttpsError(
                "internal",
                "Could not set up merchant payouts."
            );
        }
    }
);

exports.initializePaystackPayment = onCall(
    {
        secrets: [PAYSTACK_SECRET_KEY],
        region: "us-central1",
    },
    async (request) => {
        // =====================================================
        // 1. AUTHENTICATION
        // =====================================================

        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "You must be signed in."
            );
        }

        const {
            email,
            orderId,
        } = request.data || {};

        if (!email) {
            throw new HttpsError(
                "invalid-argument",
                "Customer email is required."
            );
        }

        if (!orderId) {
            throw new HttpsError(
                "invalid-argument",
                "Order ID is required."
            );
        }

        try {
            // =====================================================
            // 2. LOAD ORDER FROM FIRESTORE
            // =====================================================

            const orderRef = db
                .collection("orders")
                .doc(orderId);

            const orderSnapshot =
                await orderRef.get();

            if (!orderSnapshot.exists) {
                throw new HttpsError(
                    "not-found",
                    "Order was not found."
                );
            }

            const order =
                orderSnapshot.data();

            if (!order) {
                throw new HttpsError(
                    "not-found",
                    "Order data was not found."
                );
            }

            // =====================================================
            // 3. VERIFY CUSTOMER OWNS ORDER
            // =====================================================

            if (
                order.customerId !==
                request.auth.uid
            ) {
                throw new HttpsError(
                    "permission-denied",
                    "You are not allowed to pay for this order."
                );
            }

            // =====================================================
            // 4. GET MERCHANT ID FROM ORDER
            // =====================================================

            const merchantId =
                order.merchantId;

            if (!merchantId) {
                throw new HttpsError(
                    "failed-precondition",
                    "This order does not have a merchant."
                );
            }

            // =====================================================
            // 5. LOAD MERCHANT
            // =====================================================

            const merchantRef = db
                .collection("merchants")
                .doc(merchantId);

            const merchantSnapshot =
                await merchantRef.get();

            if (!merchantSnapshot.exists) {
                throw new HttpsError(
                    "not-found",
                    "Merchant was not found."
                );
            }

            const merchant =
                merchantSnapshot.data();

            if (!merchant) {
                throw new HttpsError(
                    "not-found",
                    "Merchant data was not found."
                );
            }

            // =====================================================
            // 6. VERIFY MERCHANT PAYOUT SETUP
            // =====================================================

            const paymentAccount =
                merchant.paymentAccount;

            if (
                !paymentAccount ||
                !paymentAccount.setupComplete ||
                !paymentAccount.payoutsEnabled ||
                !paymentAccount.subaccountCode
            ) {
                throw new HttpsError(
                    "failed-precondition",
                    "This merchant has not completed payout setup."
                );
            }

            const subaccountCode =
                paymentAccount.subaccountCode;

            // =====================================================
            // 7. GET ORDER AMOUNT FROM FIRESTORE
            // =====================================================

            /*
             * IMPORTANT:
             *
             * We no longer trust an amount sent by the mobile app.
             *
             * Firestore is the source of truth.
             *
             * If your order document uses a different field,
             * change order.total below.
             */

            const orderAmount =
                Number(order.total);

            if (
                !Number.isFinite(orderAmount) ||
                orderAmount <= 0
            ) {
                console.error(
                    "Invalid order amount:",
                    {
                        orderId,
                        total:
                            order.total,
                    }
                );

                throw new HttpsError(
                    "failed-precondition",
                    "The order has an invalid total amount."
                );
            }

            // =====================================================
            // 8. CUTIN TIERED COMMISSION
            // =====================================================

            /*
             * CUTIN COMMISSION MODEL
             *
             * R50 or less  = 3%
             * Above R50    = 5%
             *
             * Examples:
             *
             * R30  -> 3% -> R0.90
             * R50  -> 3% -> R1.50
             * R100 -> 5% -> R5.00
             * R200 -> 5% -> R10.00
             */

            const CUTIN_COMMISSION_RATE =
                orderAmount <= 50
                    ? 0.03
                    : 0.05;

            // =====================================================
            // 9. CALCULATE CUTIN FEE
            // =====================================================

            const platformFee =
                Number(
                    (
                        orderAmount *
                        CUTIN_COMMISSION_RATE
                    ).toFixed(2)
                );

            // =====================================================
            // 10. CALCULATE MERCHANT SHARE
            // =====================================================

            const merchantAmount =
                Number(
                    (
                        orderAmount -
                        platformFee
                    ).toFixed(2)
                );

            if (
                platformFee <= 0 ||
                merchantAmount <= 0
            ) {
                throw new HttpsError(
                    "failed-precondition",
                    "Could not calculate the payment split."
                );
            }

            // =====================================================
            // 11. CONVERT RANDS TO PAYSTACK SUBUNITS
            // =====================================================

            /*
             * Paystack expects ZAR amounts in cents.
             *
             * R100.00 -> 10000
             * R50.00  -> 5000
             */

            const amountInCents =
                Math.round(
                    orderAmount * 100
                );

            const platformFeeInCents =
                Math.round(
                    platformFee * 100
                );

            // =====================================================
            // 12. CREATE UNIQUE PAYMENT REFERENCE
            // =====================================================

            const reference =
                `CUTIN-${orderId}-${Date.now()}`;

            // =====================================================
            // 13. INITIALIZE PAYSTACK SPLIT PAYMENT
            // =====================================================

            const response = await fetch(
                "https://api.paystack.co/transaction/initialize",
                {
                    method: "POST",

                    headers: {
                        Authorization:
                            `Bearer ${PAYSTACK_SECRET_KEY.value()}`,

                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        // Customer
                        email,

                        // Full order amount
                        amount:
                            amountInCents,

                        currency:
                            "ZAR",

                        reference,

                        // Merchant Paystack subaccount
                        subaccount:
                            subaccountCode,

                        /*
                         * Amount Cutin receives.
                         *
                         * Paystack expects this in
                         * the currency subunit.
                         */
                        transaction_charge:
                            platformFeeInCents,

                        /*
                         * Cutin currently bears the
                         * Paystack transaction fee.
                         *
                         * If we later want the merchant
                         * to bear Paystack fees, change:
                         *
                         * "account"
                         *
                         * to:
                         *
                         * "subaccount"
                         */
                        bearer:
                            "account",

                        metadata: {
                            orderId,

                            merchantId,

                            customerId:
                                request.auth.uid,

                            source:
                                "cutin",

                            orderAmount,

                            platformFee,

                            merchantAmount,

                            commissionRate:
                                CUTIN_COMMISSION_RATE,
                        },
                    }),
                }
            );

            const result =
                await response.json();

            // =====================================================
            // 14. HANDLE PAYSTACK INITIALIZATION FAILURE
            // =====================================================

            if (
                !response.ok ||
                !result.status
            ) {
                console.error(
                    "Paystack initialize failed:",
                    result
                );

                throw new HttpsError(
                    "internal",
                    result.message ||
                    "Could not initialize payment."
                );
            }

            // =====================================================
            // 15. UPDATE ORDER
            // =====================================================

            await orderRef.update({
                paymentProvider:
                    "paystack",

                paymentStatus:
                    "processing",

                paystackReference:
                    reference,

                paymentSplit: {
                    total:
                        orderAmount,

                    platformFee,

                    merchantAmount,

                    platformFeeRate:
                        CUTIN_COMMISSION_RATE,

                    platformFeePercentage:
                        CUTIN_COMMISSION_RATE *
                        100,

                    subaccountCode,

                    bearer:
                        "account",
                },

                updatedAt:
                    admin.firestore
                        .FieldValue
                        .serverTimestamp(),
            });

            // =====================================================
            // 16. UPDATE PAYMENT RECORD
            // =====================================================

            const paymentQuery =
                await db
                    .collection("payments")
                    .where(
                        "orderId",
                        "==",
                        orderId
                    )
                    .limit(1)
                    .get();

            if (!paymentQuery.empty) {
                await paymentQuery
                    .docs[0]
                    .ref
                    .update({
                        provider:
                            "paystack",

                        providerReference:
                            reference,

                        providerTransactionId:
                            null,

                        paymentStatus:
                            "processing",

                        amount:
                            orderAmount,

                        platformFee,

                        platformFeeRate:
                            CUTIN_COMMISSION_RATE,

                        merchantAmount,

                        merchantId,

                        subaccountCode,

                        updatedAt:
                            admin.firestore
                                .FieldValue
                                .serverTimestamp(),
                    });
            }

            // =====================================================
            // 17. LOG INITIALIZED PAYMENT
            // =====================================================

            console.log(
                "Cutin split payment initialized:",
                {
                    orderId,

                    merchantId,

                    customerId:
                        request.auth.uid,

                    orderAmount,

                    commissionRate:
                        `${CUTIN_COMMISSION_RATE * 100}%`,

                    platformFee,

                    merchantAmount,

                    subaccountCode,

                    reference,
                }
            );

            // =====================================================
            // 18. RETURN CHECKOUT DETAILS
            // =====================================================

            return {
                authorizationUrl:
                    result.data
                        .authorization_url,

                accessCode:
                    result.data
                        .access_code,

                reference:
                    result.data
                        .reference,

                split: {
                    total:
                        orderAmount,

                    cutinFee:
                        platformFee,

                    commissionRate:
                        CUTIN_COMMISSION_RATE,

                    commissionPercentage:
                        CUTIN_COMMISSION_RATE *
                        100,

                    merchantAmount,
                },
            };
        } catch (error) {
            console.error(
                "Initialize Paystack error:",
                error
            );

            if (
                error instanceof
                HttpsError
            ) {
                throw error;
            }

            throw new HttpsError(
                "internal",
                "Could not initialize Paystack payment."
            );
        }
    }
);

exports.verifyPaystackPayment = onCall(
    {
        secrets: [PAYSTACK_SECRET_KEY],
        region: "us-central1",
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError(
                "unauthenticated",
                "You must be signed in."
            );
        }

        const reference =
            String(
                request.data?.reference || ""
            ).trim();

        if (!reference) {
            throw new HttpsError(
                "invalid-argument",
                "Payment reference is required."
            );
        }

        try {
            const response = await fetch(
                `https://api.paystack.co/transaction/verify/${encodeURIComponent(
                    reference
                )}`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${PAYSTACK_SECRET_KEY.value()}`,
                    },
                }
            );

            const result = await response.json();

            if (!response.ok || !result.status) {
                throw new HttpsError(
                    "internal",
                    "Could not verify payment."
                );
            }

            const transaction = result.data;

            const orderId =
                transaction.metadata?.orderId;

            if (!orderId) {
                throw new HttpsError(
                    "failed-precondition",
                    "Payment has no Cutin order."
                );
            }

            const success =
                transaction.status === "success";

            const paidAmount =
                Number(transaction.amount || 0) / 100;

            const orderRef =
                db.collection("orders").doc(orderId);

            const orderSnapshot =
                await orderRef.get();

            if (!orderSnapshot.exists) {
                throw new HttpsError(
                    "not-found",
                    "Order not found."
                );
            }

            const order =
                orderSnapshot.data();

            const expectedAmount =
                Number(order.customerAmount ?? order.total ?? 0);

            if (
                Math.abs(
                    paidAmount - expectedAmount
                ) > 0.01
            ) {
                throw new HttpsError(
                    "failed-precondition",
                    "Payment amount does not match order."
                );
            }

            await orderRef.update({
                paymentStatus:
                    success ? "paid" : transaction.status,

                paystackReference:
                    reference,

                paystackTransactionId:
                    String(transaction.id || ""),

                paidAt:
                    success
                        ? admin.firestore.FieldValue.serverTimestamp()
                        : null,

                updatedAt:
                    admin.firestore.FieldValue.serverTimestamp(),
            });

            const paymentQuery = await db
                .collection("payments")
                .where("orderId", "==", orderId)
                .limit(1)
                .get();

            if (!paymentQuery.empty) {
                await paymentQuery.docs[0].ref.update({
                    provider: "paystack",

                    providerReference:
                        reference,

                    providerTransactionId:
                        String(transaction.id || ""),

                    paymentStatus:
                        success ? "paid" : transaction.status,

                    paidAt:
                        success
                            ? admin.firestore.FieldValue.serverTimestamp()
                            : null,

                    updatedAt:
                        admin.firestore.FieldValue.serverTimestamp(),
                });
            }

            return {
                success,
                status: transaction.status,
                orderId,
                paidAmount,
            };
        } catch (error) {
            console.error(
                "Verify Paystack error:",
                error
            );

            if (error instanceof HttpsError) {
                throw error;
            }

            throw new HttpsError(
                "internal",
                "Could not verify payment."
            );
        }
    }
);

exports.paystackWebhook = onRequest(
    {
        secrets: [PAYSTACK_SECRET_KEY],
        region: "us-central1",
    },
    async (request, response) => {
        try {
            const hash = crypto
                .createHmac(
                    "sha512",
                    PAYSTACK_SECRET_KEY.value()
                )
                .update(
                    JSON.stringify(request.body)
                )
                .digest("hex");

            if (
                hash !== request.headers[
                "x-paystack-signature"
                ]
            ) {
                response
                    .status(401)
                    .send("Invalid signature");

                return;
            }

            const event = request.body;

            if (
                event.event !== "charge.success"
            ) {
                response
                    .status(200)
                    .send("Ignored");

                return;
            }

            const transaction =
                event.data;

            const orderId =
                transaction.metadata?.orderId;

            if (!orderId) {
                response
                    .status(200)
                    .send("No order");

                return;
            }

            const orderRef =
                db.collection("orders").doc(orderId);

            const orderSnapshot =
                await orderRef.get();

            if (!orderSnapshot.exists) {
                response
                    .status(200)
                    .send("Order missing");

                return;
            }

            const order =
                orderSnapshot.data();

            const paidAmount =
                Number(transaction.amount || 0) /
                100;

            const expectedAmount =
                Number(
                    order.customerAmount ??
                    order.total ??
                    0
                );

            if (
                Math.abs(
                    paidAmount -
                    expectedAmount
                ) > 0.01
            ) {
                console.error(
                    "Webhook amount mismatch",
                    {
                        orderId,
                        paidAmount,
                        expectedAmount,
                    }
                );

                response
                    .status(200)
                    .send("Amount mismatch");

                return;
            }

            await orderRef.update({
                paymentStatus: "paid",

                paymentProvider:
                    "paystack",

                paystackReference:
                    transaction.reference,

                paystackTransactionId:
                    String(transaction.id || ""),

                paidAt:
                    admin.firestore.FieldValue.serverTimestamp(),

                updatedAt:
                    admin.firestore.FieldValue.serverTimestamp(),
            });

            const paymentQuery =
                await db
                    .collection("payments")
                    .where(
                        "orderId",
                        "==",
                        orderId
                    )
                    .limit(1)
                    .get();

            if (!paymentQuery.empty) {
                await paymentQuery.docs[0].ref.update({
                    provider:
                        "paystack",

                    providerReference:
                        transaction.reference,

                    providerTransactionId:
                        String(transaction.id || ""),

                    paymentStatus:
                        "paid",

                    paidAt:
                        admin.firestore.FieldValue.serverTimestamp(),

                    updatedAt:
                        admin.firestore.FieldValue.serverTimestamp(),
                });
            }

            response
                .status(200)
                .send("OK");
        } catch (error) {
            console.error(
                "Paystack webhook error:",
                error
            );

            response
                .status(500)
                .send("Webhook error");
        }
    }
);

