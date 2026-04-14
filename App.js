import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, TouchableOpacity } from 'react-native';

import { TratschProvider, useTratsch } from './context/TratschContext';
import OnboardingScreen   from './screens/OnboardingScreen';
import HomeScreen         from './screens/HomeScreen';
import KleiderScreen      from './screens/KleiderScreen';
import NotfallScreen      from './screens/NotfallScreen';
import TratschScreen      from './screens/TratschScreen';
import KalenderScreen     from './screens/KalenderScreen';
import ProfilScreen       from './screens/ProfilScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const ICONS = {
  Home:    '🪺',
  Tratsch: '💬',
  Kalender:'📅',
  Notfall: '🤒',
  Kleider: '🧥',
};

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
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: 'Nestli',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Profil')}
              style={{ marginRight: 16 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 22 }}>👤</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen name="Tratsch"  component={TratschScreen} />
      <Tab.Screen name="Kalender" component={KalenderScreen} options={{ title: 'Kalender' }} />
      <Tab.Screen name="Notfall"  component={NotfallScreen} />
      <Tab.Screen
        name="Kleider"
        component={KleiderScreen}
        options={{ tabBarBadge: undefined }}
      />
    </Tab.Navigator>
  );
}

// Wrapper so Tratsch badge works
function MainTabsWithBadge() {
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
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: 'Nestli',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Profil')}
              style={{ marginRight: 16 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 22 }}>👤</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Tab.Screen
        name="Tratsch"
        component={TratschScreen}
        options={{ tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
      <Tab.Screen name="Kalender" component={KalenderScreen} options={{ title: 'Kalender' }} />
      <Tab.Screen name="Notfall"  component={NotfallScreen} />
      <Tab.Screen name="Kleider"  component={KleiderScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <TratschProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="MainTabs"   component={MainTabsWithBadge} />
          <Stack.Screen
            name="Profil"
            component={ProfilScreen}
            options={{ headerShown: false, presentation: 'card' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </TratschProvider>
  );
}