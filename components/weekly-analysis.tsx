"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChartComment } from "@/components/chart-comment"
import { ArrowUp, ArrowDown, TrendingUp, Users, DollarSign, FileText, RotateCcw, Calendar } from "lucide-react"

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

const MetricDisplay = ({ title, value, change, icon: Icon, isCurrency = false, isRate = false, onClick, clickable = false }: { title: string; value: string; change?: number; icon: React.ElementType; isCurrency?: boolean; isRate?: boolean; onClick?: () => void; clickable?: boolean }) => (
  <div 
    className={`flex flex-col p-3 rounded-lg border border-violet/20 bg-white/50 shadow-sm transition-all duration-200 ${
      clickable ? 'cursor-pointer hover:shadow-md hover:bg-white/70 hover:border-violet/40' : ''
    }`}
    onClick={clickable ? onClick : undefined}
  >
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
  const [showAllData, setShowAllData] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("2025");

  // Use allDeals when showAllData is true, otherwise use filteredDeals
  const dataToUse = showAllData ? allDeals : filteredDeals;

  // Calculate settled deals details for a specific week
  const getWeekSettledDetails = useMemo(() => {
    const weeklyGroups = dataToUse.reduce((acc, deal) => {
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

    const result: Record<string, { totalSettled: number; sourceDistribution: Array<{ label: string; value: number; color: string }> }> = {};
    
    Object.entries(weeklyGroups).forEach(([week, dealsInWeek]) => {
      const settledDeals = dealsInWeek.filter(d => d["6. Settled"] && d["6. Settled"].trim() !== "");
      const totalSettled = settledDeals.length;
      
      // Calculate source distribution for settled deals
      const sourceCounts = settledDeals.reduce((acc, deal) => {
        const isRedNote = deal["From Rednote?"] === "Yes";
        const isLifeX = deal["From LifeX?"] === "Yes";
        const source = isRedNote ? "RedNote" : isLifeX ? "LifeX" : "Referral";
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const sourceDistribution = [
        { label: "RedNote", value: sourceCounts["RedNote"] || 0, color: "#EF3C99" }, // CHART_COLORS[1]
        { label: "LifeX", value: sourceCounts["LifeX"] || 0, color: "#751FAE" }, // CHART_COLORS[0]
        { label: "Referral", value: sourceCounts["Referral"] || 0, color: "#3CBDE5" }, // CHART_COLORS[2]
      ].filter(item => item.value > 0);

      result[week] = { totalSettled, sourceDistribution };
    });

    return result;
  }, [dataToUse]);
  const weeklyData = useMemo((): WeeklyStat[] => {
    const stats = calculateWeeklyStats(dataToUse);
    
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

  }, [dataToUse]);

  // Get available years from all deals
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allDeals.forEach(deal => {
      const dateKey = deal.latest_date || deal["6. Settled"] || deal.created_time;
      if (dateKey) {
        try {
          const year = new Date(dateKey).getFullYear().toString();
          years.add(year);
        } catch (e) {
          // Skip invalid dates
        }
      }
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [allDeals]);

  const averages = useMemo((): Omit<WeeklyStat, 'week'> | null => {
    // Filter allDeals by selected year if a specific year is chosen
    const dealsToUse = selectedYear === "all" ? allDeals : allDeals.filter(deal => {
      const dateKey = deal.latest_date || deal["6. Settled"] || deal.created_time;
      if (!dateKey) return false;
      try {
        const dealYear = new Date(dateKey).getFullYear().toString();
        return dealYear === selectedYear;
      } catch (e) {
        return false;
      }
    });

    const allWeeklyStats = calculateWeeklyStats(dealsToUse);
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
  }, [allDeals, selectedYear]);

  return (
    <div className="space-y-6 mt-4">
      <Card className="bg-white/60 border-violet/20 shadow-sm">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-violet">Weekly Performance Analysis</CardTitle>
              <CardDescription className="text-violet/80">
                A weekly breakdown of key performance metrics. {showAllData ? 'Showing all data (filters cleared).' : 'Weekly cards are based on filters.'} The average is based on all data.
              </CardDescription>
            </div>
            <Button
              variant={showAllData ? "default" : "outline"}
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                const currentScrollY = window.scrollY;
                setShowAllData(!showAllData);
                // Restore scroll position after state update
                setTimeout(() => {
                  window.scrollTo(0, currentScrollY);
                }, 0);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              {showAllData ? 'Apply Filters' : 'Clear Filters'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {weeklyData.length > 0 ? (
        <>
          {averages && (
            <Card className="bg-white/80 border-violet/40 shadow-lg ring-2 ring-violet/15">
              <CardHeader className="bg-gradient-to-r from-violet/5 to-hot-pink/5 rounded-t-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-violet font-bold text-xl flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-hot-pink" />
                      Overall Weekly Average ({selectedYear === "all" ? "All Time" : selectedYear})
                    </CardTitle>
                    <CardDescription className="text-violet/80 font-medium">
                      Baseline performance metrics {selectedYear === "all" ? "across all historical data" : `for ${selectedYear}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-32 h-8 text-xs bg-white text-black">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {availableYears.map(year => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/50">
                <MetricDisplay title="Avg. Total Deals" value={averages.totalDeals.toFixed(1)} icon={FileText} />
                <MetricDisplay title="Avg. Conversion Rate" value={`${averages.conversionRate.toFixed(1)}%`} icon={Users} isRate />
                <MetricDisplay title="Avg. Settled Rate" value={`${averages.settledRate.toFixed(1)}%`} icon={TrendingUp} isRate />
                <MetricDisplay title="Avg. Settled Value" value={formatCurrency(averages.settledValue)} icon={DollarSign} isCurrency />
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {weeklyData.map((stat) => {
              const weekDetails = getWeekSettledDetails[stat.week];
              
              return (
                <Card key={stat.week} className="bg-white/60 border-violet/20 shadow-sm hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="text-violet">Week of {stat.week}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <MetricDisplay title="Total Deals" value={stat.totalDeals.toString()} change={stat.totalDealsChange} icon={FileText} />
                    <MetricDisplay title="Conversion Rate" value={`${stat.conversionRate.toFixed(1)}%`} change={stat.conversionRateChange} icon={Users} isRate />
                    <MetricDisplay 
                      title="Settled Rate" 
                      value={`${stat.settledRate.toFixed(1)}%`} 
                      change={stat.settledRateChange} 
                      icon={TrendingUp} 
                      isRate 
                    />
                    <MetricDisplay title="Settled Value" value={formatCurrency(stat.settledValue)} change={stat.settledValueChange} icon={DollarSign} isCurrency />
                    
                    {/* Always show settled deals breakdown when available */}
                    {weekDetails && weekDetails.totalSettled > 0 && (
                      <div className="mt-4 p-3 bg-violet/5 rounded-lg border border-violet/20">
                        <h4 className="text-sm font-semibold text-violet mb-2">
                          Settled Deals Breakdown ({weekDetails.totalSettled} total)
                        </h4>
                        <div className="space-y-2">
                          {weekDetails.sourceDistribution.map((source, index) => {
                            const percentage = weekDetails.totalSettled > 0 ? (source.value / weekDetails.totalSettled) * 100 : 0;
                            return (
                              <div key={index} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: source.color }}
                                  />
                                  <span className="text-violet/80">{source.label}</span>
                                </div>
                                <span className="text-violet/70 font-medium">
                                  {source.value} ({percentage.toFixed(1)}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
