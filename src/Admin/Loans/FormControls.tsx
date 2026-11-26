import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SelectOption = { value: string; label: string };

export function CustomDropdown({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select an option',
  required = false,
  searchable = false,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();
  const selectedLabel = options.find(option => option.value === value)?.label;
  const filteredOptions = searchable
    ? options.filter(option => option.label.toLowerCase().includes(search.trim().toLowerCase()))
    : options;
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#52645F]">
        {label}{required ? ' *' : ''}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          setSearch('');
          setOpen(true);
        }}
        className="min-h-12 flex-row items-center justify-between rounded-xl border border-[#E6E9E3] bg-white px-3.5 py-3">
        <Text className={`text-sm ${selectedLabel ? 'text-[#173F35]' : 'text-[#9AA6A1]'}`}>
          {selectedLabel || placeholder}
        </Text>
        <ChevronDown size={18} color="#6B7E76" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable accessibilityLabel="Close options" onPress={() => setOpen(false)} className="flex-1" />
          <View
            style={{ paddingBottom: Math.max(insets.bottom, 32) }}
            className="max-h-[70%] rounded-t-3xl bg-white">
            <View className="flex-row items-center justify-between rounded-t-3xl bg-[#173F35] px-5 py-4">
              <Text className="text-base font-extrabold text-white">Select {label}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close dropdown" onPress={() => setOpen(false)}>
                <X size={20} color="#EAD78A" />
              </Pressable>
            </View>
            {searchable ? (
              <TextInput
                accessibilityLabel={`Search ${label}`}
                value={search}
                onChangeText={setSearch}
                placeholder={`Search ${label.toLowerCase()}`}
                placeholderTextColor="#9AA6A1"
                className="mx-4 my-3 min-h-11 rounded-xl border border-[#E6E9E3] bg-white px-3.5 text-sm text-[#173F35]"
              />
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredOptions.map(option => (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: option.value === value }}
                  onPress={() => {
                    onSelect(option.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`border-b border-[#F1F2EE] px-5 py-4 ${option.value === value ? 'bg-[#EFF9F5]' : 'bg-white'}`}>
                  <Text className={`text-sm ${option.value === value ? 'font-bold text-[#07564B]' : 'text-[#173F35]'}`}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
              {filteredOptions.length === 0 ? (
                <Text className="px-5 py-4 text-sm text-[#6B7E76]">No matching options.</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function DatePicker({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate = new Date(),
  initialDate = new Date(new Date().getFullYear() - 18, 0, 1),
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  maximumDate?: Date | null;
  initialDate?: Date;
}) {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(new Date());
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : initialDate;
  const dateLabel = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : `Select ${label.toLowerCase()}`;

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: selectedDate,
        mode: 'date',
        ...(minimumDate ? { minimumDate } : {}),
        ...(maximumDate ? { maximumDate } : {}),
        startOnYearSelection: true,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(formatDate(date));
        },
      });
      return;
    }

    setDraftDate(selectedDate);
    setOpen(true);
  };

  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[#52645F]">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={openPicker}
        className="min-h-12 flex-row items-center justify-between rounded-xl border border-[#E6E9E3] bg-white px-3.5 py-3">
        <Text className={`text-sm ${value ? 'text-[#173F35]' : 'text-[#9AA6A1]'}`}>{dateLabel}</Text>
        <Text className="text-sm text-[#07564B]">▦</Text>
      </Pressable>
      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View className="flex-1 items-center justify-center bg-black/40 px-5">
            <View className="w-full rounded-3xl bg-white p-5">
              <Text className="mb-4 text-lg font-extrabold text-[#173F35]">
                Select {label.toLowerCase()}
              </Text>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                minimumDate={minimumDate}
                maximumDate={maximumDate || undefined}
                onChange={(_event, date) => {
                  if (date) setDraftDate(date);
                }}
              />
              <View className="mt-5 flex-row justify-end gap-2">
                <Pressable onPress={() => setOpen(false)} className="rounded-xl bg-[#F3F4F1] px-4 py-3">
                  <Text className="font-bold text-[#52645F]">Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onChange(formatDate(draftDate));
                    setOpen(false);
                  }}
                  className="rounded-xl bg-[#07564B] px-4 py-3">
                  <Text className="font-bold text-white">Confirm</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
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
  readOnly = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'decimal-pad' | 'phone-pad';
  required?: boolean;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  readOnly?: boolean;
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
        editable={!readOnly}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`rounded-xl border border-[#E6E9E3] px-3.5 py-3 text-sm text-[#173F35] ${readOnly ? 'bg-[#F3F4F1]' : 'bg-white'} ${multiline ? 'min-h-[88px]' : 'min-h-[48px]'}`}
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
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }
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
