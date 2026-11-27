import { Pressable, TextInput, View } from 'react-native';
import { Search, X } from 'lucide-react-native';
import LoanDateRangeFilter from './LoanDateRangeFilter';
import { CustomDropdown } from './FormControls';

type DateRange = { startDate: string; endDate: string };
type FilterOption = { value: string; label: string };

type LoanListFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchAccessibilityLabel: string;
  searchPlaceholder: string;
  onDateRangeChange: (range: DateRange) => void;
  statusLabel: string;
  statusValue: string;
  statusOptions: FilterOption[];
  onStatusChange: (value: string) => void;
};

export default function LoanListFilters({
  search,
  onSearchChange,
  searchAccessibilityLabel,
  searchPlaceholder,
  onDateRangeChange,
  statusLabel,
  statusValue,
  statusOptions,
  onStatusChange,
}: LoanListFiltersProps) {
  return (
    <>
      <View className="mb-3 flex-row items-center rounded-2xl border border-[#E8D596] bg-white px-4 shadow-sm">
        <Search size={18} color="#A77B15" />
        <TextInput
          accessibilityLabel={searchAccessibilityLabel}
          value={search}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          placeholderTextColor="#9AA6A1"
          className="min-h-12 flex-1 px-3 text-sm text-[#173F35]"
        />
        {search ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => onSearchChange('')}
            hitSlop={8}>
            <X size={18} color="#6B7E76" />
          </Pressable>
        ) : null}
      </View>

      <View className="mb-3 flex-row items-start gap-3">
        <LoanDateRangeFilter
          compact
          onApply={onDateRangeChange}
        />
        <View className="min-w-0 flex-1">
          <CustomDropdown
            label={statusLabel}
            value={statusValue}
            options={statusOptions}
            onSelect={onStatusChange}
            variant="filter"
          />
        </View>
      </View>
    </>
  );
}
