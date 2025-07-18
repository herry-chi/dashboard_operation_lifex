"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartComment } from "@/components/chart-comment"
import { ArrowUp, ArrowDown, TrendingUp, Users, DollarSign, FileText } from "lucide-react"

// Assuming the Deal interface is defined elsewhere and imported
// For standalone development, let's define it here.
interface Deal {
  deal_id: string;
  deal_name: string;
  broker_name: string;
  deal_value: number;
  created_time?: string | null;
  "Enquiry Leads": string | null;
  Opportunity: string | null;
  "1. Application": string | null;
  "2. Assessment": string | null;
  "3. Approval": string | null;
  "4. Loan Document": string | null;
  "5. Settlement Queue": string | null;
  "6. Settled": string | null;
  latest_date: string | null;
  status: string;
}

interface WeeklyStat {
  week: string;
  totalDeals: number;
  settledValue: number;
  settledRate: number;
  conversionRate: number;
  totalDealsChange?: number;
  settledValueChange?: number;
  settledRateChange?: number;
  conversionRateChange?: number;
}

const getWeekStartDate = (dateString: string): string => {
  const date = new Date(dateString);
  // Use local time instead of UTC to avoid timezone issues
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diff = day === 0 ? -6 : 1 - day; // Calculate days to subtract to get to Monday
  
  // Create a new date object to avoid mutating the original
  const monday = new Date(date.getTime() + diff * 24 * 60 * 60 * 1000);
  
  // Format to YYYY-MM-DD using local time
  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(monday.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${dayOfMonth}`;
};

const formatCurrency = (value: number) => new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}).format(value);

const ChangeBadge = ({ value, isRate = false }: { value?: number; isRate?: boolean }) => {
  if (value === undefined || !isFinite(value) || value === 0) {
    return null;
  }
  const isPositive = value > 0;
  const colorClass = isPositive ? "text-green-600" : "text-red-600";
  const Icon = isPositive ? ArrowUp : ArrowDown;
  const sign = isPositive ? "+" : "";
  const unit = isRate ? "pp" : "%";

  return (
    <span className={`inline-flex items-center text-xs font-semibold ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {sign}{value.toFixed(1)}{unit}
    </span>
  );
};

const MetricDisplay = ({ title, value, change, icon: Icon, isCurrency = false, isRate = false }: { title: string; value: string; change?: number; icon: React.ElementType; isCurrency?: boolean; isRate?: boolean }) => (
  <div className="flex flex-col p-3 rounded-lg border border-violet/20 bg-white/50 shadow-sm">
    <div className="flex items-center justify-between text-sm text-violet/80 font-medium">
      <span>{title}</span>
      <Icon className="h-4 w-4 text-violet/70" />
    </div>
    <div className="flex items-baseline space-x-2 mt-1">
      <span className="text-2xl font-bold text-pink-500">{value}</span>
      <ChangeBadge value={change} isRate={isRate} />
    </div>
  </div>
);

const calculateWeeklyStats = (deals: Deal[]): WeeklyStat[] => {
    if (!deals || deals.length === 0) {
        return [];
    }

    const weeklyGroups = deals.reduce((acc, deal) => {
        const dateKey = deal.latest_date || deal["6. Settled"] || deal.created_time;
        if (dateKey) {
            try {
                const weekStartDate = getWeekStartDate(dateKey);
                if (!acc[weekStartDate]) {
                    acc[weekStartDate] = [];
                }
                acc[weekStartDate].push(deal);
            } catch (e) {
                console.error(`Invalid date for deal ${deal.deal_id}: ${dateKey}`);
            }
        }
        return acc;
    }, {} as Record<string, Deal[]>);

    // This logic now mirrors the main dashboard's stats calculation.
    const isConverted = (deal: Deal) =>
        (deal["1. Application"] && deal["1. Application"].trim() !== "") ||
        (deal["2. Assessment"] && deal["2. Assessment"].trim() !== "") ||
        (deal["3. Approval"] && deal["3. Approval"].trim() !== "") ||
        (deal["4. Loan Document"] && deal["4. Loan Document"].trim() !== "") ||
        (deal["5. Settlement Queue"] && deal["5. Settlement Queue"].trim() !== "") ||
        (deal["6. Settled"] && deal["6. Settled"].trim() !== "") ||
        (deal["2025 Settlement"] && deal["2025 Settlement"].trim() !== "") ||
        (deal["2024 Settlement"] && deal["2024 Settlement"].trim() !== "");

    return Object.entries(weeklyGroups).map(([week, dealsInWeek]) => {
        const totalDeals = dealsInWeek.length;
        const convertedCount = dealsInWeek.filter(isConverted).length;
        const settledDeals = dealsInWeek.filter(d => d["6. Settled"] && d["6. Settled"].trim() !== "");
        const settledCount = settledDeals.length;

        const conversionRate = totalDeals > 0 ? (convertedCount / totalDeals) * 100 : 0;
        const settledRate = totalDeals > 0 ? (settledCount / totalDeals) * 100 : 0;
        const settledValue = settledDeals.reduce((sum, d) => sum + (d.deal_value || 0), 0);

        return {
            week,
            totalDeals,
            settledValue,
            settledRate,
            conversionRate,
        };
    });
}


