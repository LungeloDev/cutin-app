
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/services/firebase";

const functions = getFunctions(app, "us-central1");

export type MerchantSettlement = {
    id: string;
    status: "success" | "pending" | "processing" | "failed";
    currency: string;
    amount: number;
    fees: number;
    totalProcessed: number;
    date: string | null;
};

export type MerchantSettlementResponse = {
    connected: boolean;
    settlements: MerchantSettlement[];
    summary: {
        paidOut: number;
        pending: number;
        processing: number;
        failed: number;
    };
    hasMore?: boolean;
};

const getSettlements = httpsCallable<
    Record<string, never>,
    MerchantSettlementResponse
>(functions, "getMerchantSettlements");

export async function getMerchantSettlements() {
    const response = await getSettlements({});
    return response.data;
}
