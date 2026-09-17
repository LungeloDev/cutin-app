import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/hooks/use-auth";

import {
    getCustomerBudgetProfile,
    getCustomerSpendingStats,
    updateCustomerFoodBudget,
    updateCustomerSavingGoal,
} from "@/services/customer.service";

import {
    askBudgetCoach,
    ChatMessage,
} from "@/services/ai.service";

const quickPrompts = [
    "Help me stay within my food budget",
    "How much should I spend per order?",
    "How can I reduce my food spending?",
];

const categoryIcons: Record<string, any> = {
    kota: "fast-food-outline",
    burgers: "restaurant-outline",
    burger: "restaurant-outline",
    chicken: "nutrition-outline",
    pizza: "pizza-outline",
    drinks: "cafe-outline",
    snacks: "ice-cream-outline",
    breakfast: "sunny-outline",
    desserts: "ice-cream-outline",
    healthy: "leaf-outline",
    groceries: "basket-outline",
    other: "ellipsis-horizontal-outline",
};

export default function BudgetingScreen() {
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // ---------------------------------------------------------------------------
    // Firebase values
    // ---------------------------------------------------------------------------

    const [monthlyBudget, setMonthlyBudget] = useState(0);
    const [spentThisMonth, setSpentThisMonth] = useState(0);
    const [allTimeSpend, setAllTimeSpend] = useState(0);
    const [averageOrder, setAverageOrder] = useState(0);
    const [completedOrders, setCompletedOrders] = useState(0);

    const [savingGoalTitle, setSavingGoalTitle] = useState("");
    const [savingGoal, setSavingGoal] = useState(0);
    const [savedAmount, setSavedAmount] = useState(0);

    const [spendingBreakdown, setSpendingBreakdown] = useState<
        {
            label: string;
            amount: number;
        }[]
    >([]);

    // ---------------------------------------------------------------------------
    // Budget modal
    // ---------------------------------------------------------------------------

    const [budgetModalOpen, setBudgetModalOpen] = useState(false);
    const [budgetInput, setBudgetInput] = useState("");

    // ---------------------------------------------------------------------------
    // Monthly plan
    // ---------------------------------------------------------------------------

    const [monthlyPlanOpen, setMonthlyPlanOpen] = useState(false);

    // ---------------------------------------------------------------------------
    // Saving goal
    // ---------------------------------------------------------------------------

    const [goalModalOpen, setGoalModalOpen] = useState(false);
    const [goalTitleInput, setGoalTitleInput] = useState("");
    const [goalAmountInput, setGoalAmountInput] = useState("");
    const [savedAmountInput, setSavedAmountInput] = useState("");

    // ---------------------------------------------------------------------------
    // AI chat
    // ---------------------------------------------------------------------------

    const [chatOpen, setChatOpen] = useState(false);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: "assistant",
            content:
                "Hi 👋 I’m Cutin Coach. I can help you understand your food spending and stay within your monthly budget.",
        },
    ]);

    // ---------------------------------------------------------------------------
    // Load Firebase data
    // ---------------------------------------------------------------------------

    const loadBudgetData = async () => {
        if (!user?.uid) {
            return;
        }

        setLoading(true);

        try {
            const [profile, stats] = await Promise.all([
                getCustomerBudgetProfile(user.uid),
                getCustomerSpendingStats(user.uid),
            ]);

            setMonthlyBudget(profile.monthlyFoodBudget || 0);

            setSpentThisMonth(stats.thisMonth || 0);
            setAllTimeSpend(stats.allTime || 0);
            setAverageOrder(stats.averageOrder || 0);
            setCompletedOrders(stats.completedOrders || 0);

            setSpendingBreakdown(
                stats.categoryBreakdown || []
            );

            setSavingGoalTitle(
                profile.savingGoal?.title || ""
            );

            setSavingGoal(
                profile.savingGoal?.targetAmount || 0
            );

            setSavedAmount(
                profile.savingGoal?.savedAmount || 0
            );
        } catch (error) {
            console.error(
                "Failed to load budgeting data:",
                error
            );

            Alert.alert(
                "Could not load spending",
                "We couldn't load your food spending information."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBudgetData();
    }, [user?.uid]);

    // ---------------------------------------------------------------------------
    // Calculated values
    // ---------------------------------------------------------------------------

    const remaining = Math.max(
        monthlyBudget - spentThisMonth,
        0
    );

    const budgetProgress =
        monthlyBudget > 0
            ? Math.min(
                (spentThisMonth / monthlyBudget) * 100,
                100
            )
            : 0;

    const goalProgress =
        savingGoal > 0
            ? Math.min(
                (savedAmount / savingGoal) * 100,
                100
            )
            : 0;

    const today = new Date();

    const daysInMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
    ).getDate();

    const remainingDays = Math.max(
        daysInMonth - today.getDate() + 1,
        1
    );

    const dailyAllowance =
        remaining > 0
            ? remaining / remainingDays
            : 0;

    const estimatedOrdersRemaining =
        averageOrder > 0
            ? Math.floor(remaining / averageOrder)
            : 0;

    const breakdownWithPercentages = useMemo(() => {
        if (spentThisMonth <= 0) {
            return spendingBreakdown.map((item) => ({
                ...item,
                percentage: 0,
            }));
        }

        return spendingBreakdown.map((item) => ({
            ...item,

            percentage: Math.min(
                (item.amount / spentThisMonth) * 100,
                100
            ),
        }));
    }, [spendingBreakdown, spentThisMonth]);

    // ---------------------------------------------------------------------------
    // Save budget
    // ---------------------------------------------------------------------------

    const openBudgetModal = () => {
        setBudgetInput(
            monthlyBudget > 0
                ? String(monthlyBudget)
                : ""
        );

        setBudgetModalOpen(true);
    };

    const saveBudget = async () => {
        if (!user?.uid) {
            return;
        }

        const amount = Number(
            budgetInput.replace(",", ".")
        );

        if (!amount || amount <= 0) {
            Alert.alert(
                "Invalid budget",
                "Enter a monthly food budget greater than R0."
            );

            return;
        }

        setSaving(true);

        try {
            await updateCustomerFoodBudget(
                user.uid,
                amount
            );

            setBudgetModalOpen(false);

            await loadBudgetData();

            Alert.alert(
                "Budget updated",
                `Your monthly food budget is now R ${amount.toFixed(
                    2
                )}.`
            );
        } catch (error) {
            console.error(error);

            Alert.alert(
                "Could not update budget",
                "Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Saving goal
    // ---------------------------------------------------------------------------

    const openGoalModal = () => {
        setGoalTitleInput(savingGoalTitle);

        setGoalAmountInput(
            savingGoal > 0
                ? String(savingGoal)
                : ""
        );

        setSavedAmountInput(
            savedAmount > 0
                ? String(savedAmount)
                : ""
        );

        setGoalModalOpen(true);
    };

    const saveGoal = async () => {
        if (!user?.uid) {
            return;
        }

        const targetAmount = Number(
            goalAmountInput.replace(",", ".")
        );

        const saved = Number(
            savedAmountInput.replace(",", ".")
        );

        if (!goalTitleInput.trim()) {
            Alert.alert(
                "Goal name required",
                "Tell Cutin what you're saving towards."
            );

            return;
        }

        if (!targetAmount || targetAmount <= 0) {
            Alert.alert(
                "Invalid goal",
                "Enter a saving goal greater than R0."
            );

            return;
        }

        setSaving(true);

        try {
            await updateCustomerSavingGoal(
                user.uid,
                {
                    title: goalTitleInput.trim(),
                    targetAmount,
                    savedAmount: Math.max(saved || 0, 0),
                }
            );

            setGoalModalOpen(false);

            await loadBudgetData();
        } catch (error) {
            console.error(error);

            Alert.alert(
                "Could not update goal",
                "Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    // ---------------------------------------------------------------------------
    // OpenAI
    // ---------------------------------------------------------------------------

    const sendMessage = async (
        suggestedPrompt?: string
    ) => {
        const message =
            (suggestedPrompt || chatInput).trim();

        if (!message || chatLoading) {
            return;
        }

        const userMessage: ChatMessage = {
            role: "user",
            content: message,
        };

        const previousMessages = messages;

        setMessages([
            ...messages,
            userMessage,
        ]);

        setChatInput("");
        setChatLoading(true);

        try {
            const response =
                await askBudgetCoach(
                    message,
                    {
                        monthlyBudget,
                        thisMonth: spentThisMonth,
                        remaining,
                        averageOrder,
                        completedOrders,
                        allTime: allTimeSpend,

                        savingGoalTitle,

                        savingGoalAmount:
                            savingGoal,

                        savedAmount,
                    },
                    previousMessages
                );

            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content: response,
                },
            ]);
        } catch (error) {
            console.error(
                "Cutin Coach error:",
                error
            );

            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content:
                        "I couldn't reach Cutin Coach right now. Please try again shortly.",
                },
            ]);
        } finally {
            setChatLoading(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Loading
    // ---------------------------------------------------------------------------

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center">
                <ActivityIndicator
                    size="large"
                    color="#2563EB"
                />

                <Text className="text-gray-500 mt-4">
                    Analysing your food spending...
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-[#F8FAFC]">

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerClassName="px-5 pb-32"
            >

                {/* HEADER */}

                <View className="pt-4 mb-6">

                    <Text className="text-gray-500 text-sm font-medium">
                        Your money
                    </Text>

                    <Text className="text-3xl font-extrabold text-gray-950 mt-1">
                        Food Spending
                    </Text>

                    <Text className="text-gray-500 mt-2 leading-5">
                        Understand what you spend, plan your month and make smarter food choices.
                    </Text>

                </View>

                {/* HERO */}

                <View className="bg-[#0F172A] rounded-[32px] p-5 mb-5">

                    <View className="flex-row items-start justify-between">

                        <View className="flex-1 pr-3">

                            <Text className="text-gray-400 text-sm">
                                Remaining this month
                            </Text>

                            <Text className="text-white text-4xl font-extrabold mt-2">
                                R {remaining.toFixed(2)}
                            </Text>

                            {monthlyBudget > 0 ? (
                                <Text className="text-gray-400 mt-2">
                                    of R {monthlyBudget.toFixed(2)} budget
                                </Text>
                            ) : (
                                <Text className="text-gray-400 mt-2">
                                    Set a monthly budget to start tracking
                                </Text>
                            )}

                        </View>

                        <View className="w-14 h-14 rounded-2xl bg-blue-600 items-center justify-center">
                            <Ionicons
                                name="wallet-outline"
                                size={26}
                                color="white"
                            />
                        </View>

                    </View>

                    <View className="mt-6">

                        <View className="flex-row justify-between mb-2">

                            <Text className="text-gray-400 text-xs">
                                Monthly usage
                            </Text>

                            <Text className="text-white text-xs font-bold">
                                {Math.round(budgetProgress)}%
                            </Text>

                        </View>

                        <View className="h-3 bg-white/10 rounded-full overflow-hidden">

                            <View
                                className="h-full bg-blue-500 rounded-full"
                                style={{
                                    width: `${budgetProgress}%`,
                                }}
                            />

                        </View>

                        <View className="flex-row justify-between mt-3">

                            <Text className="text-gray-400 text-xs">
                                Spent R {spentThisMonth.toFixed(2)}
                            </Text>

                            <Text className="text-gray-400 text-xs">
                                R {remaining.toFixed(2)} available
                            </Text>

                        </View>

                    </View>

                </View>

                {/* STATS */}

                <View className="flex-row mb-4">

                    <View className="flex-1 bg-white rounded-[26px] p-4 mr-2 shadow-sm">

                        <View className="w-10 h-10 bg-blue-50 rounded-2xl items-center justify-center mb-3">
                            <Ionicons
                                name="calendar-outline"
                                size={20}
                                color="#2563EB"
                            />
                        </View>

                        <Text className="text-gray-500 text-xs">
                            This month
                        </Text>

                        <Text className="text-gray-950 font-extrabold text-xl mt-1">
                            R {spentThisMonth.toFixed(2)}
                        </Text>

                    </View>

                    <View className="flex-1 bg-white rounded-[26px] p-4 ml-2 shadow-sm">

                        <View className="w-10 h-10 bg-emerald-50 rounded-2xl items-center justify-center mb-3">
                            <Ionicons
                                name="receipt-outline"
                                size={20}
                                color="#059669"
                            />
                        </View>

                        <Text className="text-gray-500 text-xs">
                            Avg. order
                        </Text>

                        <Text className="text-gray-950 font-extrabold text-xl mt-1">
                            R {averageOrder.toFixed(2)}
                        </Text>

                    </View>

                </View>

                <View className="flex-row mb-6">

                    <View className="flex-1 bg-white rounded-[26px] p-4 mr-2 shadow-sm">

                        <View className="w-10 h-10 bg-orange-50 rounded-2xl items-center justify-center mb-3">
                            <Ionicons
                                name="bag-check-outline"
                                size={20}
                                color="#EA580C"
                            />
                        </View>

                        <Text className="text-gray-500 text-xs">
                            Completed
                        </Text>

                        <Text className="text-gray-950 font-extrabold text-xl mt-1">
                            {completedOrders} orders
                        </Text>

                    </View>

                    <View className="flex-1 bg-white rounded-[26px] p-4 ml-2 shadow-sm">

                        <View className="w-10 h-10 bg-purple-50 rounded-2xl items-center justify-center mb-3">
                            <Ionicons
                                name="stats-chart-outline"
                                size={20}
                                color="#7C3AED"
                            />
                        </View>

                        <Text className="text-gray-500 text-xs">
                            All-time spend
                        </Text>

                        <Text className="text-gray-950 font-extrabold text-xl mt-1">
                            R {allTimeSpend.toFixed(0)}
                        </Text>

                    </View>

                </View>

                {/* PLAN SPENDING */}

                <Text className="text-gray-950 text-xl font-extrabold mb-3">
                    Plan your spending
                </Text>

                <View className="flex-row mb-6">

                    <TouchableOpacity
                        onPress={openBudgetModal}
                        className="flex-1 bg-blue-600 rounded-[26px] p-4 mr-2"
                    >

                        <View className="w-11 h-11 bg-white/20 rounded-2xl items-center justify-center">
                            <Ionicons
                                name="wallet-outline"
                                size={22}
                                color="white"
                            />
                        </View>

                        <Text className="text-white font-extrabold mt-4">
                            {monthlyBudget > 0
                                ? "Edit Budget"
                                : "Set Budget"}
                        </Text>

                        <Text className="text-blue-100 text-xs mt-1">
                            Control your monthly food spend
                        </Text>

                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() =>
                            setMonthlyPlanOpen(true)
                        }
                        className="flex-1 bg-white rounded-[26px] p-4 ml-2 shadow-sm"
                    >

                        <View className="w-11 h-11 bg-orange-50 rounded-2xl items-center justify-center">
                            <Ionicons
                                name="calendar-outline"
                                size={22}
                                color="#EA580C"
                            />
                        </View>

                        <Text className="text-gray-950 font-extrabold mt-4">
                            Monthly Plan
                        </Text>

                        <Text className="text-gray-500 text-xs mt-1">
                            See what you can still afford
                        </Text>

                    </TouchableOpacity>

                </View>

                {/* CUTIN COACH */}

                <View className="bg-blue-50 rounded-[30px] p-5 mb-6 border border-blue-100">

                    <View className="flex-row items-center">

                        <View className="w-12 h-12 bg-blue-600 rounded-2xl items-center justify-center mr-3">
                            <Ionicons
                                name="sparkles"
                                size={23}
                                color="white"
                            />
                        </View>

                        <View className="flex-1">

                            <Text className="text-gray-950 text-xl font-extrabold">
                                Cutin Coach
                            </Text>

                            <Text className="text-gray-500 text-sm mt-1">
                                AI-powered food spending guidance
                            </Text>

                        </View>

                    </View>

                    <View className="bg-white rounded-2xl p-4 mt-4">

                        {monthlyBudget > 0 ? (

                            <Text className="text-gray-700 leading-6">

                                You've used{" "}

                                <Text className="font-bold text-gray-950">
                                    {Math.round(budgetProgress)}%
                                </Text>{" "}

                                of your monthly food budget.

                                {remaining > 0 && (
                                    <>
                                        {" "}You still have{" "}

                                        <Text className="font-bold text-blue-600">
                                            R {remaining.toFixed(2)}
                                        </Text>{" "}

                                        available.
                                    </>
                                )}

                            </Text>

                        ) : (

                            <Text className="text-gray-700 leading-6">
                                Set a monthly food budget and Cutin Coach will help you track your spending and make better decisions.
                            </Text>

                        )}

                    </View>

                    <TouchableOpacity
                        onPress={() =>
                            setChatOpen(true)
                        }
                        className="flex-row items-center justify-between mt-4"
                    >

                        <Text className="text-blue-700 font-bold">
                            Ask Cutin Coach
                        </Text>

                        <Ionicons
                            name="arrow-forward"
                            size={18}
                            color="#1D4ED8"
                        />

                    </TouchableOpacity>

                </View>

                {/* SPENDING BREAKDOWN */}

                <View className="mb-6">

                    <View className="flex-row items-center justify-between mb-4">

                        <Text className="text-gray-950 text-xl font-extrabold">
                            Spending Breakdown
                        </Text>

                        <Text className="text-gray-500 text-xs">
                            This month
                        </Text>

                    </View>

                    <View className="bg-white rounded-[30px] p-5 shadow-sm">

                        {breakdownWithPercentages.length === 0 ? (

                            <View className="items-center py-8">

                                <View className="w-14 h-14 rounded-2xl bg-gray-50 items-center justify-center mb-3">
                                    <Ionicons
                                        name="pie-chart-outline"
                                        size={25}
                                        color="#94A3B8"
                                    />
                                </View>

                                <Text className="text-gray-950 font-bold">
                                    No spending categories yet
                                </Text>

                                <Text className="text-gray-500 text-sm text-center mt-1">
                                    Completed orders will automatically appear here.
                                </Text>

                            </View>

                        ) : (

                            breakdownWithPercentages.map(
                                (item, index) => {

                                    const key =
                                        item.label.toLowerCase();

                                    const icon =
                                        categoryIcons[key] ||
                                        "restaurant-outline";

                                    return (
                                        <View
                                            key={`${item.label}-${index}`}
                                            className={
                                                index !==
                                                    breakdownWithPercentages.length -
                                                    1
                                                    ? "mb-5"
                                                    : ""
                                            }
                                        >

                                            <View className="flex-row items-center justify-between">

                                                <View className="flex-row items-center flex-1">

                                                    <View className="w-11 h-11 bg-gray-50 rounded-2xl items-center justify-center mr-3">

                                                        <Ionicons
                                                            name={icon}
                                                            size={21}
                                                            color="#2563EB"
                                                        />

                                                    </View>

                                                    <View>

                                                        <Text className="text-gray-950 font-bold">
                                                            {item.label}
                                                        </Text>

                                                        <Text className="text-gray-400 text-xs mt-1">
                                                            {Math.round(
                                                                item.percentage
                                                            )}
                                                            % of spending
                                                        </Text>

                                                    </View>

                                                </View>

                                                <Text className="text-gray-950 font-extrabold">
                                                    R {item.amount.toFixed(2)}
                                                </Text>

                                            </View>

                                            <View className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">

                                                <View
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{
                                                        width: `${item.percentage}%`,
                                                    }}
                                                />

                                            </View>

                                        </View>
                                    );
                                }
                            )

                        )}

                    </View>

                </View>

                {/* SAVING GOAL */}

                <View className="bg-white rounded-[30px] p-5 mb-6 shadow-sm">

                    <View className="flex-row items-center justify-between">

                        <View className="flex-1">

                            <Text className="text-gray-950 text-xl font-extrabold">
                                Saving Goal
                            </Text>

                            <Text className="text-gray-500 mt-1">
                                {savingGoalTitle ||
                                    "Create a goal to start saving"}
                            </Text>

                        </View>

                        <View className="w-12 h-12 bg-purple-50 rounded-2xl items-center justify-center">
                            <Ionicons
                                name="flag-outline"
                                size={23}
                                color="#7C3AED"
                            />
                        </View>

                    </View>

                    {savingGoal > 0 && (

                        <>
                            <View className="bg-gray-50 rounded-2xl p-4 mt-5">

                                <View className="flex-row justify-between items-center">

                                    <View>

                                        <Text className="text-gray-500 text-xs">
                                            Goal
                                        </Text>

                                        <Text className="text-gray-950 font-extrabold text-lg mt-1">
                                            {savingGoalTitle}
                                        </Text>

                                    </View>

                                    <Text className="text-gray-950 font-extrabold">
                                        R {savingGoal.toFixed(2)}
                                    </Text>

                                </View>

                            </View>

                            <View className="mt-5">

                                <View className="flex-row justify-between mb-2">

                                    <Text className="text-gray-500 text-xs">
                                        R {savedAmount.toFixed(2)} saved
                                    </Text>

                                    <Text className="text-gray-950 text-xs font-bold">
                                        {Math.round(goalProgress)}%
                                    </Text>

                                </View>

                                <View className="h-3 bg-gray-100 rounded-full overflow-hidden">

                                    <View
                                        className="h-full bg-purple-500 rounded-full"
                                        style={{
                                            width: `${goalProgress}%`,
                                        }}
                                    />

                                </View>

                            </View>
                        </>

                    )}

                    <TouchableOpacity
                        onPress={openGoalModal}
                        className="bg-[#0F172A] rounded-2xl py-4 px-4 mt-5 flex-row items-center justify-center"
                    >

                        <Text className="text-white font-bold">
                            {savingGoal > 0
                                ? "Update Saving Goal"
                                : "Create Saving Goal"}
                        </Text>

                        <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="white"
                            style={{
                                marginLeft: 5,
                            }}
                        />

                    </TouchableOpacity>

                </View>

                <View className="items-center px-8 py-4">

                    <Ionicons
                        name="shield-checkmark-outline"
                        size={22}
                        color="#94A3B8"
                    />

                    <Text className="text-gray-400 text-xs text-center mt-2 leading-5">
                        Cutin only uses your completed orders to calculate your food spending insights.
                    </Text>

                </View>

            </ScrollView>

            {/* AI FLOATING BUTTON */}

            <TouchableOpacity
                onPress={() =>
                    setChatOpen(true)
                }
                className="absolute bottom-6 left-5"
            >

                <View className="bg-[#0F172A] w-16 h-16 rounded-full items-center justify-center shadow-lg">
                    <Ionicons
                        name="sparkles"
                        size={27}
                        color="white"
                    />
                </View>

                <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 border-2 border-white" />

            </TouchableOpacity>

            {/* ============================================================= */}
            {/* BUDGET MODAL */}
            {/* ============================================================= */}

            <Modal
                visible={budgetModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setBudgetModalOpen(false)
                }
            >

                <View className="flex-1 bg-black/40 justify-end">

                    <View className="bg-white rounded-t-[32px] px-5 pt-6 pb-10">

                        <View className="flex-row justify-between items-center mb-6">

                            <View>

                                <Text className="text-2xl font-extrabold text-gray-950">
                                    Monthly Budget
                                </Text>

                                <Text className="text-gray-500 mt-1">
                                    How much do you want to spend on food?
                                </Text>

                            </View>

                            <TouchableOpacity
                                onPress={() =>
                                    setBudgetModalOpen(false)
                                }
                            >
                                <Ionicons
                                    name="close"
                                    size={26}
                                    color="#0F172A"
                                />
                            </TouchableOpacity>

                        </View>

                        <Text className="text-gray-500 text-sm mb-2">
                            Monthly amount
                        </Text>

                        <View className="flex-row items-center bg-gray-100 rounded-2xl px-4">

                            <Text className="text-gray-950 text-xl font-bold">
                                R
                            </Text>

                            <TextInput
                                value={budgetInput}
                                onChangeText={setBudgetInput}
                                keyboardType="decimal-pad"
                                placeholder="1500"
                                className="flex-1 py-4 px-3 text-xl font-bold text-gray-950"
                            />

                        </View>

                        <TouchableOpacity
                            onPress={saveBudget}
                            disabled={saving}
                            className="bg-blue-600 rounded-2xl py-4 mt-6 items-center"
                        >

                            {saving ? (
                                <ActivityIndicator
                                    color="white"
                                />
                            ) : (
                                <Text className="text-white font-bold text-base">
                                    Save Budget
                                </Text>
                            )}

                        </TouchableOpacity>

                    </View>

                </View>

            </Modal>

            {/* ============================================================= */}
            {/* MONTHLY PLAN */}
            {/* ============================================================= */}

            <Modal
                visible={monthlyPlanOpen}
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setMonthlyPlanOpen(false)
                }
            >

                <View className="flex-1 bg-black/40 justify-end">

                    <View className="bg-white rounded-t-[32px] px-5 pt-6 pb-10">

                        <View className="flex-row items-center justify-between mb-6">

                            <View>

                                <Text className="text-2xl font-extrabold text-gray-950">
                                    Monthly Plan
                                </Text>

                                <Text className="text-gray-500 mt-1">
                                    Based on your current Cutin spending
                                </Text>

                            </View>

                            <TouchableOpacity
                                onPress={() =>
                                    setMonthlyPlanOpen(false)
                                }
                            >
                                <Ionicons
                                    name="close"
                                    size={26}
                                />
                            </TouchableOpacity>

                        </View>

                        <View className="bg-[#0F172A] rounded-[26px] p-5 mb-4">

                            <Text className="text-gray-400 text-sm">
                                Remaining
                            </Text>

                            <Text className="text-white text-3xl font-extrabold mt-1">
                                R {remaining.toFixed(2)}
                            </Text>

                            <Text className="text-gray-400 text-sm mt-2">
                                {remainingDays} days remaining this month
                            </Text>

                        </View>

                        <View className="flex-row">

                            <View className="flex-1 bg-gray-50 rounded-2xl p-4 mr-2">

                                <Text className="text-gray-500 text-xs">
                                    Daily allowance
                                </Text>

                                <Text className="text-gray-950 text-xl font-extrabold mt-1">
                                    R {dailyAllowance.toFixed(2)}
                                </Text>

                            </View>

                            <View className="flex-1 bg-gray-50 rounded-2xl p-4 ml-2">

                                <Text className="text-gray-500 text-xs">
                                    Approx. orders left
                                </Text>

                                <Text className="text-gray-950 text-xl font-extrabold mt-1">
                                    {estimatedOrdersRemaining}
                                </Text>

                            </View>

                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                setMonthlyPlanOpen(false);
                                setChatOpen(true);
                            }}
                            className="bg-blue-600 rounded-2xl py-4 mt-6 flex-row justify-center items-center"
                        >

                            <Ionicons
                                name="sparkles"
                                size={19}
                                color="white"
                            />

                            <Text className="text-white font-bold ml-2">
                                Ask Coach About My Plan
                            </Text>

                        </TouchableOpacity>

                    </View>

                </View>

            </Modal>

            {/* ============================================================= */}
            {/* SAVING GOAL MODAL */}
            {/* ============================================================= */}

            <Modal
                visible={goalModalOpen}
                transparent
                animationType="fade"
                onRequestClose={() =>
                    setGoalModalOpen(false)
                }
            >

                <View className="flex-1 bg-black/40 justify-end">

                    <View className="bg-white rounded-t-[32px] px-5 pt-6 pb-10">

                        <View className="flex-row justify-between items-center mb-6">

                            <View>

                                <Text className="text-2xl font-extrabold text-gray-950">
                                    Saving Goal
                                </Text>

                                <Text className="text-gray-500 mt-1">
                                    What are you saving towards?
                                </Text>

                            </View>

                            <TouchableOpacity
                                onPress={() =>
                                    setGoalModalOpen(false)
                                }
                            >
                                <Ionicons
                                    name="close"
                                    size={26}
                                />
                            </TouchableOpacity>

                        </View>

                        <Text className="text-gray-500 text-sm mb-2">
                            Goal name
                        </Text>

                        <TextInput
                            value={goalTitleInput}
                            onChangeText={setGoalTitleInput}
                            placeholder="e.g. New Sneakers"
                            className="bg-gray-100 rounded-2xl px-4 py-4 text-gray-950 mb-4"
                        />

                        <Text className="text-gray-500 text-sm mb-2">
                            Target amount
                        </Text>

                        <TextInput
                            value={goalAmountInput}
                            onChangeText={setGoalAmountInput}
                            keyboardType="decimal-pad"
                            placeholder="2500"
                            className="bg-gray-100 rounded-2xl px-4 py-4 text-gray-950 mb-4"
                        />

                        <Text className="text-gray-500 text-sm mb-2">
                            Amount already saved
                        </Text>

                        <TextInput
                            value={savedAmountInput}
                            onChangeText={setSavedAmountInput}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            className="bg-gray-100 rounded-2xl px-4 py-4 text-gray-950"
                        />

                        <TouchableOpacity
                            onPress={saveGoal}
                            disabled={saving}
                            className="bg-[#0F172A] rounded-2xl py-4 mt-6 items-center"
                        >

                            {saving ? (
                                <ActivityIndicator
                                    color="white"
                                />
                            ) : (
                                <Text className="text-white font-bold">
                                    Save Goal
                                </Text>
                            )}

                        </TouchableOpacity>

                    </View>

                </View>

            </Modal>

            {/* ============================================================= */}
            {/* CUTIN COACH */}
            {/* ============================================================= */}

            <Modal
                visible={chatOpen}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() =>
                    setChatOpen(false)
                }
            >

                <SafeAreaView className="flex-1 bg-white">

                    <KeyboardAvoidingView
                        className="flex-1"
                        behavior={
                            Platform.OS === "ios"
                                ? "padding"
                                : undefined
                        }
                    >

                        <View className="px-5 py-4 flex-row items-center justify-between border-b border-gray-100">

                            <View className="flex-row items-center">

                                <View className="w-11 h-11 bg-blue-600 rounded-2xl items-center justify-center mr-3">
                                    <Ionicons
                                        name="sparkles"
                                        size={21}
                                        color="white"
                                    />
                                </View>

                                <View>

                                    <Text className="font-extrabold text-xl text-gray-950">
                                        Cutin Coach
                                    </Text>

                                    <Text className="text-gray-500 text-xs">
                                        Your AI food budgeting assistant
                                    </Text>

                                </View>

                            </View>

                            <TouchableOpacity
                                onPress={() =>
                                    setChatOpen(false)
                                }
                            >
                                <Ionicons
                                    name="close"
                                    size={26}
                                />
                            </TouchableOpacity>

                        </View>

                        <ScrollView
                            className="flex-1 px-5"
                            contentContainerClassName="py-5"
                        >

                            {messages.length === 1 && (

                                <View className="mb-5">

                                    <Text className="font-extrabold text-gray-950 text-lg mb-3">
                                        What would you like help with?
                                    </Text>

                                    {quickPrompts.map(
                                        (prompt) => (

                                            <TouchableOpacity
                                                key={prompt}
                                                onPress={() =>
                                                    sendMessage(prompt)
                                                }
                                                className="border border-blue-100 bg-blue-50 rounded-2xl p-4 mb-3"
                                            >

                                                <View className="flex-row items-center justify-between">

                                                    <Text className="text-blue-950 font-semibold flex-1 pr-3">
                                                        {prompt}
                                                    </Text>

                                                    <Ionicons
                                                        name="arrow-forward"
                                                        size={17}
                                                        color="#2563EB"
                                                    />

                                                </View>

                                            </TouchableOpacity>

                                        )
                                    )}

                                </View>

                            )}

                            {messages.map(
                                (message, index) => (

                                    <View
                                        key={`${message.role}-${index}`}
                                        className={`mb-3 p-4 rounded-[22px] max-w-[85%] ${message.role === "user"
                                            ? "bg-blue-600 self-end"
                                            : "bg-gray-100 self-start"
                                            }`}
                                    >

                                        <Text
                                            className={`leading-6 ${message.role === "user"
                                                ? "text-white"
                                                : "text-gray-900"
                                                }`}
                                        >
                                            {message.content}
                                        </Text>

                                    </View>

                                )
                            )}

                            {chatLoading && (

                                <View className="bg-gray-100 self-start rounded-2xl p-4">

                                    <View className="flex-row items-center">

                                        <ActivityIndicator
                                            size="small"
                                        />

                                        <Text className="text-gray-500 ml-2">
                                            Cutin Coach is thinking...
                                        </Text>

                                    </View>

                                </View>

                            )}

                        </ScrollView>

                        <View className="px-5 py-4 border-t border-gray-100">

                            <View className="flex-row items-end bg-gray-100 rounded-[22px] px-4">

                                <TextInput
                                    value={chatInput}
                                    onChangeText={setChatInput}
                                    placeholder="Ask about your food spending..."
                                    placeholderTextColor="#94A3B8"
                                    multiline
                                    className="flex-1 py-4 text-gray-950 max-h-28"
                                />

                                <TouchableOpacity
                                    onPress={() =>
                                        sendMessage()
                                    }
                                    disabled={
                                        !chatInput.trim() ||
                                        chatLoading
                                    }
                                    className="mb-2 ml-2 bg-blue-600 w-10 h-10 rounded-full items-center justify-center"
                                >

                                    <Ionicons
                                        name="arrow-up"
                                        size={20}
                                        color="white"
                                    />

                                </TouchableOpacity>

                            </View>

                        </View>

                    </KeyboardAvoidingView>

                </SafeAreaView>

            </Modal>

        </SafeAreaView>
    );
}