import {
    getFunctions,
    httpsCallable,
} from "firebase/functions";

import { app } from "@/services/firebase";

const functions = getFunctions(
    app,
    "us-central1"
);

// =========================================================
// INITIALIZE PAYSTACK PAYMENT
// =========================================================

type InitializePaymentInput = {
    email: string;
    orderId: string;
};

type PaymentSplit = {
    total: number;
    cutinFee: number;
    commissionRate: number;
    commissionPercentage: number;
    merchantAmount: number;
};

type InitializePaymentResponse = {
    authorizationUrl: string;
    accessCode: string;
    reference: string;
    split: PaymentSplit;
};

// =========================================================
// VERIFY PAYSTACK PAYMENT
// =========================================================

type VerifyPaymentResponse = {
    success: boolean;
    status: string;
    orderId: string;
    paidAmount: number;
};

// =========================================================
// FIREBASE CALLABLE FUNCTIONS
// =========================================================

const initializePaymentFunction =
    httpsCallable<
        InitializePaymentInput,
        InitializePaymentResponse
    >(
        functions,
        "initializePaystackPayment"
    );

const verifyPaymentFunction =
    httpsCallable<
        { reference: string },
        VerifyPaymentResponse
    >(
        functions,
        "verifyPaystackPayment"
    );

// =========================================================
// INITIALIZE PAYMENT
// =========================================================

export async function initializePaystackPayment(
    input: InitializePaymentInput
) {
    const response =
        await initializePaymentFunction(
            input
        );

    return response.data;
}

// =========================================================
// VERIFY PAYMENT
// =========================================================

export async function verifyPaystackPayment(
    reference: string
) {
    const response =
        await verifyPaymentFunction({
            reference,
        });

    return response.data;
}