import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function FormHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{ paddingTop: insets.top + 10 }}
      className="mb-5 flex-row items-center bg-[#173F35] px-4 pb-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to all loans"
        onPress={onBack}
        className="mr-3 rounded-lg px-2 py-2">
        <Text className="text-sm font-bold text-[#EAD78A]">Back</Text>
      </Pressable>
      <View className="flex-1">
        <Text className="text-xs font-bold uppercase tracking-wide text-[#EAD78A]">
          Loan Management
        </Text>
        <Text className="mt-0.5 text-lg font-extrabold text-white">{title}</Text>
      </View>
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  required = false,
  multiline = false,
  autoCapitalize = 'sentences',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'decimal-pad' | 'phone-pad';
  required?: boolean;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#52645F]">
        {label}{required ? ' *' : ''}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor="#9AA6A1"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-xl border border-[#E6E9E3] bg-white px-3.5 py-3 text-sm text-[#173F35] ${multiline ? 'min-h-[88px]' : 'min-h-[48px]'}`}
      />
    </View>
  );
}

export function ChoiceChips({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onSelect: (value: string) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-[#52645F]">
        {label} *
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map(option => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelect(option.value)}
              className={`rounded-full border px-3.5 py-2.5 ${selected ? 'border-[#07564B] bg-[#07564B]' : 'border-[#E6E9E3] bg-white'}`}>
              <Text className={`text-xs font-bold ${selected ? 'text-white' : 'text-[#52645F]'}`}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SubmitButton({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      className="mb-6 min-h-12 flex-row items-center justify-center rounded-xl bg-[#07564B] px-4 py-3 disabled:opacity-60">
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text className="text-sm font-extrabold text-white">{label}</Text>
      )}
    </Pressable>
  );
}

export function errorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Please try again.';
}
