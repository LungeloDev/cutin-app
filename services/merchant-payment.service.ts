import {
    getFunctions,
    httpsCallable,
} from "firebase/functions";

import { app } from "@/services/firebase";

const functions = getFunctions(
    app,
    "us-central1"
);

// ---------------------------------------------
// TYPES
// ---------------------------------------------

export type PaystackBank = {
    name: string;
    code: string;
    slug?: string | null;
};

export type MerchantPaymentAccount = {
    provider: "paystack";

    subaccountCode: string;

    accountName: string;
    bankName: string;
    bankCode: string;

    accountNumberLast4: string;

    status: string;

    payoutsEnabled: boolean;
    setupComplete: boolean;
};

export type PaystackAccountValidationChecks = {
    accountHolderMatch: boolean | null;
    accountOpen: boolean | null;
    accountAcceptsCredits: boolean | null;
    accountAcceptsDebits: boolean | null;
    accountOpenForMoreThanThreeMonths: boolean | null;
};

export type PaystackAccountValidationResponse = {
    success: boolean;

    verified: boolean;

    verificationMessage: string;

    checks: PaystackAccountValidationChecks;
};

// ---------------------------------------------
// FIREBASE FUNCTIONS
// ---------------------------------------------

const listBanksFunction =
    httpsCallable<
        Record<string, never>,
        {
            banks: PaystackBank[];
        }
    >(
        functions,
        "listPaystackBanks"
    );

const createSubaccountFunction =
    httpsCallable<
        {
            businessName: string;
            bankCode: string;
            bankName: string;
            accountNumber: string;
            accountName: string;
            phone?: string;
        },
        {
            success: boolean;

            subaccountCode: string;

            accountName: string;
            bankName: string;

            accountNumberLast4: string;
        }
    >(
        functions,
        "createMerchantPaystackSubaccount"
    );

const validateAccountFunction =
    httpsCallable<
        {
            accountNumber: string;
            bankCode: string;
            accountName: string;

            accountType:
            | "personal"
            | "business";

            documentNumber: string;

            documentType:
            | "identityNumber"
            | "passportNumber"
            | "businessRegistrationNumber";
        },
        PaystackAccountValidationResponse
    >(
        functions,
        "validatePaystackAccount"
    );

// ---------------------------------------------
// API
// ---------------------------------------------

export async function getPaystackBanks() {
    const response =
        await listBanksFunction({});

    return response.data.banks;
}

export async function validatePaystackAccount(
    accountNumber: string,
    bankCode: string,
    accountName: string,
    accountType:
        | "personal"
        | "business",
    documentNumber: string,
    documentType:
        | "identityNumber"
        | "passportNumber"
        | "businessRegistrationNumber"
) {
    const response =
        await validateAccountFunction({
            accountNumber,
            bankCode,
            accountName,
            accountType,
            documentNumber,
            documentType,
        });

    return response.data;
}

export async function createMerchantPayoutAccount(
    input: {
        businessName: string;
        bankCode: string;
        bankName: string;
        accountNumber: string;
        accountName: string;
        phone?: string;
    }
) {
    const response =
        await createSubaccountFunction(
            input
        );

    return response.data;
}