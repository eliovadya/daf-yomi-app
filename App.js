// App.js — entry point, sets up bottom-tab navigation

import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer }          from '@react-navigation/native';
import { createBottomTabNavigator }     from '@react-navigation/bottom-tabs';
import { SafeAreaProvider }             from 'react-native-safe-area-context';
import { StatusBar }                    from 'expo-status-bar';

import HomeScreen    from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import QuizScreen    from './src/screens/QuizScreen';
import { COLORS }    from './src/theme';

const Tab = createBottomTabNavigator();

// Simple emoji icons — no icon library dependency needed
function tabIcon(emoji) {
  return () => <Text style={{ fontSize: 22 }}>{emoji}</Text>;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor:   COLORS.primary,
            tabBarInactiveTintColor: COLORS.muted,
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopColor:  COLORS.border,
              paddingBottom:   6,
              height:          60,
            },
            headerStyle: {
              backgroundColor: COLORS.primary,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize:   18,
            },
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title:        'היום | Today',
              tabBarIcon:   tabIcon('📖'),
              headerTitle:  '📖  דף יומי | Daf Yomi',
            }}
          />
          <Tab.Screen
            name="History"
            component={HistoryScreen}
            options={{
              title:       'היסטוריה | History',
              tabBarIcon:  tabIcon('📅'),
              headerTitle: '📅  היסטוריה | Study History',
            }}
          />
          <Tab.Screen
            name="Quiz"
            component={QuizScreen}
            options={{
              title:       'בחינה | Quiz',
              tabBarIcon:  tabIcon('🎯'),
              headerTitle: '🎯  בחינה עצמית | Self Quiz',
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
