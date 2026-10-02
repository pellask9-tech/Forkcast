import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';

import { usePalette } from '@/components/theme';

export default function TabLayout() {
  const c = usePalette();
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: c.primary, tabBarInactiveTintColor: c.muted }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Meal plan',
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Add food',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
