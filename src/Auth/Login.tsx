import { useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api, { setTokenCache } from '../api';
import useKeyboardScroll from './useKeyboardScroll';

export type LoginUser = {
  name?: string;
  email?: string;
  role?: string;
};

type LoginProps = {
  onLogin: (user: LoginUser) => void;
  onRegister?: () => void;
  initialIdentifier?: string;
  registrationMessage?: string;
};

function isLoginUser(value: unknown): value is LoginUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    (!('name' in value) || typeof value.name === 'string') &&
    (!('email' in value) || typeof value.email === 'string') &&
    (!('role' in value) || typeof value.role === 'string')
  );
}

function getErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return 'Unable to sign in. Please try again.';
}

export default function Login({
  onLogin,
  onRegister,
  initialIdentifier = '',
  registrationMessage = '',
}: LoginProps) {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const identifierInputRef = useRef<TextInputInstance>(null);
  const passwordInputRef = useRef<TextInputInstance>(null);
  const { scrollViewRef, onInputFocus, onScroll } = useKeyboardScroll();

  const handleSubmit = async () => {
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier || !password) {
      setErrorMessage('Enter your email or mobile number and password.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/login', {
        identifier: trimmedIdentifier,
        password,
      });
      const token: unknown = response.data?.token;
      const user: unknown = response.data?.user;

      if (typeof token !== 'string' || token.length === 0) {
        throw new Error('The server did not return an authentication token.');
      }

      if (!isLoginUser(user)) {
        throw new Error('The server returned an invalid user profile.');
      }

      const role = user.role?.trim().toLowerCase().replace(/[\s_-]/g, '');
      if (role !== 'admin' && role !== 'superadmin') {
        throw new Error('Only Admin and Super Admin accounts can sign in here.');
      }

      await AsyncStorage.setItem('userToken', token);
      setTokenCache(token);
      onLogin(user);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8F7F2]" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={16}>
          <View className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#F3E8C1]" />
          <View className="absolute -bottom-16 -left-20 h-56 w-56 rounded-full bg-[#E3EEE8]" />

          <View className="w-full max-w-md self-center">
          <View className="mb-6 items-center">
            <View className="mb-3 h-32 w-32 overflow-hidden rounded-full border-4 border-[#F5E6A8] bg-[#06452D] shadow-lg">
              <Image
                accessibilityLabel="Sri GoldSuite logo"
                source={require('../Assert/Images/App icon.png')}
                resizeMode="cover"
                className="h-full w-full"
              />
            </View>
            <Text className="text-center text-3xl font-bold text-[#173F35]">
              Admin Sign In
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-[#6B7280]">
              Sign in to your Sri Golds account to continue.
            </Text>
          </View>

          <View className="rounded-3xl border border-[#EAE7DC] bg-white p-5 shadow-lg">
            <Text className="mb-2 ml-1 text-sm font-semibold text-[#374151]">
              Email / Mobile Number
            </Text>
            <View className="mb-4 flex-row items-center rounded-xl border border-[#E5E7EB] bg-white px-4">
              <UserRound size={18} color="#9CA3AF" />
              <TextInput
                accessibilityLabel="Email or mobile number"
                autoCapitalize="none"
                autoComplete="username"
                keyboardType="email-address"
                onFocus={() => {
                  if (identifierInputRef.current) {
                    onInputFocus(identifierInputRef.current);
                  }
                }}
                onChangeText={value => {
                  setIdentifier(value);
                  setErrorMessage('');
                }}
                onSubmitEditing={handleSubmit}
                placeholder="Enter your email or mobile number"
                placeholderTextColor="#9CA3AF"
                ref={identifierInputRef}
                returnKeyType="next"
                value={identifier}
                className="flex-1 py-3.5 pl-3 text-sm text-[#374151]"
              />
            </View>

            <Text className="mb-2 ml-1 text-sm font-semibold text-[#374151]">
              Password
            </Text>
            <View className="mb-4 flex-row items-center rounded-xl border border-[#E5E7EB] bg-white pr-3">
              <View className="pl-4">
                <LockKeyhole size={18} color="#9CA3AF" />
              </View>
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                onFocus={() => {
                  if (passwordInputRef.current) {
                    onInputFocus(passwordInputRef.current);
                  }
                }}
                onChangeText={value => {
                  setPassword(value);
                  setErrorMessage('');
                }}
                onSubmitEditing={handleSubmit}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                ref={passwordInputRef}
                returnKeyType="done"
                secureTextEntry={!showPassword}
                value={password}
                className="flex-1 px-3 py-3.5 text-sm text-[#374151]"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? 'Hide password' : 'Show password'
                }
                onPress={() => setShowPassword(visible => !visible)}
                className="h-10 w-10 items-center justify-center">
                {showPassword ? (
                  <EyeOff size={19} color="#A77B15" />
                ) : (
                  <Eye size={19} color="#A77B15" />
                )}
              </Pressable>
            </View>

            <View className="mb-4 flex-row items-center">
              <View className="mr-2 h-5 w-5 items-center justify-center rounded border border-[#B8860B] bg-[#B8860B]">
                <Check size={14} color="#FFFFFF" strokeWidth={3} />
              </View>
              <Text className="text-sm text-[#6B7280]">
                Stay signed in
              </Text>
            </View>

            {errorMessage ? (
              <Text
                accessibilityRole="alert"
                className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </Text>
            ) : null}
            {registrationMessage ? (
              <Text
                accessibilityRole="alert"
                className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {registrationMessage}
              </Text>
            ) : null}

            <Pressable
              testID="login-submit"
              accessibilityRole="button"
              accessibilityState={{ disabled: isSubmitting }}
              disabled={isSubmitting}
              onPress={handleSubmit}
              className={`items-center rounded-xl bg-[#B8860B] px-4 py-4 shadow-md ${
                isSubmitting ? 'opacity-60' : 'active:bg-[#9A6E08]'
              }`}>
              <View className="flex-row items-center">
                <LockKeyhole size={18} color="#FFFFFF" />
                <Text className="ml-2 text-base font-bold tracking-wide text-white">
                  {isSubmitting ? 'Signing in…' : 'Secure Login'}
                </Text>
              </View>
            </Pressable>

            <View className="mt-5 flex-row items-center">
              <View className="h-px flex-1 bg-[#E5E7EB]" />
              <Text className="mx-4 text-xs font-bold tracking-[2px] text-[#9CA3AF]">
                SRI GOLDSUITE
              </Text>
              <View className="h-px flex-1 bg-[#E5E7EB]" />
            </View>
            {onRegister ? (
              <Pressable
                accessibilityRole="button"
                onPress={onRegister}
                className="mt-5 items-center py-2">
                <Text className="text-sm text-[#6B7280]">
                  New gold shop?{' '}
                  <Text className="font-bold text-[#07564B]">Register here</Text>
                </Text>
              </Pressable>
            ) : null}
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}