/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useState } from 'react';
import {
  StatusBar,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';
import BottomBar, {
  SuperAdminTab,
} from './src/SuperAdmin/Navigation/Bottombar';
import TopHeader from './src/SuperAdmin/Navigation/TopHeader';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<SuperAdminTab>('Home');

  return (
    <View className="flex-1 bg-white">
      <TopHeader />
      <View className="flex-1 items-center justify-center bg-white">
        <Text className="text-[22px] font-bold text-[#1A1A1A]">
          {activeTab}
        </Text>
      </View>
      <BottomBar activeTab={activeTab} onTabPress={setActiveTab} />
    </View>
  );
}

export default App;
