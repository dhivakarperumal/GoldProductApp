import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react-native';

export type DashboardMetricPalette = {
  start: string;
  middle: string;
  end: string;
  glow: string;
  border: string;
};

export const dashboardMetricPalettes: Record<string, DashboardMetricPalette> = {
  total_customers: {
    start: '#003D15',
    middle: '#006B29',
    end: '#002E12',
    glow: '#98FF4F',
    border: '#F6D25D',
  },
  active_gold_loans: {
    start: '#542700',
    middle: '#925500',
    end: '#3D1A00',
    glow: '#FFD33F',
    border: '#FFE071',
  },
  today_collection: {
    start: '#650447',
    middle: '#A0006C',
    end: '#3D0759',
    glow: '#FF79D4',
    border: '#FFD66E',
  },
  gold_stock_value: {
    start: '#003C47',
    middle: '#006B78',
    end: '#002A41',
    glow: '#53F2E0',
    border: '#FFD66E',
  },
  total_products: {
    start: '#793100',
    middle: '#B95700',
    end: '#5A2200',
    glow: '#FFD34D',
    border: '#FFE071',
  },
  total_categories: {
    start: '#470862',
    middle: '#79118D',
    end: '#35074F',
    glow: '#FF75DC',
    border: '#FFD66E',
  },
  completed_loans: {
    start: '#043955',
    middle: '#0A5B80',
    end: '#032843',
    glow: '#64DCFF',
    border: '#FFD66E',
  },
  low_stock_products: {
    start: '#60142A',
    middle: '#8B243C',
    end: '#3E0D24',
    glow: '#FF8AA3',
    border: '#FFD66E',
  },
};

export const dashboardMetricPaletteList = Object.values(dashboardMetricPalettes);

const defaultPalette: DashboardMetricPalette = {
  start: '#064D42',
  middle: '#087A68',
  end: '#063A37',
  glow: '#75F0C1',
  border: '#F6D25D',
};

const styles = StyleSheet.create({
  metricCard: {
    aspectRatio: 1.75,
    borderWidth: 1.5,
    elevation: 5,
    shadowColor: '#FFC837',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.58,
    shadowRadius: 6,
  },
  metricIcon: {
    elevation: 4,
    shadowColor: '#FFD34D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 5,
  },
});

type DashboardMetricCardProps = {
  id: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  testID?: string;
  palette?: DashboardMetricPalette;
  className?: string;
};

function MetricCardArtwork({
  id,
  palette,
}: {
  id: string;
  palette: DashboardMetricPalette;
}) {
  const gradientId = `metric-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const glowId = `${gradientId}-glow`;
  const goldGlowId = `${gradientId}-gold-glow`;
  const shineId = `${gradientId}-shine`;

  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height="100%"
      viewBox="0 0 220 112"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor={palette.start} />
          <Stop offset="48%" stopColor={palette.middle} />
          <Stop offset="100%" stopColor={palette.end} />
        </LinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={palette.glow} stopOpacity="0.8" />
          <Stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id={goldGlowId} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFF3A6" stopOpacity="0.85" />
          <Stop offset="42%" stopColor="#FFC629" stopOpacity="0.5" />
          <Stop offset="100%" stopColor="#FFC629" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id={shineId} x1="0%" y1="100%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#E5970E" stopOpacity="0" />
          <Stop offset="45%" stopColor="#FFD454" stopOpacity="0.72" />
          <Stop offset="58%" stopColor="#FFF8D6" stopOpacity="0.98" />
          <Stop offset="72%" stopColor="#FFCF39" stopOpacity="0.75" />
          <Stop offset="100%" stopColor="#FFF4B0" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect width="220" height="112" rx="19" fill={`url(#${gradientId})`} />
      <Circle cx="16" cy="104" r="52" fill={`url(#${glowId})`} opacity="0.62" />
      <Circle cx="205" cy="18" r="54" fill={`url(#${glowId})`} opacity="0.46" />
      <Circle cx="9" cy="14" r="28" fill={`url(#${goldGlowId})`} opacity="0.42" />
      <Circle cx="218" cy="106" r="42" fill={`url(#${goldGlowId})`} opacity="0.78" />
      <Path
        d="M126 119 C157 105 177 84 235 62"
        fill="none"
        stroke={`url(#${shineId})`}
        strokeWidth="23"
        opacity="0.62"
      />
      <Path
        d="M149 119 C174 103 192 88 235 72"
        fill="none"
        stroke="#FFD54B"
        strokeWidth="9"
        opacity="0.78"
      />
      <Path
        d="M167 118 C187 104 204 91 235 80"
        fill="none"
        stroke={`url(#${shineId})`}
        strokeWidth="4"
        opacity="0.92"
      />
      <Path
        d="M171 111 C190 98 207 86 220 79"
        fill="none"
        stroke="#FFF9D7"
        strokeWidth="1.4"
        opacity="0.9"
      />
      <Rect
        x="1"
        y="1"
        width="218"
        height="110"
        rx="18"
        fill="none"
        stroke="#FFF0A6"
        strokeOpacity="0.68"
        strokeWidth="1.5"
      />
    </Svg>
  );
}

export default function DashboardMetricCard({
  id,
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  testID,
  palette = dashboardMetricPalettes[id] || defaultPalette,
  className = 'flex-1 basis-[45%]',
}: DashboardMetricCardProps) {
  const TrendIcon = trendUp === false ? ArrowDown : ArrowUp;
  const trendColor = trendUp === false ? '#E53935' : '#2EAD48';

  return (
    <View
      testID={testID}
      className={`min-h-[104px] overflow-hidden rounded-[20px] border ${className}`}
      style={[
        styles.metricCard,
        { backgroundColor: palette.start, borderColor: palette.border },
      ]}>
      <MetricCardArtwork id={id} palette={palette} />
      <View className="flex-1 p-3">
        <View className="flex-row items-start">
          <View
            className="mr-2 h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[#FFE078] bg-black/20"
            style={styles.metricIcon}>
            <Icon size={23} color="#FFE08A" strokeWidth={2.4} />
          </View>
          <View className="min-w-0 flex-1 pt-0.5">
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              className="text-[11px] font-semibold leading-[14px] text-white">
              {label}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              className="mt-0.5 text-[21px] font-black text-[#FFE28A]">
              {value}
            </Text>
          </View>
          <View className="ml-1 h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/10">
            <ChevronRight size={15} color="#FFF4C7" />
          </View>
        </View>
        {trend ? (
          <View className="absolute bottom-2 left-3 right-2 flex-row items-center rounded-full bg-black/25 py-1 pl-1 pr-2">
            <View
              className="mr-1 h-4 w-4 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: trendColor }}>
              <TrendIcon size={11} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              className="min-w-0 flex-1 text-[9px] font-bold text-white">
              {trend}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
