"use client"

import React, { useState, useMemo, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Search,
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  Upload,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  BarChart3,
  LineChart,
  PieChart,
  Home,
  Maximize,
  Minimize,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingAnimation } from "@/components/loading-animation"
import { useFullscreen } from "@/hooks/use-fullscreen"
import * as XLSX from "xlsx"
import Image from "next/image"
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts'

const CHART_COLORS = ["#751FAE", "#EF3C99", "#3CBDE5", "#FF701F", "#FFA31F", "#A0E82A"]

interface MarketingData {
  id: string
  date: string
  cost: number
  platform: string
  impressions?: number
  clicks?: number
  conversions?: number
  ctr?: number
  cpc?: number
  cpm?: number
}

interface MonthlyLeadsData {
  month: string
  聚光: number
  百度: number
  微信: number
  其他: number
}

type SortField = "date" | "cost" | "platform" | "impressions" | "clicks" | "conversions" | "ctr" | "cpc" | "cpm"
type SortDirection = "asc" | "desc" | null

// Sample data based on the CSV files structure
const SAMPLE_MARKETING_DATA: MarketingData[] = [
  { id: "1", date: "2024-11-01", cost: 106.46, platform: "聚光", impressions: 15000, clicks: 250, conversions: 12, ctr: 1.67, cpc: 0.43, cpm: 7.10 },
  { id: "2", date: "2024-11-04", cost: 625.71, platform: "聚光", impressions: 45000, clicks: 890, conversions: 45, ctr: 1.98, cpc: 0.70, cpm: 13.90 },
  { id: "3", date: "2024-11-05", cost: 816.51, platform: "聚光", impressions: 52000, clicks: 1100, conversions: 67, ctr: 2.12, cpc: 0.74, cpm: 15.70 },
  { id: "4", date: "2024-11-06", cost: 1028.40, platform: "聚光", impressions: 68000, clicks: 1450, conversions: 89, ctr: 2.13, cpc: 0.71, cpm: 15.12 },
  { id: "5", date: "2025-01-08", cost: 301.37, platform: "聚光", impressions: 28000, clicks: 580, conversions: 32, ctr: 2.07, cpc: 0.52, cpm: 10.76 },
  { id: "6", date: "2025-01-09", cost: 307.47, platform: "聚光", impressions: 29000, clicks: 595, conversions: 35, ctr: 2.05, cpc: 0.52, cpm: 10.60 },
  { id: "7", date: "2025-02-15", cost: 302.20, platform: "聚光", impressions: 28500, clicks: 575, conversions: 33, ctr: 2.02, cpc: 0.53, cpm: 10.61 },
  { id: "8", date: "2025-03-15", cost: 314.53, platform: "聚光", impressions: 30000, clicks: 610, conversions: 38, ctr: 2.03, cpc: 0.52, cpm: 10.48 },
  { id: "9", date: "2025-04-15", cost: 172.35, platform: "聚光", impressions: 18000, clicks: 320, conversions: 18, ctr: 1.78, cpc: 0.54, cpm: 9.58 },
  { id: "10", date: "2025-05-15", cost: 342.32, platform: "聚光", impressions: 32000, clicks: 640, conversions: 41, ctr: 2.00, cpc: 0.53, cpm: 10.70 },
]

