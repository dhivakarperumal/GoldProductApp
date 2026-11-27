import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
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
  variant = 'default',
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onSelect: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  searchable?: boolean;
  variant?: 'default' | 'filter' | 'glass';
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const insets = useSafeAreaInsets();
  const isGlass = variant === 'glass';
  const selectedLabel = options.find(option => option.value === value)?.label;
  const filteredOptions = searchable
    ? options.filter(option => option.label.toLowerCase().includes(search.trim().toLowerCase()))
    : options;
  return (
    <View className="mb-4">
      <Text
        style={isGlass ? glassStyles.label : undefined}
        className={
          isGlass
            ? 'mb-1.5 ml-1 text-xs font-bold uppercase tracking-[0.8px]'
            : 'mb-1.5 text-xs font-bold uppercase tracking-wide text-[#52645F]'
        }>
        {label}
        {required ? (
          <Text style={isGlass ? glassStyles.required : undefined}> *</Text>
        ) : null}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          setSearch('');
          setOpen(true);
        }}
        className={`min-h-12 flex-row items-center justify-between py-3 ${
          variant === 'filter'
            ? 'rounded-2xl border border-[#E8D596] bg-white px-4 shadow-sm'
            : 'rounded-xl border border-[#E6E9E3] bg-white px-3.5'
        }`}>
        <Text className={`text-sm ${selectedLabel ? 'text-[#173F35]' : 'text-[#9AA6A1]'}`}>
          {selectedLabel || placeholder}
        </Text>
        <ChevronDown size={18} color={isGlass ? '#F5C451' : '#6B7E76'} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View
          style={isGlass ? glassStyles.modalBackdrop : undefined}
          className={isGlass ? 'flex-1 justify-end' : 'flex-1 justify-end bg-black/40'}>
          <Pressable accessibilityLabel="Close options" onPress={() => setOpen(false)} className="flex-1" />
          <View
            style={[
              isGlass ? glassStyles.modalSheet : undefined,
              { paddingBottom: Math.max(insets.bottom, 32) },
            ]}
            className={isGlass ? 'max-h-[70%]' : 'max-h-[70%] rounded-t-3xl bg-white'}>
            {isGlass ? (
              <>
                <View pointerEvents="none" style={glassStyles.modalSheen} />
                <View pointerEvents="none" style={glassStyles.modalGlowGold} />
              </>
            ) : null}
            <View
              style={isGlass ? glassStyles.modalHeader : undefined}
              className={
                isGlass
                  ? 'flex-row items-center justify-between px-5 py-4'
                  : 'flex-row items-center justify-between rounded-t-3xl bg-[#173F35] px-5 py-4'
              }>
              <Text className="text-base font-extrabold text-white">Select {label}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dropdown"
                onPress={() => setOpen(false)}
                style={isGlass ? glassStyles.closeButton : undefined}
                className={isGlass ? 'h-9 w-9 items-center justify-center rounded-full' : undefined}>
                <X size={isGlass ? 18 : 20} color={isGlass ? '#F5C451' : '#EAD78A'} />
              </Pressable>
            </View>
            {searchable ? (
              <TextInput
                accessibilityLabel={`Search ${label}`}
                value={search}
                onChangeText={setSearch}
                placeholder={`Search ${label.toLowerCase()}`}
                placeholderTextColor={isGlass ? 'rgba(220, 236, 228, 0.65)' : '#9AA6A1'}
                selectionColor={isGlass ? '#F5C451' : undefined}
                style={isGlass ? glassStyles.searchInput : undefined}
                className={
                  isGlass
                    ? 'mx-4 my-3 min-h-11 rounded-2xl px-4 text-sm font-medium'
                    : 'mx-4 my-3 min-h-11 rounded-xl border border-[#E6E9E3] bg-white px-3.5 text-sm text-[#173F35]'
                }
              />
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled">
              {filteredOptions.map(option => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onSelect(option.value);
                      setOpen(false);
                      setSearch('');
                    }}
                    style={
                      isGlass
                        ? isSelected
                          ? glassStyles.optionSelected
                          : glassStyles.optionIdle
                        : undefined
                    }
                    className={
                      isGlass
                        ? 'flex-row items-center justify-between px-5 py-4'
                        : `border-b border-[#F1F2EE] px-5 py-4 ${isSelected ? 'bg-[#EFF9F5]' : 'bg-white'}`
                    }>
                    <Text
                      style={
                        isGlass
                          ? isSelected
                            ? glassStyles.optionTextSelected
                            : glassStyles.optionTextIdle
                          : undefined
                      }
                      className={
                        isGlass
                          ? isSelected
                            ? 'text-sm font-bold'
                            : 'text-sm font-medium'
                          : `text-sm ${isSelected ? 'font-bold text-[#07564B]' : 'text-[#173F35]'}`
                      }>
                      {option.label}
                    </Text>
                    {isGlass && isSelected ? <View style={glassStyles.selectedDot} /> : null}
                  </Pressable>
                );
              })}
              {filteredOptions.length === 0 ? (
                <Text
                  style={isGlass ? glassStyles.emptyText : undefined}
                  className={isGlass ? 'px-5 py-4 text-sm' : 'px-5 py-4 text-sm text-[#6B7E76]'}>
                  No matching options.
                </Text>
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
  variant = 'default',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minimumDate?: Date;
  maximumDate?: Date | null;
  initialDate?: Date;
  variant?: 'default' | 'glass';
}) {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(new Date());
  const isGlass = variant === 'glass';
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
      <Text
        style={isGlass ? glassStyles.label : undefined}
        className={
          isGlass
            ? 'mb-1.5 ml-1 text-xs font-bold uppercase tracking-[0.8px]'
            : 'mb-1.5 text-xs font-bold uppercase tracking-wide text-[#52645F]'
        }>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={openPicker}
        style={isGlass ? glassStyles.trigger : undefined}
        className={
          isGlass
            ? 'min-h-12 flex-row items-center justify-between rounded-2xl px-4 py-3'
            : 'min-h-12 flex-row items-center justify-between rounded-xl border border-[#E6E9E3] bg-white px-3.5 py-3'
        }>
        <Text
          style={
            isGlass
              ? value
                ? glassStyles.valueText
                : glassStyles.placeholderText
              : undefined
          }
          className={
            isGlass
              ? 'text-[15px] font-medium'
              : `text-sm ${value ? 'text-[#173F35]' : 'text-[#9AA6A1]'}`
          }>
          {dateLabel}
        </Text>
        <Text
          style={isGlass ? glassStyles.calendarIcon : undefined}
          className={isGlass ? 'text-sm' : 'text-sm text-[#07564B]'}>
          ▦
        </Text>
      </Pressable>
      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View
            style={isGlass ? glassStyles.modalBackdrop : undefined}
            className={
              isGlass
                ? 'flex-1 items-center justify-center px-5'
                : 'flex-1 items-center justify-center bg-black/40 px-5'
            }>
            <View
              style={isGlass ? glassStyles.dateModalCard : undefined}
              className={isGlass ? 'w-full p-5' : 'w-full rounded-3xl bg-white p-5'}>
              <Text
                style={isGlass ? glassStyles.valueText : undefined}
                className={
                  isGlass
                    ? 'mb-4 text-lg font-extrabold'
                    : 'mb-4 text-lg font-extrabold text-[#173F35]'
                }>
                Select {label.toLowerCase()}
              </Text>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                themeVariant={isGlass ? 'dark' : undefined}
                minimumDate={minimumDate}
                maximumDate={maximumDate || undefined}
                onChange={(_event, date) => {
                  if (date) setDraftDate(date);
                }}
              />
              <View className="mt-5 flex-row justify-end gap-2">
                <Pressable
                  onPress={() => setOpen(false)}
                  style={isGlass ? glassStyles.dateCancelButton : undefined}
                  className={isGlass ? 'rounded-xl px-4 py-3' : 'rounded-xl bg-[#F3F4F1] px-4 py-3'}>
                  <Text
                    style={isGlass ? glassStyles.dateCancelText : undefined}
                    className={isGlass ? 'font-bold' : 'font-bold text-[#52645F]'}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onChange(formatDate(draftDate));
                    setOpen(false);
                  }}
                  style={isGlass ? glassStyles.dateConfirmButton : undefined}
                  className={isGlass ? 'rounded-xl px-4 py-3' : 'rounded-xl bg-[#07564B] px-4 py-3'}>
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

