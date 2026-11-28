import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
import SubscriptionCheckoutModal from '../Admin/Components/SubscriptionCheckoutModal';
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

type SubscriptionAccountPlan = {
  account_plan_type?: string;
  plan_name?: string;
  account_end_date?: string;
};

type SubscriptionFailureCode = 'TRIAL_EXPIRED' | 'SUBSCRIPTION_REQUIRED';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getApiErrorPayload(error: unknown) {
  return isRecord(error) && isRecord(error.data) ? error.data : null;
}

function parseAccountPlan(value: unknown): SubscriptionAccountPlan {
  if (!isRecord(value)) return {};
  return {
    account_plan_type:
      typeof value.account_plan_type === 'string'
        ? value.account_plan_type
        : undefined,
    plan_name: typeof value.plan_name === 'string' ? value.plan_name : undefined,
    account_end_date:
      typeof value.account_end_date === 'string'
        ? value.account_end_date
        : undefined,
  };
}

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
  const [subscriptionFailureCode, setSubscriptionFailureCode] =
    useState<SubscriptionFailureCode | null>(null);
  const [expiredAccountPlan, setExpiredAccountPlan] =
    useState<SubscriptionAccountPlan | null>(null);
  const [checkoutToken, setCheckoutToken] = useState('');
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [subscriptionActionBusy, setSubscriptionActionBusy] = useState(false);
  const [subscriptionActionMessage, setSubscriptionActionMessage] = useState('');
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
      setSubscriptionFailureCode(null);
      setExpiredAccountPlan(null);
      setCheckoutToken('');
      setCheckoutVisible(false);
      setTokenCache(token);
      onLogin(user);
    } catch (error) {
      const payload = getApiErrorPayload(error);
      if (
        payload?.code === 'TRIAL_EXPIRED' ||
        payload?.code === 'SUBSCRIPTION_REQUIRED'
      ) {
        Keyboard.dismiss();
        setSubscriptionFailureCode(payload.code);
        setExpiredAccountPlan(parseAccountPlan(payload.accountPlan));
        setSubscriptionActionMessage('');
        setErrorMessage('');
        return;
      }
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestSubscriptionAccess = async () => {
    const response = await api.post('/auth/subscription-access', {
      identifier: identifier.trim(),
      password,
    });
    const token: unknown = response.data?.checkoutToken;
    if (typeof token !== 'string' || token.length === 0) {
      throw new Error('The server did not return checkout access.');
    }
    return token;
  };

  const startSubscriptionCheckout = async () => {
    if (subscriptionActionBusy) return;
    setSubscriptionActionBusy(true);
    setSubscriptionActionMessage('');
    try {
      const token = await requestSubscriptionAccess();
      setCheckoutToken(token);
      setCheckoutVisible(true);
    } catch (error) {
      setSubscriptionActionMessage(getErrorMessage(error));
    } finally {
      setSubscriptionActionBusy(false);
    }
  };

  const requestSuperAdminHelp = async () => {
    if (subscriptionActionBusy) return;
    setSubscriptionActionBusy(true);
    setSubscriptionActionMessage('');
    try {
      const token = await requestSubscriptionAccess();
      setCheckoutToken(token);
      const response = await api.post(
        '/subscriptions/requests',
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setSubscriptionActionMessage(
        response.data?.message ||
          'Your request has been sent to the Super Admin.',
      );
    } catch (error) {
      setSubscriptionActionMessage(getErrorMessage(error));
    } finally {
      setSubscriptionActionBusy(false);
    }
  };

  const closeSubscriptionFailure = () => {
    setSubscriptionFailureCode(null);
    setExpiredAccountPlan(null);
    setSubscriptionActionMessage('');
  };

  const handleSubscriptionPaymentComplete = () => {
    setCheckoutVisible(false);
    setCheckoutToken('');
    closeSubscriptionFailure();
    setErrorMessage(
      'Subscription payment verified. Please sign in again to continue.',
    );
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
                  Sign In
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
                        focusedField === 'identifier' ? '#F5C451' : '#E9DFC0'
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
                    placeholderTextColor="rgba(220, 236, 228, 0.65)"
                    selectionColor="#F5C451"
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
                        focusedField === 'password' ? '#F5C451' : '#E9DFC0'
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
                    placeholderTextColor="rgba(220, 236, 228, 0.65)"
                    selectionColor="#F5C451"
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
                      <EyeOff size={18} color="#F5C451" />
                    ) : (
                      <Eye size={18} color="#F5C451" />
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
      <Modal
        visible={Boolean(expiredAccountPlan) && !checkoutVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeSubscriptionFailure}>
        <View
          className="flex-1 items-center justify-center bg-black/65 px-4"
          style={{
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
          }}>
          <View className="w-full max-w-md rounded-[26px] border border-[#E6D39A] bg-white p-5 shadow-2xl">
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF5D6]">
              <ShieldCheck size={25} color="#A77B15" />
            </View>
            <Text className="text-xl font-extrabold text-[#173F35]">
              {subscriptionFailureCode === 'TRIAL_EXPIRED'
                ? 'Your free trial has ended'
                : 'Subscription required'}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-[#59615D]">
              {subscriptionFailureCode === 'TRIAL_EXPIRED'
                ? 'Choose a plan to continue using your shop account.'
                : 'A paid subscription is required before this shop account can continue.'}
            </Text>
            {expiredAccountPlan?.plan_name ? (
              <View className="mt-4 rounded-xl border border-[#EFE5C5] bg-[#FFFCF2] p-3">
                <Text className="text-xs font-semibold text-[#7C6A36]">
                  Current plan
                </Text>
                <Text className="mt-1 text-sm font-bold text-[#173F35]">
                  {expiredAccountPlan.plan_name}
                </Text>
                {expiredAccountPlan.account_end_date ? (
                  <Text className="mt-1 text-xs text-[#64748B]">
                    Ended {expiredAccountPlan.account_end_date}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {subscriptionActionMessage ? (
              <Text
                accessibilityRole="alert"
                className="mt-4 rounded-xl border border-[#E7D8AA] bg-[#FFFCF2] px-3 py-2.5 text-sm leading-5 text-[#725614]">
                {subscriptionActionMessage}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Subscribe to a plan"
              disabled={subscriptionActionBusy}
              onPress={startSubscriptionCheckout}
              className="mt-5 min-h-12 flex-row items-center justify-center rounded-2xl bg-[#07564B] px-4">
              {subscriptionActionBusy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <LockKeyhole size={17} color="#FFE08A" />
              )}
              <Text className="ml-2 text-sm font-extrabold text-white">
                {subscriptionActionBusy ? 'Preparing checkout…' : 'Subscribe now'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={subscriptionActionBusy}
              onPress={requestSuperAdminHelp}
              className="mt-2 min-h-11 flex-row items-center justify-center rounded-2xl border border-[#D8C27B] bg-[#FFFCF2] px-4">
              <Store size={16} color="#8A6812" />
              <Text className="ml-2 text-sm font-bold text-[#725614]">
                Ask Super Admin
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={closeSubscriptionFailure}
              className="mt-3 min-h-10 items-center justify-center rounded-xl">
              <Text className="text-sm font-semibold text-[#64748B]">
                Back to sign in
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <SubscriptionCheckoutModal
        visible={checkoutVisible}
        token={checkoutToken}
        onClose={() => setCheckoutVisible(false)}
        onPaymentComplete={handleSubscriptionPaymentComplete}
      />
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(245, 224, 158, 0.35)',
    borderTopColor: 'rgba(255, 255, 255, 0.32)',
  },
  inputRowFocused: {
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderColor: '#F5C451',
  },
  iconBadgeIdle: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  iconBadgeFocused: {
    backgroundColor: 'rgba(245, 196, 81, 0.22)',
  },
  inputText: {
    color: '#FFFFFF',
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
    borderWidth: 0,
  },
  submitButtonActive: {
    opacity: 1,
  },
  submitButtonDisabled: {
    opacity: 0.65,
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