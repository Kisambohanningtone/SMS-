import React, { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from './src/hooks/useAuth'
import LoginScreen from './src/screens/LoginScreen'
import TabNavigator from './src/navigation/TabNavigator'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15000 } },
})

export default function App() {
  const { owner, isLoading, loadStoredAuth } = useAuthStore()

  useEffect(() => { loadStoredAuth() }, [])

  if (isLoading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E3A5F' }}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  )

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <StatusBar style="light" />
        {owner ? <TabNavigator /> : <LoginScreen />}
      </NavigationContainer>
    </QueryClientProvider>
  )
}
