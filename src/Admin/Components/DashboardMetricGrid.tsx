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
  containerClassName?: string;
};

export default function DashboardMetricGrid({
  metrics,
  containerClassName = 'mb-4',
}: Props) {
  return (
    <View className={`flex-row flex-wrap gap-3 ${containerClassName}`}>
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
