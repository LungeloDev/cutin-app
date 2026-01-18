import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 justify-center items-center px-6 bg-white">
          <Ionicons name="warning-outline" size={64} color="#EF4444" />
          <Text className="text-xl font-bold text-gray-900 mt-4 text-center">
            Something went wrong
          </Text>
          <Text className="text-gray-600 mt-2 text-center">
            The app encountered an unexpected error
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false })}
            className="mt-6 px-6 py-3 bg-blue-600 rounded-xl"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}