import {
    getFunctions,
    httpsCallable,
} from "firebase/functions";

import { app } from "@/services/firebase";

export type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};

export type BudgetChatContext = {
    monthlyBudget: number;
    thisMonth: number;
    remaining: number;
    averageOrder: number;
    completedOrders: number;
    allTime: number;

    savingGoalTitle?: string;
    savingGoalAmount?: number;
    savedAmount?: number;
};

type BudgetChatResponse = {
    message: string;
};

const functions = getFunctions(
    app,
    "us-central1"
);

const budgetChat =
    httpsCallable<
        {
            message: string;
            financialContext: BudgetChatContext;
            history: ChatMessage[];
        },
        BudgetChatResponse
    >(
        functions,
        "budgetChat"
    );

export async function askBudgetCoach(
    message: string,
    financialContext: BudgetChatContext,
    history: ChatMessage[]
): Promise<string> {
    const cleanMessage =
        message.trim();

    if (!cleanMessage) {
        throw new Error(
            "A message is required."
        );
    }

    const response =
        await budgetChat({
            message: cleanMessage,

            financialContext,

            history: history.slice(-8),
        });

    if (!response.data?.message) {
        throw new Error(
            "Cutin Coach returned no response."
        );
    }

    return response.data.message;
}