import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CustomDropdown, DatePicker } from './FormControls';

type DateRange = { startDate: string; endDate: string };

const PRESETS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Date Range' },
];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function shiftDays(date: Date, days: number) {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

function resolvePreset(preset: string): DateRange {
  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const weekStart = shiftDays(start, -((start.getDay() + 6) % 7));
  const ranges: Record<string, [Date, Date]> = {
    today: [start, start],
    yesterday: [shiftDays(start, -1), shiftDays(start, -1)],
    this_week: [weekStart, shiftDays(weekStart, 6)],
    last_week: [shiftDays(weekStart, -7), shiftDays(weekStart, -1)],
    this_month: [
      new Date(start.getFullYear(), start.getMonth(), 1),
      new Date(start.getFullYear(), start.getMonth() + 1, 0),
    ],
    last_month: [
      new Date(start.getFullYear(), start.getMonth() - 1, 1),
      new Date(start.getFullYear(), start.getMonth(), 0),
    ],
    this_year: [
      new Date(start.getFullYear(), 0, 1),
      new Date(start.getFullYear(), 11, 31),
    ],
    last_year: [
      new Date(start.getFullYear() - 1, 0, 1),
      new Date(start.getFullYear() - 1, 11, 31),
    ],
  };
  const range = ranges[preset];
  return range
    ? { startDate: dateKey(range[0]), endDate: dateKey(range[1]) }
    : { startDate: '', endDate: '' };
}

export default function LoanDateRangeFilter({
  onApply,
  compact = false,
}: {
  onApply: (range: DateRange) => void;
  compact?: boolean;
}) {
  const [preset, setPreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const selectPreset = (value: string) => {
    setPreset(value);
    setError('');
    if (value !== 'custom') onApply(resolvePreset(value));
  };

  const applyCustomRange = () => {
    if (!startDate || !endDate) {
      setError('Choose both a start and end date.');
      return;
    }
    if (startDate > endDate) {
      setError('Start date cannot be later than end date.');
      return;
    }
    setError('');
    onApply({ startDate, endDate });
  };

  const clearFilter = () => {
    setPreset('all');
    setStartDate('');
    setEndDate('');
    setError('');
    onApply(resolvePreset('all'));
  };

  return (
    <View
      className={
        compact
          ? 'min-w-0 flex-1'
          : 'mb-3 rounded-xl border border-[#E6E9E3] bg-white p-3'
      }>
      <CustomDropdown
        label="Date Range"
        value={preset}
        options={PRESETS}
        onSelect={selectPreset}
        variant={compact ? 'filter' : 'default'}
      />
      {preset === 'custom' ? (
        <>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={setEndDate}
            minimumDate={
              startDate ? new Date(`${startDate}T00:00:00`) : undefined
            }
          />
          {error ? (
            <Text className="mb-2 text-xs font-semibold text-[#B42332]">
              {error}
            </Text>
          ) : null}
          <View className="flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              onPress={applyCustomRange}
              className="flex-1 items-center rounded-xl bg-[#064A41] px-3 py-3"
            >
              <Text className="text-sm font-bold text-white">Apply Filter</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={clearFilter}
              className="items-center rounded-xl border border-[#D9DED9] px-3 py-3"
            >
              <Text className="text-sm font-bold text-[#52645F]">Clear</Text>
            </Pressable>
          </View>
        </>
      ) : preset !== 'all' ? (
        <Pressable
          accessibilityRole="button"
          onPress={clearFilter}
          className="self-start pb-1"
        >
          <Text className="text-xs font-bold text-[#07564B]">
            Clear date filter
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
