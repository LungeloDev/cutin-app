
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    askMerchantZakaMate,
    type ZakaMateMessage,
} from "@/services/merchant-zakamate.service";

const NAVY = "#0F172A";
const BLUE = "#2563EB";

const prompts = [
    {
        icon: "trending-up-outline" as const,
        title: "Sales performance",
        question: "How is my store performing this month?",
    },
    {
        icon: "restaurant-outline" as const,
        title: "Popular products",
        question: "Which products are selling the most?",
    },
    {
        icon: "wallet-outline" as const,
        title: "My earnings",
        question:
            "Explain my sales, Cutin commission and merchant earnings.",
    },
    {
        icon: "bulb-outline" as const,
        title: "Growth ideas",
        question:
            "What practical steps can I take to increase my orders?",
    },
];

const welcomeMessage: ZakaMateMessage = {
    role: "assistant",
    content:
        "Sawubona! 👋 I'm ZakaMate, your Cutin AI business partner. Ask me about your sales, popular products, earnings or ways to grow your store.",
};

export default function MerchantZakaMateScreen() {
    const [messages, setMessages] = useState<ZakaMateMessage[]>([
        welcomeMessage,
    ]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);

    const scrollRef = useRef<ScrollView>(null);
    const sendingRef = useRef(false);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const sendMessage = async (suggested?: string) => {
        const content = (suggested ?? input).trim();

        if (!content || sendingRef.current) return;

        sendingRef.current = true;
        setSending(true);
        setInput("");

        const previousHistory = messages
            .filter((item) => item !== welcomeMessage)
            .slice(-8);

        const userMessage: ZakaMateMessage = {
            role: "user",
            content,
        };

        setMessages((current) => [...current, userMessage]);

        try {
            const response = await askMerchantZakaMate(
                content,
                previousHistory
            );

            if (!mountedRef.current) return;

            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content: response.message,
                },
            ]);
        } catch (error) {
            console.error("ZakaMate merchant error:", error);

            if (!mountedRef.current) return;

            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content:
                        "Sorry, I couldn't analyse your store right now. Please try again shortly.",
                },
            ]);
        } finally {
            sendingRef.current = false;

            if (mountedRef.current) {
                setSending(false);
            }
        }
    };

    const resetConversation = () => {
        if (sending) return;
        setMessages([welcomeMessage]);
        setInput("");
    };

    return (
        <SafeAreaView className="flex-1 bg-[#F8FAFC]">
            <KeyboardAvoidingView
                className="flex-1"
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 65 : 0}
            >
                {/* Header */}
                <View className="bg-white px-5 py-4 border-b border-gray-100 flex-row items-center">
                    <View className="w-12 h-12 bg-[#0F172A] rounded-2xl items-center justify-center">
                        <Ionicons name="sparkles" size={24} color="#FFFFFF" />
                    </View>

                    <View className="flex-1 ml-3">
                        <Text className="text-xl font-extrabold text-gray-950">
                            ZakaMate
                        </Text>
                        <Text className="text-gray-500 text-xs mt-1">
                            Your AI business partner
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={resetConversation}
                        disabled={sending}
                        accessibilityRole="button"
                        accessibilityLabel="Start a new conversation"
                        className="w-11 h-11 bg-gray-100 rounded-2xl items-center justify-center"
                    >
                        <Ionicons
                            name="create-outline"
                            size={21}
                            color={sending ? "#CBD5E1" : NAVY}
                        />
                    </TouchableOpacity>
                </View>

                {/* Conversation */}
                <ScrollView
                    ref={scrollRef}
                    className="flex-1"
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{
                        paddingHorizontal: 20,
                        paddingTop: 22,
                        paddingBottom: 30,
                    }}
                    onContentSizeChange={() =>
                        scrollRef.current?.scrollToEnd({ animated: true })
                    }
                >
                    {messages.length === 1 && (
                        <>
                            {/* Welcome hero */}
                            <View className="bg-[#0F172A] rounded-[30px] p-6 mb-6 overflow-hidden">
                                <View className="w-14 h-14 rounded-2xl bg-blue-600 items-center justify-center mb-5">
                                    <Ionicons
                                        name="sparkles"
                                        size={28}
                                        color="#FFFFFF"
                                    />
                                </View>

                                <Text className="text-white text-2xl font-extrabold">
                                    Grow smarter with ZakaMate.
                                </Text>

                                <Text className="text-slate-300 mt-3 leading-6">
                                    Understand your sales, discover opportunities and
                                    make better decisions for your business.
                                </Text>

                                <View className="flex-row items-center mt-5">
                                    <Ionicons
                                        name="shield-checkmark-outline"
                                        size={16}
                                        color="#93C5FD"
                                    />
                                    <Text className="text-blue-200 text-xs ml-2">
                                        Powered by your Cutin store data
                                    </Text>
                                </View>
                            </View>

                            <Text className="text-gray-950 font-extrabold text-lg mb-4">
                                What would you like to explore?
                            </Text>

                            <View className="flex-row flex-wrap justify-between mb-5">
                                {prompts.map((prompt) => (
                                    <TouchableOpacity
                                        key={prompt.title}
                                        onPress={() => sendMessage(prompt.question)}
                                        disabled={sending}
                                        activeOpacity={0.85}
                                        className="bg-white border border-gray-100 rounded-[22px] p-4 mb-3"
                                        style={{ width: "48%" }}
                                    >
                                        <View className="w-11 h-11 rounded-2xl bg-blue-50 items-center justify-center mb-4">
                                            <Ionicons
                                                name={prompt.icon}
                                                size={22}
                                                color={BLUE}
                                            />
                                        </View>

                                        <Text className="font-bold text-gray-950">
                                            {prompt.title}
                                        </Text>

                                        <View className="flex-row items-center mt-3">
                                            <Text className="text-blue-600 text-xs font-semibold mr-1">
                                                Ask ZakaMate
                                            </Text>
                                            <Ionicons
                                                name="arrow-forward"
                                                size={13}
                                                color={BLUE}
                                            />
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Chat messages */}
                    {messages.map((message, index) => {
                        const isUser = message.role === "user";

                        if (index === 0 && messages.length === 1) {
                            return null;
                        }

                        return (
                            <View
                                key={`${message.role}-${index}`}
                                className={`mb-4 max-w-[88%] ${isUser ? "self-end" : "self-start"
                                    }`}
                            >
                                {!isUser && (
                                    <View className="flex-row items-center mb-2">
                                        <Ionicons
                                            name="sparkles"
                                            size={13}
                                            color={BLUE}
                                        />
                                        <Text className="text-gray-500 text-xs font-semibold ml-2">
                                            ZakaMate
                                        </Text>
                                    </View>
                                )}

                                <View
                                    className={`rounded-[22px] px-4 py-4 ${isUser
                                            ? "bg-blue-600 rounded-br-md"
                                            : "bg-white border border-gray-100 rounded-bl-md"
                                        }`}
                                >
                                    <Text
                                        selectable
                                        className={`leading-6 ${isUser ? "text-white" : "text-gray-800"
                                            }`}
                                    >
                                        {message.content}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}

                    {sending && (
                        <View className="self-start bg-white rounded-[20px] px-4 py-4 border border-gray-100 flex-row items-center">
                            <ActivityIndicator size="small" color={BLUE} />
                            <Text className="text-gray-500 text-sm ml-3">
                                ZakaMate is analysing...
                            </Text>
                        </View>
                    )}
                </ScrollView>

                {/* Composer */}
                <View className="bg-white border-t border-gray-100 px-4 pt-3 pb-3">
                    <View className="flex-row items-end bg-[#F1F5F9] rounded-[24px] px-4 py-2">
                        <TextInput
                            value={input}
                            onChangeText={setInput}
                            placeholder="Ask ZakaMate anything..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            maxLength={2000}
                            editable={!sending}
                            className="flex-1 text-gray-950 py-3 max-h-28"
                            style={{ fontSize: 15 }}
                        />

                        <TouchableOpacity
                            onPress={() => sendMessage()}
                            disabled={!input.trim() || sending}
                            accessibilityRole="button"
                            accessibilityLabel="Send message"
                            className={`w-11 h-11 rounded-full items-center justify-center ml-2 mb-1 ${!input.trim() || sending
                                    ? "bg-blue-300"
                                    : "bg-blue-600"
                                }`}
                        >
                            {sending ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Ionicons
                                    name="arrow-up"
                                    size={22}
                                    color="#FFFFFF"
                                />
                            )}
                        </TouchableOpacity>
                    </View>

                    <Text className="text-gray-400 text-[10px] text-center mt-3">
                        AI insights are based on available Cutin data.
                        Verify important business decisions.
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