const glassStyles = StyleSheet.create({
  label: {
    color: '#F5E6B8',
  },
  required: {
    color: '#FCA5A5',
  },
  trigger: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 224, 158, 0.35)',
    borderTopColor: 'rgba(255, 255, 255, 0.32)',
  },
  valueText: {
    color: '#FFFFFF',
  },
  placeholderText: {
    color: 'rgba(220, 236, 228, 0.65)',
  },
  calendarIcon: {
    color: '#F5C451',
  },
  modalBackdrop: {
    backgroundColor: 'rgba(2, 18, 14, 0.72)',
  },
  modalSheet: {
    backgroundColor: 'rgba(6, 46, 35, 0.94)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(245, 215, 130, 0.38)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.38)',
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  modalSheen: {
    position: 'absolute',
    top: -40,
    left: -20,
    right: 60,
    height: 95,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalGlowGold: {
    position: 'absolute',
    top: -45,
    right: -35,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 196, 81, 0.12)',
  },
  modalHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 230, 168, 0.2)',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 215, 130, 0.35)',
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 224, 158, 0.35)',
    borderTopColor: 'rgba(255, 255, 255, 0.32)',
    color: '#FFFFFF',
  },
  optionIdle: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 230, 168, 0.14)',
  },
  optionSelected: {
    backgroundColor: 'rgba(245, 196, 81, 0.18)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 196, 81, 0.35)',
  },
  optionTextIdle: {
    color: '#E7F2EC',
  },
  optionTextSelected: {
    color: '#F5C451',
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#F5C451',
  },
  emptyText: {
    color: '#CBE0D7',
  },
  dateModalCard: {
    backgroundColor: 'rgba(6, 46, 35, 0.95)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(245, 215, 130, 0.4)',
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.38)',
  },
  dateCancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 224, 158, 0.35)',
  },
  dateCancelText: {
    color: '#F5E6B8',
  },
  dateConfirmButton: {
    backgroundColor: '#C48F0E',
  },
});
