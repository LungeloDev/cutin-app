
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/services/firebase";

const functions = getFunctions(app, "us-central1");

export type ZakaMateMessage = {
    role: "user" | "assistant";
    content: string;
};

export type MerchantZakaMateContext = {
    shopName: string;
    sampledOrderCount: number;
    sampledPaidOrders: number;
    sampledRevenue: number;
    monthlyPaidOrders: number;
    monthlyRevenue: number;
    monthlyCommission: number;
    monthlyMerchantShare: number;
    averageOrder: number;
    topProducts: {
        name: string;
        quantity: number;
    }[];
};

type MerchantZakaMateResponse = {
    message: string;
    context: MerchantZakaMateContext;
};

const merchantChatFunction = httpsCallable<
    {
        message: string;
        history: ZakaMateMessage[];
    },
    MerchantZakaMateResponse
>(functions, "merchantZakaMateChat");

export async function askMerchantZakaMate(
    message: string,
    history: ZakaMateMessage[] = []
) {
    const response = await merchantChatFunction({
        message,
        history,
    });

    return response.data;
}
