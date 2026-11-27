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
};

export default function LoanStatCard({
  id,
  label,
  value,
  icon,
  trend,
  paletteIndex,
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
      className="w-[48%] grow-0 basis-[48%]"
    />
  );
}
