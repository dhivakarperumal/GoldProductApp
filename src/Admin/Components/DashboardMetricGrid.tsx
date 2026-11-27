import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import DashboardMetricCard, {
  dashboardMetricPalettes,
} from './DashboardMetricCard';

type DashboardMetric = {
  id: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  palette: keyof typeof dashboardMetricPalettes;
  trend?: string;
  trendUp?: boolean;
};

type Props = {
  metrics: DashboardMetric[];
};

export default function DashboardMetricGrid({ metrics }: Props) {
  return (
    <View className="mb-4 flex-row flex-wrap gap-3">
      {metrics.map(metric => (
        <DashboardMetricCard
          key={metric.id}
          id={metric.id}
          label={metric.label}
          value={metric.value}
          icon={metric.icon}
          palette={dashboardMetricPalettes[metric.palette]}
          trend={metric.trend}
          trendUp={metric.trendUp}
          className="min-w-[45%] flex-1 basis-[45%]"
        />
      ))}
    </View>
  );
}
