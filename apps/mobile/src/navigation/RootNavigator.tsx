import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/useAuthStore';
import { LoginScreen } from '../screens/LoginScreen';
import { RepTabNavigator } from './RepTabNavigator';
import { ManagerTabNavigator } from './ManagerTabNavigator';
import { StoreDetailScreen } from '../screens/StoreDetailScreen';
import { CheckInScreen } from '../screens/CheckInScreen';
import { CameraScreen } from '../screens/CameraScreen';
import { Colors } from '../theme';

export type RootStackParamList = {
  Login: undefined;
  RepTabs: undefined;
  ManagerTabs: undefined;
  StoreDetail: { storeId: string };
  CheckIn: { storeId: string };
  Camera: { storeId: string; visitId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.employee?.role);

  const isManager =
    role === 'area_manager' || role === 'regional_director' || role === 'admin';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : isManager ? (
        <>
          <Stack.Screen name="ManagerTabs" component={ManagerTabNavigator} />
          <Stack.Screen name="StoreDetail" component={StoreDetailScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="RepTabs" component={RepTabNavigator} />
          <Stack.Screen name="StoreDetail" component={StoreDetailScreen} />
          <Stack.Screen name="CheckIn" component={CheckInScreen} />
          <Stack.Screen name="Camera" component={CameraScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