// Sample monthly leads data from marketing_data.xlsm
const SAMPLE_MONTHLY_LEADS_DATA: MonthlyLeadsData[] = [
  { month: "2024-01", 聚光: 120, 百度: 85, 微信: 45, 其他: 25 },
  { month: "2024-02", 聚光: 140, 百度: 92, 微信: 38, 其他: 30 },
  { month: "2024-03", 聚光: 165, 百度: 78, 微信: 52, 其他: 28 },
  { month: "2024-04", 聚光: 135, 百度: 88, 微信: 41, 其他: 35 },
  { month: "2024-05", 聚光: 180, 百度: 95, 微信: 60, 其他: 40 },
  { month: "2024-06", 聚光: 155, 百度: 82, 微信: 48, 其他: 32 },
  { month: "2024-07", 聚光: 175, 百度: 90, 微信: 55, 其他: 38 },
  { month: "2024-08", 聚光: 195, 百度: 105, 微信: 62, 其他: 42 },
  { month: "2024-09", 聚光: 210, 百度: 98, 微信: 58, 其他: 45 },
  { month: "2024-10", 聚光: 185, 百度: 87, 微信: 51, 其他: 37 },
  { month: "2024-11", 聚光: 220, 百度: 110, 微信: 65, 其他: 48 },
  { month: "2024-12", 聚光: 235, 百度: 125, 微信: 70, 其他: 52 },
]

