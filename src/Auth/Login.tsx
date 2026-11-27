import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import api, { setTokenCache } from '../api';
import useKeyboardScroll from './useKeyboardScroll';

export type LoginUser = {
  name?: string;
  email?: string;
  role?: string;
};

type LoginProps = {
  onLogin: (user: LoginUser) => void;
  onWelcomePress: () => void;
  onRegister?: () => void;
  initialIdentifier?: string;
  registrationMessage?: string;
};

type FocusedField = 'identifier' | 'password' | null;

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
  onWelcomePress: _onWelcomePress,
  onRegister,
  initialIdentifier = '',
  registrationMessage = '',
}: LoginProps) {
  const insets = useSafeAreaInsets();
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [focusedField, setFocusedField] = useState<FocusedField>(null);
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

      if (staySignedIn) {
        await AsyncStorage.setItem('userToken', token);
      }
      setTokenCache(token);
      onLogin(user);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#063A2E]">
      <StatusBar barStyle="light-content" />
      <Image
        accessibilityElementsHidden
        importantForAccessibility="no"
        source={require('../Assert/Images/Welcome/welcomebg3.png')}
        resizeMode="cover"
        style={styles.backgroundImage}
      />
      <View pointerEvents="none" style={styles.backgroundScrim} />

      <SafeAreaView className="flex-1" edges={['top']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom + 24, 32) },
            ]}
            automaticallyAdjustKeyboardInsets
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}>
            <View className="w-full max-w-md self-center px-5 pt-3">
              

              <View className="mt-5 items-center pb-6">
                <View style={styles.logoHalo} className="rounded-full p-1.5">
                  <View
                    style={styles.logoFrame}
                    className="h-24 w-24 overflow-hidden rounded-full">
                    <Image
                      accessibilityLabel="Sri GoldSuite logo"
                      source={require('../Assert/Images/App icon.png')}
                      resizeMode="cover"
                      className="h-full w-full"
                    />
                  </View>
                </View>

                <Text
                  style={styles.eyebrowText}
                  className="mt-3.5 text-[11px] font-bold tracking-[3px]">
                  SRI GOLDSUITE
                </Text>
                <Text
                  style={styles.titleText}
                  className="mt-1 text-center text-[28px] font-extrabold tracking-tight">
                  Admin Sign In
                </Text>
                <Text
                  style={styles.subtitleText}
                  className="mt-1.5 max-w-[290px] text-center text-[13px] leading-5">
                  Sign in to manage your gold shop, loans, inventory, and daily
                  rates.
                </Text>
              </View>

              <View style={styles.card}>
                <View pointerEvents="none" style={styles.glassTintLayer} />
                <View pointerEvents="none" style={styles.glassSheenTop} />
                <View pointerEvents="none" style={styles.glassGlowGold} />
                <View style={styles.cardAccentBar} className="mb-4 self-center" />

                <Text
                  style={styles.fieldLabel}
                  className="mb-2 ml-1 text-xs font-bold uppercase tracking-[0.8px]">
                  Email / Mobile Number
                </Text>
                <View
                  style={[
                    styles.inputRow,
                    focusedField === 'identifier'
                      ? styles.inputRowFocused
                      : styles.inputRowIdle,
                  ]}
                  className="mb-4 flex-row items-center rounded-2xl px-3 py-1">
                  <View
                    style={
                      focusedField === 'identifier'
                        ? styles.iconBadgeFocused
                        : styles.iconBadgeIdle
                    }
                    className="h-9 w-9 items-center justify-center rounded-xl">
                    <UserRound
                      size={17}
                      color={
                        focusedField === 'identifier' ? '#B8860B' : '#6B7280'
                      }
                    />
                  </View>
                  <TextInput
                    accessibilityLabel="Email or mobile number"
                    autoCapitalize="none"
                    autoComplete="username"
                    keyboardType="email-address"
                    onFocus={() => {
                      setFocusedField('identifier');
                      if (identifierInputRef.current) {
                        onInputFocus(identifierInputRef.current);
                      }
                    }}
                    onBlur={() =>
                      setFocusedField(current =>
                        current === 'identifier' ? null : current,
                      )
                    }
                    onChangeText={value => {
                      setIdentifier(value);
                      setErrorMessage('');
                    }}
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    placeholder="Enter email or mobile number"
                    placeholderTextColor="#9CA3AF"
                    ref={identifierInputRef}
                    returnKeyType="next"
                    value={identifier}
                    style={styles.inputText}
                    className="flex-1 py-3 pl-3 text-[15px] font-medium"
                  />
                </View>

                <Text
                  style={styles.fieldLabel}
                  className="mb-2 ml-1 text-xs font-bold uppercase tracking-[0.8px]">
                  Password
                </Text>
                <View
                  style={[
                    styles.inputRow,
                    focusedField === 'password'
                      ? styles.inputRowFocused
                      : styles.inputRowIdle,
                  ]}
                  className="mb-4 flex-row items-center rounded-2xl py-1 pl-3 pr-2">
                  <View
                    style={
                      focusedField === 'password'
                        ? styles.iconBadgeFocused
                        : styles.iconBadgeIdle
                    }
                    className="h-9 w-9 items-center justify-center rounded-xl">
                    <LockKeyhole
                      size={17}
                      color={
                        focusedField === 'password' ? '#B8860B' : '#6B7280'
                      }
                    />
                  </View>
                  <TextInput
                    accessibilityLabel="Password"
                    autoCapitalize="none"
                    onFocus={() => {
                      setFocusedField('password');
                      if (passwordInputRef.current) {
                        onInputFocus(passwordInputRef.current);
                      }
                    }}
                    onBlur={() =>
                      setFocusedField(current =>
                        current === 'password' ? null : current,
                      )
                    }
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
                    style={styles.inputText}
                    className="flex-1 px-3 py-3 text-[15px] font-medium"
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    onPress={() => setShowPassword(visible => !visible)}
                    className="h-10 w-10 items-center justify-center rounded-xl active:opacity-70">
                    {showPassword ? (
                      <EyeOff size={18} color="#A77B15" />
                    ) : (
                      <Eye size={18} color="#A77B15" />
                    )}
                  </Pressable>
                </View>

                <View className="mb-5 flex-row items-center justify-between">
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: staySignedIn }}
                    onPress={() => setStaySignedIn(current => !current)}
                    className="flex-row items-center py-1">
                    <View
                      style={
                        staySignedIn
                          ? styles.checkboxChecked
                          : styles.checkboxUnchecked
                      }
                      className="mr-2.5 h-5 w-5 items-center justify-center rounded-md">
                      {staySignedIn ? (
                        <Check size={13} color="#FFFFFF" strokeWidth={3} />
                      ) : null}
                    </View>
                    <Text
                      style={styles.staySignedInText}
                      className="text-sm font-medium">
                      Stay signed in
                    </Text>
                  </Pressable>

                  <View
                    style={styles.encryptedBadge}
                    className="flex-row items-center rounded-full px-2.5 py-1">
                    <ShieldCheck size={12} color="#A7F3D0" />
                    <Text
                      style={styles.encryptedText}
                      className="ml-1 text-[11px] font-semibold">
                      Encrypted
                    </Text>
                  </View>
                </View>

                {errorMessage ? (
                  <Text
                    accessibilityRole="alert"
                    className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm font-medium text-red-700">
                    {errorMessage}
                  </Text>
                ) : null}
                {registrationMessage ? (
                  <Text
                    accessibilityRole="alert"
                    className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm font-medium text-emerald-800">
                    {registrationMessage}
                  </Text>
                ) : null}

                <Pressable
                  testID="login-submit"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isSubmitting }}
                  disabled={isSubmitting}
                  onPress={handleSubmit}
                  style={[
                    styles.submitButton,
                    isSubmitting
                      ? styles.submitButtonDisabled
                      : styles.submitButtonActive,
                  ]}
                  className="items-center rounded-2xl px-5 py-4 active:opacity-90">
                  <View className="flex-row items-center">
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <LockKeyhole size={17} color="#FFFFFF" />
                    )}
                    <Text className="mx-2 text-base font-bold tracking-wide text-white">
                      {isSubmitting ? 'Signing in…' : 'Secure Login'}
                    </Text>
                    {!isSubmitting ? (
                      <ArrowRight size={17} color="#FFF8E1" />
                    ) : null}
                  </View>
                </Pressable>

                {onRegister ? (
                  <>
                    <View className="my-5 flex-row items-center">
                      <View style={styles.dividerLine} className="flex-1" />
                      <Text
                        style={styles.dividerText}
                        className="mx-3 text-[10px] font-bold tracking-[2px]">
                        NEW GOLD SHOP?
                      </Text>
                      <View style={styles.dividerLine} className="flex-1" />
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      onPress={onRegister}
                      style={styles.registerCard}
                      className="flex-row items-center justify-between rounded-2xl px-4 py-3.5 active:opacity-85">
                      <View className="flex-row items-center">
                        <View
                          style={styles.registerIconBox}
                          className="mr-3 h-10 w-10 items-center justify-center rounded-xl">
                          <Store size={18} color="#F5C451" />
                        </View>
                        <View>
                          <Text
                            style={styles.registerTitle}
                            className="text-sm font-bold">
                            Register your gold shop
                          </Text>
                          <Text
                            style={styles.registerSubtitle}
                            className="text-xs">
                            Apply for a Sri GoldSuite admin account
                          </Text>
                        </View>
                      </View>
                      <ArrowRight size={16} color="#F5C451" />
                    </Pressable>
                  </>
                ) : null}
              </View>

              <Text
                style={styles.footerText}
                className="mt-5 text-center text-xs font-semibold tracking-wide">
                Sri GoldSuite • Gold • Jewellery • Loans
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  backgroundScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(4, 34, 26, 0.16)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  logoHalo: {
    backgroundColor: '#073327',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 196, 81, 0.55)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 8,
  },
  logoFrame: {
    backgroundColor: '#06452D',
    borderWidth: 2,
    borderColor: '#F5C451',
  },
  eyebrowText: {
    color: '#F5C451',
  },
  titleText: {
    color: '#FFFFFF',
  },
  subtitleText: {
    color: '#D7EAE1',
  },
  card: {
    backgroundColor: 'rgba(6, 46, 35, 0.52)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(245, 215, 130, 0.38)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.38)',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  glassTintLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.11)',
  },
  glassSheenTop: {
    position: 'absolute',
    top: -45,
    left: -30,
    right: 40,
    height: 110,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  glassGlowGold: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 196, 81, 0.12)',
  },
  cardAccentBar: {
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#F5C451',
  },
  fieldLabel: {
    color: '#F5E6B8',
  },
  inputRow: {
    borderWidth: 1.5,
  },
  inputRowIdle: {
    backgroundColor: 'rgba(255, 253, 249, 0.94)',
    borderColor: 'rgba(245, 224, 158, 0.55)',
  },
  inputRowFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#F5C451',
  },
  iconBadgeIdle: {
    backgroundColor: '#EFE9D9',
  },
  iconBadgeFocused: {
    backgroundColor: '#FBF2D8',
  },
  inputText: {
    color: '#111827',
  },
  checkboxChecked: {
    backgroundColor: '#C48F0E',
    borderWidth: 1,
    borderColor: '#F5C451',
  },
  checkboxUnchecked: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 224, 158, 0.55)',
  },
  staySignedInText: {
    color: '#E6F2EC',
  },
  encryptedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(110, 231, 183, 0.35)',
  },
  encryptedText: {
    color: '#A7F3D0',
  },
  submitButton: {
    backgroundColor: '#C48F0E',
    borderTopWidth: 1,
    borderTopColor: '#F8DC81',
    shadowColor: '#B8860B',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
  },
  submitButtonActive: {
    opacity: 1,
    shadowOpacity: 0.35,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.65,
    shadowOpacity: 0.15,
    elevation: 3,
  },
  dividerLine: {
    height: 1,
    backgroundColor: 'rgba(245, 230, 168, 0.25)',
  },
  dividerText: {
    color: '#E7D8A8',
  },
  registerCard: {
    backgroundColor: 'rgba(4, 30, 23, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 81, 0.38)',
  },
  registerIconBox: {
    backgroundColor: 'rgba(245, 196, 81, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 81, 0.35)',
  },
  registerTitle: {
    color: '#FFFFFF',
  },
  registerSubtitle: {
    color: '#CBE0D7',
  },
  footerText: {
    color: 'rgba(245, 230, 168, 0.92)',
  },
});