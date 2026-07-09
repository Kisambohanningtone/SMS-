import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import HomeScreen from '../screens/HomeScreen'
import PropertyDetailScreen from '../screens/PropertyDetailScreen'
import PaymentsScreen from '../screens/PaymentsScreen'
import ReportsScreen from '../screens/ReportsScreen'
import ProfileScreen from '../screens/ProfileScreen'

const Tab = createBottomTabNavigator()
const HomeStack = createNativeStackNavigator()

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#1E3A5F' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'My Properties' }} />
      <HomeStack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={({ route }: any) => ({ title: route.params?.property?.name ?? 'Property' })} />
    </HomeStack.Navigator>
  )
}

export default function TabNavigator() {
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#1E3A5F',
      tabBarInactiveTintColor: '#9CA3AF',
      tabBarStyle: { height: 64, paddingBottom: 10, paddingTop: 8 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}>
      <Tab.Screen name="Properties" component={HomeStackNavigator} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} /> }} />
      <Tab.Screen name="Payments" component={PaymentsScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} />, headerShown: false }} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />, headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />, headerShown: false }} />
    </Tab.Navigator>
  )
}
