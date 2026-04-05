import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { TratschProvider, useTratsch } from './context/TratschContext';
import OnboardingScreen from './screens/OnboardingScreen';
import HomeScreen from './screens/HomeScreen';
import KleiderScreen from './screens/KleiderScreen';
import NotfallScreen from './screens/NotfallScreen';
import TratschScreen from './screens/TratschScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const ICONS = { Home: '🪺', Kleider: '🧥', Notfall: '🤒', Tratsch: '💬' };

function MainTabs() {
  const { unreadCount } = useTratsch();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor:   '#993556',
        tabBarInactiveTintColor: '#ccc',
        tabBarStyle: { borderTopColor: '#f0f0f0' },
        headerTitleStyle: { color: '#993556', fontWeight: '500' },
        tabBarIcon: () => (
          <Text style={{ fontSize: 20 }}>{ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tab.Screen name="Home"    component={HomeScreen}    options={{ title: 'Nestli' }} />
      <Tab.Screen name="Kleider" component={KleiderScreen} />
      <Tab.Screen name="Notfall" component={NotfallScreen} />
      <Tab.Screen
        name="Tratsch"
        component={TratschScreen}
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    // TratschProvider wraps everything so both MainTabs (for badge)
    // and all screens can access shared state
    <TratschProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="MainTabs"   component={MainTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </TratschProvider>
  );
}
