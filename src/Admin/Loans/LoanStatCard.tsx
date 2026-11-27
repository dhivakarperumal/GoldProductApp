import type { LucideIcon } from 'lucide-react-native';
import DashboardMetricCard, {
  dashboardMetricPaletteList,
} from '../Components/DashboardMetricCard';

type LoanStatCardProps = {
  id: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend: string;
  paletteIndex: number;
  columns?: 2 | 3;
};

export default function LoanStatCard({
  id,
  label,
  value,
  icon,
  trend,
  paletteIndex,
  columns = 2,
}: LoanStatCardProps) {
  const palette =
    dashboardMetricPaletteList[paletteIndex % dashboardMetricPaletteList.length];

  return (
    <DashboardMetricCard
      id={`loan-${id}`}
      label={label}
      value={value}
      icon={icon}
      trend={trend}
      palette={palette}
      compact={columns === 3}
      className={
        columns === 3
          ? 'flex-1 basis-[30%]'
          : 'w-[48%] grow-0 basis-[48%]'
      }
    />
  );
}
