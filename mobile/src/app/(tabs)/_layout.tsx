import { Tabs } from 'expo-router';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useEffect } from 'react';
import { useAccountReadiness } from '@/contexts/AccountReadinessContext';

// Keep tab instances, input and scroll position alive. Only explicit new
// training/edit sessions reset their form; changing tabs must not do so.
export default function MainTabs() {
  const { refreshFriends, refreshAnalyses } = useAccountReadiness();
  useEffect(() => { void refreshFriends(); void refreshAnalyses(); }, [refreshFriends, refreshAnalyses]);
  return <Tabs initialRouteName="training" detachInactiveScreens={false}
    screenOptions={{ headerShown: false, lazy: false, animation: 'none', freezeOnBlur: false,
      sceneStyle: { backgroundColor: '#050A0F' } }}
    tabBar={({ navigation }) => <BottomNavigation onNavigate={href => navigation.navigate(href.slice(1))} />}>
    <Tabs.Screen name="training" />
    <Tabs.Screen name="food" />
    <Tabs.Screen name="chat" />
    <Tabs.Screen name="my-page" />
  </Tabs>;
}