export function MarketingDashboard() {
  const [marketingData, setMarketingData] = useState<MarketingData[]>(SAMPLE_MARKETING_DATA)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [platformFilter, setPlatformFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  
  const { isFullscreen, isSupported, toggleFullscreen } = useFullscreen()

  // Initial loading animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    
    return () => clearTimeout(timer)
  }, [])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setIsLoading(true)
    setError(null)

    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase()
      
      if (fileExtension === "json") {
        const text = await file.text()
        const jsonData = JSON.parse(text)
        let dataArray: MarketingData[]
        
        if (Array.isArray(jsonData)) {
          dataArray = jsonData
        } else if (jsonData.data && Array.isArray(jsonData.data)) {
          dataArray = jsonData.data
        } else {
          throw new Error("Invalid JSON structure.")
        }
        
        setMarketingData(dataArray)
        setError(null)
      } else if (fileExtension === "xlsx" || fileExtension === "xls" || fileExtension === "xlsm") {
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false })
        
        if (jsonData.length < 2) {
          throw new Error("Excel file must have at least a header row and one data row.")
        }
        
        const headers = (jsonData[0] as string[]).map(h => h.trim())
        const dataArray: MarketingData[] = (jsonData.slice(1) as any[][]).map((row, index) => {
          const data: any = {}
          headers.forEach((header, colIndex) => {
            data[header] = row[colIndex] ?? null
          })
          
          return {
            id: String(data.id || `excel_${index + 1}`),
            date: String(data.date || data.时间 || new Date().toISOString().split('T')[0]),
            cost: Number(String(data.cost || data.消费 || data.spend || 0).replace(/[^0-9.-]+/g,"")) || 0,
            platform: String(data.platform || data.平台 || "Unknown"),
            impressions: data.impressions ? Number(String(data.impressions).replace(/[^0-9.-]+/g,"")) || undefined : undefined,
            clicks: data.clicks ? Number(String(data.clicks).replace(/[^0-9.-]+/g,"")) || undefined : undefined,
            conversions: data.conversions ? Number(String(data.conversions).replace(/[^0-9.-]+/g,"")) || undefined : undefined,
            ctr: data.ctr ? Number(String(data.ctr).replace(/[^0-9.-]+/g,"")) || undefined : undefined,
            cpc: data.cpc ? Number(String(data.cpc).replace(/[^0-9.-]+/g,"")) || undefined : undefined,
            cpm: data.cpm ? Number(String(data.cpm).replace(/[^0-9.-]+/g,"")) || undefined : undefined,
          } as MarketingData
        }).filter((data) => data.date && data.cost > 0)
        
        setMarketingData(dataArray)
        setError(null)
      } else {
        throw new Error("Unsupported file format. Please upload a JSON, Excel (.xlsx/.xls/.xlsm) file.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while processing the file.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : sortDirection === "desc" ? null : "asc")
      if (sortDirection === "desc") setSortField(null)
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }, [sortField, sortDirection])

  const filteredData = useMemo(() => {
    return marketingData.filter((data) => {
      const matchesSearch = searchTerm === "" || 
        data.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
        data.date.includes(searchTerm)
      
      const matchesPlatform = platformFilter === "all" || data.platform === platformFilter
      
      const matchesDateRange = (!startDate || data.date >= startDate) && 
        (!endDate || data.date <= endDate)
      
      return matchesSearch && matchesPlatform && matchesDateRange
    })
  }, [marketingData, searchTerm, platformFilter, startDate, endDate])

  const sortedData = useMemo(() => {
    if (!sortField || !sortDirection) return filteredData
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue
      }
      
      return 0
    })
  }, [filteredData, sortField, sortDirection])

  const metrics = useMemo(() => {
    const totalCost = filteredData.reduce((sum, data) => sum + data.cost, 0)
    const totalImpressions = filteredData.reduce((sum, data) => sum + (data.impressions || 0), 0)
    const totalClicks = filteredData.reduce((sum, data) => sum + (data.clicks || 0), 0)
    const totalConversions = filteredData.reduce((sum, data) => sum + (data.conversions || 0), 0)
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const avgCpc = totalClicks > 0 ? totalCost / totalClicks : 0
    const avgCpm = totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0
    
    return {
      totalCost,
      totalImpressions,
      totalClicks,
      totalConversions,
      avgCtr,
      avgCpc,
      avgCpm,
      campaignCount: filteredData.length
    }
  }, [filteredData])

  const chartData = useMemo(() => {
    const dailyData = filteredData.reduce((acc, data) => {
      const date = data.date
      if (!acc[date]) {
        acc[date] = { date, cost: 0, impressions: 0, clicks: 0, conversions: 0 }
      }
      acc[date].cost += data.cost
      acc[date].impressions += data.impressions || 0
      acc[date].clicks += data.clicks || 0
      acc[date].conversions += data.conversions || 0
      return acc
    }, {} as Record<string, any>)
    
    return Object.values(dailyData).sort((a: any, b: any) => a.date.localeCompare(b.date))
  }, [filteredData])

  const platformData = useMemo(() => {
    const platforms = filteredData.reduce((acc, data) => {
      if (!acc[data.platform]) {
        acc[data.platform] = { platform: data.platform, cost: 0, campaigns: 0 }
      }
      acc[data.platform].cost += data.cost
      acc[data.platform].campaigns += 1
      return acc
    }, {} as Record<string, any>)
    
    return Object.values(platforms)
  }, [filteredData])

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />
    if (sortDirection === "asc") return <ArrowUp className="w-4 h-4" />
    if (sortDirection === "desc") return <ArrowDown className="w-4 h-4" />
    return <ArrowUpDown className="w-4 h-4" />
  }

  if (isLoading) {
    return <LoadingAnimation />
  }

  return (
    <div className="bg-gradient-to-br from-slate-100 via-purple-50 to-purple-100 text-gray-800 min-h-screen font-sans relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-violet/15 to-pink-200/40 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-pink-200/40 to-violet/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-purple-100/30 to-transparent rounded-full blur-2xl"></div>
      </div>

      {/* Subtle background logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <Image 
          src="/lifex_logo.png" 
          alt="Background Logo" 
          width={800} 
          height={320} 
          className="opacity-[0.015] select-none transform scale-150 filter blur-[1px]"
        />
      </div>

      <header className="relative z-50 p-6 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur-xl border-b border-violet/20 shadow-lg shadow-violet/10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Image 
              src="/lifex_logo.png" 
              alt="LifeX Logo" 
              width={60} 
              height={24} 
              className="h-6 w-auto filter drop-shadow-sm"
            />
          </div>
          <div className="h-8 w-px bg-gradient-to-b from-violet/30 to-hot-pink/30"></div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet to-hot-pink bg-clip-text text-transparent">
              营销仪表板
            </h1>
            <p className="text-sm text-muted-foreground font-medium">Marketing Performance Dashboard</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/'}
            className="border-violet/20 hover:border-violet/40 hover:bg-violet/5"
          >
            <Home className="w-4 h-4 mr-2" />
            返回主页
          </Button>
          
          {isSupported && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleFullscreen()}
              className="border-violet/20 hover:border-violet/40 hover:bg-violet/5"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </header>

      <main className="relative z-10 p-6 space-y-6">
        {/* Data Upload Section */}
        <Card className="border-violet/20 bg-white/80 backdrop-blur-xl shadow-lg shadow-violet/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Upload className="w-5 h-5 text-violet" />
              数据上传
            </CardTitle>
            <CardDescription>
              上传营销数据文件 (支持 Excel .xlsx/.xls/.xlsm 或 JSON 格式)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="file"
                accept=".xlsx,.xls,.xlsm,.json"
                onChange={handleFileUpload}
                className="border-violet/20 focus:border-violet focus:ring-violet/20"
              />
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-violet/20 bg-white/80 backdrop-blur-xl shadow-lg shadow-violet/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总消费</CardTitle>
              <DollarSign className="h-4 w-4 text-violet" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-violet">¥{metrics.totalCost.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                来自 {metrics.campaignCount} 个营销活动
              </p>
            </CardContent>
          </Card>

          <Card className="border-violet/20 bg-white/80 backdrop-blur-xl shadow-lg shadow-violet/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总展示量</CardTitle>
              <BarChart3 className="h-4 w-4 text-hot-pink" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-hot-pink">{metrics.totalImpressions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                平均 CPM: ¥{metrics.avgCpm.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-violet/20 bg-white/80 backdrop-blur-xl shadow-lg shadow-violet/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总点击量</CardTitle>
              <Target className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{metrics.totalClicks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                平均 CTR: {metrics.avgCtr.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-violet/20 bg-white/80 backdrop-blur-xl shadow-lg shadow-violet/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总转化量</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{metrics.totalConversions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                平均 CPC: ¥{metrics.avgCpc.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts and Data Analysis */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/50 border border-violet/20">
            <TabsTrigger value="overview" className="data-[state=active]:bg-violet data-[state=active]:text-white">
              概览
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-violet data-[state=active]:text-white">
              趋势分析
            </TabsTrigger>
            <TabsTrigger value="platforms" className="data-[state=active]:bg-violet data-[state=active]:text-white">
              平台分析
            </TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-violet data-[state=active]:text-white">
              数据详情
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-violet/20 bg-white/80 backdrop-blur-xl shadow-lg shadow-violet/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5 text-violet" />
                    每日消费趋势
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" stroke="#666" fontSize={12} />
                      <YAxis stroke="#666" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cost" 
                        stroke="#751FAE" 
                        strokeWidth={2}
                        dot={{ fill: '#751FAE', strokeWidth: 2, r: 4 }}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-violet/20 bg-white/80 backdrop-blur-xl shadow-lg shadow-violet/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-hot-pink" />
                    平台消费分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart width={400} height={300}>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px'
                        }}
                      />
                      <Pie 
                        data={platformData} 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={100} 
                        fill="#8884d8"
                        dataKey="cost"
                      >
                        {platformData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card className="border-violet/20 bg-white/80 backdrop-blur-xl shadow-lg shadow-violet/10">
              <CardHeader>
                <CardTitle>多维度趋势分析</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsLineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#666" fontSize={12} />
                    <YAxis yAxisId="left" stroke="#666" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke="#666" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px'
                      }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="cost" stroke="#751FAE" strokeWidth={2} name="消费" />
                    <Line yAxisId="right" type="monotone" dataKey="clicks" stroke="#EF3C99" strokeWidth={2} name="点击" />
                    <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#3CBDE5" strokeWidth={2} name="转化" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-violet/20 bg-white/80 backdrop-blur-xl shadow-lg shadow-violet/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-violet" />
                  每月线索数量统计
                </CardTitle>
                <CardDescription>
                  展示各平台每月获得的线索数量分布
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={SAMPLE_MONTHLY_LEADS_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="聚光" stackId="a" fill="#751FAE" name="聚光" />
                    <Bar dataKey="百度" stackId="a" fill="#EF3C99" name="百度" />
                    <Bar dataKey="微信" stackId="a" fill="#3CBDE5" name="微信" />
                    <Bar dataKey="其他" stackId="a" fill="#FF701F" name="其他" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="platforms" className="space-y-6">
            <Card className="border-violet/20 bg-white/80 backdrop-blur-xl shadow-lg shadow-violet/10">
              <CardHeader>
                <CardTitle>平台效果对比</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={platformData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="platform" stroke="#666" fontSize={12} />
                    <YAxis stroke="#666" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="cost" fill="#751FAE" name="总消费" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-6">
            {/* Filters */}
            <Card className="border-violet/20 bg-white/80 backdrop-blur-xl shadow-lg shadow-violet/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  数据筛选
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">搜索</label>
                    <Input
                      placeholder="搜索平台或日期..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-violet/20 focus:border-violet focus:ring-violet/20"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">平台筛选</label>
                    <Select value={platformFilter} onValueChange={setPlatformFilter}>
                      <SelectTrigger className="border-violet/20 focus:border-violet focus:ring-violet/20">
                        <SelectValue placeholder="选择平台" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">所有平台</SelectItem>
                        {Array.from(new Set(marketingData.map(d => d.platform))).map(platform => (
                          <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">开始日期</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="border-violet/20 focus:border-violet focus:ring-violet/20"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">结束日期</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="border-violet/20 focus:border-violet focus:ring-violet/20"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Table */}
            <Card className="border-violet/20 bg-white/80 backdrop-blur-xl shadow-lg shadow-violet/10">
              <CardHeader>
                <CardTitle>营销数据详情</CardTitle>
                <CardDescription>
                  显示 {sortedData.length} 条记录，共 {marketingData.length} 条
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("date")}
                            className="h-auto p-0 font-semibold hover:bg-transparent"
                          >
                            日期 {getSortIcon("date")}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("platform")}
                            className="h-auto p-0 font-semibold hover:bg-transparent"
                          >
                            平台 {getSortIcon("platform")}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("cost")}
                            className="h-auto p-0 font-semibold hover:bg-transparent"
                          >
                            消费 {getSortIcon("cost")}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("impressions")}
                            className="h-auto p-0 font-semibold hover:bg-transparent"
                          >
                            展示量 {getSortIcon("impressions")}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("clicks")}
                            className="h-auto p-0 font-semibold hover:bg-transparent"
                          >
                            点击量 {getSortIcon("clicks")}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            onClick={() => handleSort("conversions")}
                            className="h-auto p-0 font-semibold hover:bg-transparent"
                          >
                            转化量 {getSortIcon("conversions")}
                          </Button>
                        </TableHead>
                        <TableHead>CTR</TableHead>
                        <TableHead>CPC</TableHead>
                        <TableHead>CPM</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedData.map((data) => (
                        <TableRow key={data.id}>
                          <TableCell className="font-medium">{data.date}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-violet/20 text-violet">
                              {data.platform}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-violet">
                            ¥{data.cost.toLocaleString()}
                          </TableCell>
                          <TableCell>{data.impressions?.toLocaleString() || '-'}</TableCell>
                          <TableCell>{data.clicks?.toLocaleString() || '-'}</TableCell>
                          <TableCell>{data.conversions?.toLocaleString() || '-'}</TableCell>
                          <TableCell>{data.ctr ? `${data.ctr.toFixed(2)}%` : '-'}</TableCell>
                          <TableCell>{data.cpc ? `¥${data.cpc.toFixed(2)}` : '-'}</TableCell>
                          <TableCell>{data.cpm ? `¥${data.cpm.toFixed(2)}` : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}