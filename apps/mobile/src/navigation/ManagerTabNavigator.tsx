import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { DashboardScreen } from '../screens/DashboardScreen';
import { RouteScreen } from '../screens/RouteScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { NearbyScreen } from '../screens/NearbyScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { Colors, FontSize } from '../theme';

export type ManagerTabParamList = {
  MgrDashboard: undefined;
  LiveMap: undefined;
  Employees: undefined;
  AIInsights: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<ManagerTabParamList>();

export function ManagerTabNavigator() {
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
        name="MgrDashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('dashboard'),
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="LiveMap"
        component={RouteScreen}
        options={{
          tabBarLabel: t('liveFieldMap'),
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="Employees"
        component={NearbyScreen}
        options={{
          tabBarLabel: t('employees'),
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="AIInsights"
        component={AlertsScreen}
        options={{
          tabBarLabel: t('aiInsights'),
          tabBarIcon: () => null,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('settings'),
          tabBarIcon: () => null,
        }}
      />
    </Tab.Navigator>
  );
}
