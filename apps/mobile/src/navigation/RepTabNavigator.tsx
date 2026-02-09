import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { DashboardScreen } from '../screens/DashboardScreen';
import { RouteScreen } from '../screens/RouteScreen';
import { NearbyScreen } from '../screens/NearbyScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { Colors, FontSize } from '../theme';

export type RepTabParamList = {
  Dashboard: undefined;
  Route: undefined;
  Nearby: undefined;
  Alerts: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RepTabParamList>();

export function RepTabNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(15,23,42,0.95)',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          paddingBottom: 4,
          paddingTop: 4,
          height: 56,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textDim,
        tabBarLabelStyle: {
          fontSize: FontSize.xs,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('dashboard'),
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="Route"
        component={RouteScreen}
        options={{
          tabBarLabel: t('map'),
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="Nearby"
        component={NearbyScreen}
        options={{
          tabBarLabel: t('visits'),
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          tabBarLabel: t('alerts'),
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('profile'),
          tabBarIcon: () => null,
        }}
      />
    </Tab.Navigator>
  );
}