export function WeeklyAnalysis({ filteredDeals, allDeals }: { filteredDeals: Deal[], allDeals: Deal[] }) {
  const weeklyData = useMemo((): WeeklyStat[] => {
    const stats = calculateWeeklyStats(filteredDeals);
    
    const sortedByDateAsc = stats.sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

    const withChange = sortedByDateAsc.map((currentWeek, index, allWeeks) => {
      if (index === 0) {
        return currentWeek;
      }
      const previousWeek = allWeeks[index - 1];

      const calculateChange = (current: number, previous: number): number | undefined => {
        if (previous === 0) {
          return current > 0 ? Infinity : 0;
        }
        if (current === 0 && previous > 0) {
            return -100;
        }
        return ((current - previous) / previous) * 100;
      };

      return {
        ...currentWeek,
        totalDealsChange: calculateChange(currentWeek.totalDeals, previousWeek.totalDeals),
        settledValueChange: calculateChange(currentWeek.settledValue, previousWeek.settledValue),
        settledRateChange: currentWeek.settledRate - previousWeek.settledRate,
        conversionRateChange: currentWeek.conversionRate - previousWeek.conversionRate,
      };
    });

    return withChange.sort((a, b) => new Date(b.week).getTime() - new Date(a.week).getTime());

  }, [filteredDeals]);

  const averages = useMemo((): Omit<WeeklyStat, 'week'> | null => {
    const allWeeklyStats = calculateWeeklyStats(allDeals);
    if (allWeeklyStats.length === 0) {
      return null;
    }

    const totalWeeks = allWeeklyStats.length;
    const sum = allWeeklyStats.reduce((acc, weekStat) => ({
      totalDeals: acc.totalDeals + weekStat.totalDeals,
      settledValue: acc.settledValue + weekStat.settledValue,
      settledRate: acc.settledRate + weekStat.settledRate,
      conversionRate: acc.conversionRate + weekStat.conversionRate,
    }), { totalDeals: 0, settledValue: 0, settledRate: 0, conversionRate: 0 });

    return {
      totalDeals: sum.totalDeals / totalWeeks,
      settledValue: sum.settledValue / totalWeeks,
      settledRate: sum.settledRate / totalWeeks,
      conversionRate: sum.conversionRate / totalWeeks,
    };
  }, [allDeals]);

  return (
    <div className="space-y-6 mt-4">
      <Card className="bg-white/60 border-violet/20 shadow-sm">
        <CardHeader>
          <CardTitle className="text-violet">Weekly Performance Analysis</CardTitle>
          <CardDescription className="text-violet/80">
            A weekly breakdown of key performance metrics. Weekly cards are based on filters. The average is based on all data.
          </CardDescription>
        </CardHeader>
      </Card>

      {weeklyData.length > 0 ? (
        <>
          {averages && (
            <Card className="bg-white/80 border-violet/40 shadow-lg ring-2 ring-violet/15">
              <CardHeader className="bg-gradient-to-r from-violet/5 to-hot-pink/5 rounded-t-lg">
                <CardTitle className="text-violet font-bold text-xl flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-hot-pink" />
                  Overall Weekly Average (All Time)
                </CardTitle>
                <CardDescription className="text-violet/80 font-medium">
                  Baseline performance metrics across all historical data
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/50">
                <MetricDisplay title="Avg. Total Deals" value={averages.totalDeals.toFixed(1)} icon={FileText} />
                <MetricDisplay title="Avg. Settled Value" value={formatCurrency(averages.settledValue)} icon={DollarSign} isCurrency />
                <MetricDisplay title="Avg. Settled Rate" value={`${averages.settledRate.toFixed(1)}%`} icon={TrendingUp} isRate />
                <MetricDisplay title="Avg. Conversion Rate" value={`${averages.conversionRate.toFixed(1)}%`} icon={Users} isRate />
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {weeklyData.map((stat) => (
              <Card key={stat.week} className="bg-white/60 border-violet/20 shadow-sm hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <CardTitle className="text-violet">Week of {stat.week}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MetricDisplay title="Total Deals" value={stat.totalDeals.toString()} change={stat.totalDealsChange} icon={FileText} />
                  <MetricDisplay title="Settled Value" value={formatCurrency(stat.settledValue)} change={stat.settledValueChange} icon={DollarSign} isCurrency />
                  <MetricDisplay title="Settled Rate" value={`${stat.settledRate.toFixed(1)}%`} change={stat.settledRateChange} icon={TrendingUp} isRate />
                  <MetricDisplay title="Conversion Rate" value={`${stat.conversionRate.toFixed(1)}%`} change={stat.conversionRateChange} icon={Users} isRate />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="bg-white/60 border-violet/20 shadow-sm mt-4">
            <CardContent className="h-48 flex items-center justify-center">
                 <p className="text-center text-violet/80 font-medium">No weekly data available for the selected filters.</p>
            </CardContent>
        </Card>
      )}
      
      <ChartComment chartId="weekly-performance-analysis" chartTitle="Weekly Performance Analysis" />
    </div>
  );
}
