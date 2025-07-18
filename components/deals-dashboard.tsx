"use client"

import type React from "react"

import { useState, useMemo, useCallback, useEffect } from "react"
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
  Users,
  DollarSign,
  FileText,
  Filter,
  Upload,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ZoomOut,
  Home,
  Maximize,
  Minimize,
  BarChart3,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { WeeklyAnalysis } from "@/components/weekly-analysis"
import { ChartComment } from "@/components/chart-comment"
import { useFullscreen } from "@/hooks/use-fullscreen"
import { LoadingAnimation } from "@/components/loading-animation"
import * as XLSX from "xlsx"
import Image from "next/image"
import Link from "next/link"

const CHART_COLORS = ["#751FAE", "#EF3C99", "#3CBDE5", "#FF701F", "#FFA31F", "#A0E82A"];

interface Deal {
  deal_id: string; deal_name: string; broker_name: string; deal_value: number; created_time?: string | null; "Enquiry Leads": string | null; Opportunity: string | null; "1. Application": string | null; "2. Assessment": string | null; "3. Approval": string | null; "4. Loan Document": string | null; "5. Settlement Queue": string | null; "6. Settled": string | null; "2025 Settlement": string | null; "2024 Settlement": string | null; "Lost date": string | null; "lost reason": string | null; "which process (if lost)": string | null; status: string; "process days": number | null; latest_date: string | null; "new_lead?": string | null; "From Rednote?": string; "From LifeX?": string;
}
type SortField = | "deal_name" | "broker_name" | "deal_value" | "status" | "source" | "process_days" | "latest_date" | "lost_reason" | "lost_process";
type SortDirection = "asc" | "desc" | null;

interface TreemapNode {
  id: string; name: string; value: number; children?: TreemapNode[]; deal?: Deal; x: number; y: number; width: number; height: number; depth: number; color: string;
}

function InteractiveTreemap({ deals, width = 800, height = 500 }: { deals: Deal[]; width?: number; height?: number }) {
  const [hoveredNode, setHoveredNode] = useState<TreemapNode | null>(null);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [groupByBroker, setGroupByBroker] = useState(true);

  const getBrokerColor = (brokerName: string) => {
    return "#751FAE"; // Always return the same base purple for Treemap
  };

  const getColorForValue = (value: number, brokerDeals: Deal[], brokerColor?: string) => {
    const colorToUse = brokerColor || "#751FAE"; // Always use purple for Treemap
    const minValue = Math.min(...brokerDeals.map((d) => d.deal_value));
    const maxValue = Math.max(...brokerDeals.map((d) => d.deal_value));
    const intensity = maxValue > minValue ? (value - minValue) / (maxValue - minValue) : 0.5;
    const opacity = 0.4 + intensity * 0.6;
    const hex = colorToUse.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const hierarchicalData = useMemo(() => {
    const settledDeals = deals.filter((deal) => deal["6. Settled"] && deal["6. Settled"].trim() !== "" && deal.deal_value > 0);
    if (settledDeals.length === 0) return null;
    const totalValue = settledDeals.reduce((sum, deal) => sum + deal.deal_value, 0);

    if (!groupByBroker) {
      const dealNodes: TreemapNode[] = settledDeals.map((deal) => ({ id: deal.deal_id, name: deal.deal_name, value: deal.deal_value, deal, x: 0, y: 0, width: 0, height: 0, depth: 1, color: getColorForValue(deal.deal_value, settledDeals, CHART_COLORS[0]) }));
      return { id: "root", name: "All Settlements", value: totalValue, children: dealNodes, x: 0, y: 0, width, height, depth: 0, color: "#f8fafc" };
    }

    const brokerGroups = settledDeals.reduce((acc, deal) => { if (!acc[deal.broker_name]) acc[deal.broker_name] = []; acc[deal.broker_name].push(deal); return acc }, {} as Record<string, Deal[]>);
    const children: TreemapNode[] = Object.entries(brokerGroups).map(([brokerName, brokerDeals]) => {
      const brokerValue = brokerDeals.reduce((sum, deal) => sum + deal.deal_value, 0);
      const brokerColor = getBrokerColor(brokerName);
      const dealNodes: TreemapNode[] = brokerDeals.map((deal) => ({ id: deal.deal_id, name: deal.deal_name, value: deal.deal_value, deal, x: 0, y: 0, width: 0, height: 0, depth: 2, color: getColorForValue(deal.deal_value, brokerDeals, brokerColor) }));
      return { id: brokerName, name: brokerName, value: brokerValue, children: dealNodes, x: 0, y: 0, width: 0, height: 0, depth: 1, color: getBrokerColor(brokerName) };
    });
    return { id: "root", name: "All Settlements", value: totalValue, children, x: 0, y: 0, width, height, depth: 0, color: "#f8fafc" };
  }, [deals, width, height, groupByBroker]);

  const calculateLayout = useCallback((node: TreemapNode, x: number, y: number, w: number, h: number) => {
    node.x = x; node.y = y; node.width = w; node.height = h;
    if (!node.children || node.children.length === 0) return;
    const sortedChildren = [...node.children].sort((a, b) => b.value - a.value);
    const totalValue = sortedChildren.reduce((sum, child) => sum + child.value, 0);
    if (totalValue === 0) return;
    let currentX = x, currentY = y, remainingWidth = w, remainingHeight = h;
    for (let i = 0; i < sortedChildren.length; i++) {
      const child = sortedChildren[i];
      const ratio = child.value / totalValue;
      const area = ratio * w * h;
      let childWidth: number, childHeight: number;
      if (remainingWidth >= remainingHeight) { childWidth = area / remainingHeight; childHeight = remainingHeight; if (childWidth > remainingWidth) { childWidth = remainingWidth; childHeight = area / childWidth } }
      else { childHeight = area / remainingWidth; childWidth = remainingWidth; if (childHeight > remainingHeight) { childHeight = remainingHeight; childWidth = area / childHeight } }
      childWidth = Math.max(childWidth, 20); childHeight = Math.max(childHeight, 20);
      calculateLayout(child, currentX, currentY, childWidth, childHeight);
      if (remainingWidth >= remainingHeight) { currentX += childWidth; remainingWidth -= childWidth } else { currentY += childHeight; remainingHeight -= childHeight }
    }
  }, []);

  const currentView = useMemo(() => {
    if (!hierarchicalData) return null;
    let current = hierarchicalData;
    for (const pathSegment of selectedPath) { const child = current.children?.find((c) => c.id === pathSegment); if (child) current = child; else break; }
    calculateLayout(current, 0, 0, width, height);
    return current;
  }, [hierarchicalData, selectedPath, calculateLayout, width, height]);

  const renderTextWithOrientation = (node: TreemapNode) => {
    const centerX = node.x + node.width / 2;
    const centerY = node.y + node.height / 2;
    const minDimension = Math.min(node.width, node.height);
    const maxDimension = Math.max(node.width, node.height);
    
    // 决定是否需要竖直显示文字
    const useVerticalText = node.height > node.width * 1.5 && node.height > 60;
    
    // 计算合适的字体大小
    const baseFontSize = Math.min(12, Math.max(8, minDimension / 8));
    const fontSize = Math.min(baseFontSize, useVerticalText ? node.width / 4 : node.height / 4);
    
    // 计算可以显示的字符数和文本截断逻辑
    let displayName = node.name;
    let maxChars = 0;
    
    // 检查是否有足够空间显示价值
    const hasSpaceForValue = useVerticalText ? 
      (node.height > 80 && node.width > 40) : 
      (node.width > 120 && node.height > 60);

    if (useVerticalText) {
      // 竖直显示：主要由高度决定能显示多少字符
      const charHeight = fontSize * 1.1; // 字符高度，稍微减少行间距
      // 如果要显示价值，为价值预留更少空间，因为现在是并排显示
      const reservedSpace = hasSpaceForValue ? 30 : 10;
      const availableHeight = node.height - reservedSpace;
      const maxCharsFromHeight = Math.floor(availableHeight / charHeight);
      
      // 竖直显示时，宽度要考虑两个文本并排的情况
      const availableWidth = hasSpaceForValue ? (node.width - 25) / 2 : node.width - 8; // 如果并排显示，宽度要分给两个文本
      const charWidth = fontSize * 0.55; // 稍微减少字符宽度估算，更宽松
      const maxCharsFromWidth = Math.floor(availableWidth / charWidth);
      
      // 对于竖直显示，高度通常是主要限制因素，给更多权重
      maxChars = Math.min(maxCharsFromHeight, Math.max(maxCharsFromWidth, 8)); // 至少允许8个字符
      
      // 如果空间足够显示全名，就显示全名
      if (node.name.length <= maxChars) {
        displayName = node.name;
      } else {
        // 确保至少显示6个字符再加省略号
        const minChars = Math.max(6, Math.min(maxChars - 3, node.name.length));
        displayName = node.name.substring(0, minChars) + "...";
      }
    } else {
      // 水平显示：主要受宽度限制
      const availableSpace = node.width - 16;
      const charWidth = fontSize * 0.6;
      maxChars = Math.floor(availableSpace / charWidth);
      
      if (node.name.length <= maxChars) {
        displayName = node.name;
      } else {
        displayName = node.name.substring(0, Math.max(1, maxChars - 3)) + "...";
      }
    }
    
    const textElements = [];
    
    // 只在有足够空间时显示文字
    if (minDimension > 30 && fontSize > 6) {
      if (useVerticalText) {
        // 竖直显示时，文字旋转90度，所以要在X轴方向分开放置
        const nameX = hasSpaceForValue ? centerX - 10 : centerX; // 名称位置
        const valueX = centerX + 10; // 价值位置（在名称右侧）
        
        // Deal名称
        textElements.push(
          <text 
            key={`${node.id}-name`}
            x={nameX} 
            y={centerY} 
            textAnchor="middle" 
            dominantBaseline="middle" 
            className="fill-white text-xs font-medium pointer-events-none" 
            style={{ fontSize: `${fontSize}px` }}
            transform={`rotate(-90, ${nameX}, ${centerY})`}
          >
            {displayName}
          </text>
        );
        
        // 价值 - 在名称右侧（X轴方向）
        if (hasSpaceForValue) {
          const valueFontSize = Math.min(fontSize - 1, 10);
          textElements.push(
            <text 
              key={`${node.id}-value`}
              x={valueX} 
              y={centerY} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              className="fill-white text-xs pointer-events-none" 
              style={{ fontSize: `${valueFontSize}px` }}
              transform={`rotate(-90, ${valueX}, ${centerY})`}
            >
              {formatCurrency(node.value)}
            </text>
          );
        }
      } else {
        // 水平显示
        textElements.push(
          <text 
            key={`${node.id}-name`}
            x={centerX} 
            y={hasSpaceForValue ? centerY - 8 : centerY} 
            textAnchor="middle" 
            dominantBaseline="middle" 
            className="fill-white text-xs font-medium pointer-events-none" 
            style={{ fontSize: `${fontSize}px` }}
          >
            {displayName}
          </text>
        );
        
        // 价值
        if (hasSpaceForValue) {
          const valueFontSize = Math.min(fontSize - 1, 10);
          textElements.push(
            <text 
              key={`${node.id}-value`}
              x={centerX} 
              y={centerY + 15} 
              textAnchor="middle" 
              dominantBaseline="middle" 
              className="fill-white text-xs pointer-events-none" 
              style={{ fontSize: `${valueFontSize}px` }}
            >
              {formatCurrency(node.value)}
            </text>
          );
        }
      }
    }
    
    return textElements;
  };

  const renderNodes = (node: TreemapNode): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    if (node.children && node.children.length > 0) { 
      node.children.forEach((child) => nodes.push(...renderNodes(child))) 
    } else {
      nodes.push(
        <g key={node.id}>
          <rect 
            x={node.x} 
            y={node.y} 
            width={node.width} 
            height={node.height} 
            fill={node.color} 
            stroke="white" 
            strokeWidth="1" 
            className="cursor-pointer transition-all duration-200 hover:stroke-2 hover:stroke-indigo-400"
            onMouseEnter={(e) => handleMouseEnter(node, e)} 
            onMouseMove={handleMouseMove} 
            onMouseLeave={handleMouseLeave} 
            onClick={() => handleNodeClick(node)} 
          />
          {renderTextWithOrientation(node)}
        </g>
      );
    }
    
    // 经纪人边界框
    if (node.depth > 0 && node.children && node.children.length > 0) {
      nodes.push(
        <g key={`${node.id}-boundary`}>
          <rect 
            x={node.x} 
            y={node.y} 
            width={node.width} 
            height={node.height} 
            fill="none" 
            stroke="#3B0C5A" 
            strokeWidth="2" 
            className="pointer-events-none" 
          />
          {node.width > 80 && node.height > 30 && (
            <text 
              x={node.x + 8} 
              y={node.y + 18} 
              className="fill-deep-purple-text text-sm font-semibold pointer-events-none"
              style={{ fontSize: Math.min(14, Math.max(10, node.width / 20)) }}
            >
              {node.name.length > Math.floor(node.width / 12) ? 
                node.name.substring(0, Math.floor(node.width / 12)) + "..." : 
                node.name
              }
            </text>
          )}
        </g>
      );
    }
    return nodes;
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  const handleMouseEnter = (node: TreemapNode, event: React.MouseEvent) => { setHoveredNode(node); setMousePosition({ x: event.clientX, y: event.clientY }) };
  const handleMouseMove = (event: React.MouseEvent) => setMousePosition({ x: event.clientX, y: event.clientY });
  const handleMouseLeave = () => setHoveredNode(null);
  const handleNodeClick = (node: TreemapNode) => { if (node.children && node.children.length > 0) setSelectedPath([...selectedPath, node.id]) };
  const handleZoomOut = () => { if (selectedPath.length > 0) setSelectedPath(selectedPath.slice(0, -1)) };
  const handleZoomToRoot = () => setSelectedPath([]);

  if (!hierarchicalData) return <div className="flex items-center justify-center h-64 text-deep-purple-text/70">No settled deals found</div>;

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={handleZoomToRoot} disabled={selectedPath.length === 0}><Home className="h-4 w-4 mr-1" />All</Button>
        {selectedPath.length > 0 && <Button variant="outline" size="sm" onClick={handleZoomOut}><ZoomOut className="h-4 w-4 mr-1" />Back</Button>}
        <Button variant={groupByBroker ? "default" : "outline"} size="sm" onClick={() => { setGroupByBroker(!groupByBroker); setSelectedPath([]) }}>{groupByBroker ? "Group by Broker" : "All Deals"}</Button>
        <div className="text-sm text-deep-purple-text/80">{selectedPath.length === 0 ? (groupByBroker ? "All Brokers" : "All Deals") : selectedPath.join(" > ")}</div>
      </div>
      <div className="border rounded-lg overflow-hidden bg-gray-50 h-[60vh]">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="bg-white">
          {currentView && renderNodes(currentView)}
        </svg>
      </div>
      {hoveredNode && (
        <div className="fixed z-50 bg-deep-purple-text text-white p-3 rounded-lg shadow-lg pointer-events-none max-w-xs" style={{ left: mousePosition.x + 10, top: mousePosition.y - 10, transform: "translateY(-100%)" }}>
          <div className="space-y-1">
            <div className="font-semibold">{hoveredNode.name}</div>
            <div className="text-sm">Value: {formatCurrency(hoveredNode.value)}</div>
            {hoveredNode.deal && (<>
              <div className="text-sm">Broker: {hoveredNode.deal.broker_name}</div>
              <div className="text-sm">Settled: {hoveredNode.deal["6. Settled"] ? new Date(hoveredNode.deal["6. Settled"]).toLocaleDateString() : "N/A"}</div>
              {hoveredNode.deal["process days"] && <div className="text-sm">Process Days: {hoveredNode.deal["process days"]}</div>}
            </>)}
            {hoveredNode.children && <div className="text-sm text-gray-300">Click to zoom in ({hoveredNode.children.length} deals)</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function PieChart({ data = [], size = 200, legendTextColor = "text-deep-purple-text", onLegendClick, selectedLabel }: { data?: Array<{ label: string; value: number; color: string }>; size?: number; legendTextColor?: string; onLegendClick?: (label: string) => void; selectedLabel?: string | null }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <div className="flex items-center justify-center" style={{ width: size, height: size }}><span className="text-deep-purple-text/70">No data</span></div>;
  let cumulativePercentage = 0;
  const radius = size / 2 - 10, centerX = size / 2, centerY = size / 2, textRadius = radius * 0.7;
  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} className="transform -rotate-90">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          const startAngle = (cumulativePercentage / 100) * 360, endAngle = ((cumulativePercentage + percentage) / 100) * 360, midAngle = (startAngle + endAngle) / 2;
          const startAngleRad = (startAngle * Math.PI) / 180, endAngleRad = (endAngle * Math.PI) / 180, midAngleRad = (midAngle * Math.PI) / 180;
          const x1 = centerX + radius * Math.cos(startAngleRad), y1 = centerY + radius * Math.sin(startAngleRad);
          const x2 = centerX + radius * Math.cos(endAngleRad), y2 = centerY + radius * Math.sin(endAngleRad);
          const textX = centerX + textRadius * Math.cos(midAngleRad), textY = centerY + textRadius * Math.sin(midAngleRad);
          const largeArcFlag = percentage > 50 ? 1 : 0;
          const pathData = [`M ${centerX} ${centerY}`, `L ${x1} ${y1}`, `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, "Z"].join(" ");
          cumulativePercentage += percentage;
          return (
            <g key={index}>
              <path d={pathData} fill={item.color} stroke="white" strokeWidth="2" />
              {percentage > 5 && <text x={textX} y={textY} textAnchor="middle" dominantBaseline="middle" className="fill-white text-xs font-medium transform rotate-90" style={{ fontSize: "10px" }}>{item.value}</text>}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-col gap-1 self-start">
        {onLegendClick && <Button variant="ghost" size="sm" onClick={() => onLegendClick("")} disabled={!selectedLabel} className="text-xs justify-start pl-1 h-8 mb-1 text-red-500 hover:text-red-700 disabled:text-gray-400">Clear Selection</Button>}
        {data.map((item, index) => (
          <div key={index} onClick={() => onLegendClick && onLegendClick(item.label)} className={`flex items-center gap-2 text-sm cursor-pointer p-1 rounded-md transition-colors duration-150 ${selectedLabel === item.label ? 'bg-white/20' : 'bg-transparent hover:bg-white/10'}`}>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className={legendTextColor}>{item.label}: {item.value} ({((item.value / total) * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data = [], onBarClick, selectedLabel }: { data?: Array<{ label: string; value: number; color: string }>; onBarClick?: (label: string) => void; selectedLabel?: string | null }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <div className="flex items-center justify-center h-32"><span className="text-deep-purple-text/70">No data</span></div>;
  
  const maxValue = Math.max(...data.map(item => item.value));
  
  return (
    <div className="space-y-3">
      {onBarClick && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onBarClick("")} 
          disabled={!selectedLabel} 
          className="text-xs justify-start pl-1 h-8 mb-1 text-red-500 hover:text-red-700 disabled:text-gray-400"
        >
          Clear Selection
        </Button>
      )}
      {data.map((item, index) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
        const isSelected = selectedLabel === item.label;
        
        return (
          <div 
            key={index} 
            onClick={() => onBarClick && onBarClick(item.label)}
            className={`space-y-1 ${onBarClick ? 'cursor-pointer' : ''} p-2 rounded-md transition-colors duration-150 ${
              isSelected ? 'bg-violet/10' : 'hover:bg-violet/5'
            }`}
          >
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-deep-purple-text font-medium">{item.label}</span>
              </div>
              <span className="text-deep-purple-text/80">
                {item.value} ({percentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-300" 
                style={{ 
                  width: `${barWidth}%`, 
                  backgroundColor: item.color 
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DoubleRingPieChart({ outerData = [], innerData = [], size = 300 }: { outerData?: Array<{ label: string; value: number; color: string }>; innerData?: Array<{ label: string; value: number; color: string }>; size?: number }) {
  const outerTotal = outerData.reduce((sum, item) => sum + item.value, 0);
  const innerTotal = innerData.reduce((sum, item) => sum + item.value, 0);
  if (outerTotal === 0 && innerTotal === 0) return <div className="flex items-center justify-center" style={{ width: size, height: size }}><span className="text-deep-purple-text/70">No data</span></div>;
  const outerRadius = size / 2 - 10, innerRadius = size / 2 - 60, centerX = size / 2, centerY = size / 2;
  const outerTextRadius = outerRadius * 0.75, innerTextRadius = innerRadius * 0.6;

  const createRingPath = (data: Array<{ label: string; value: number; color: string }>, total: number, radius: number, textRadius: number) => {
    let cumulativePercentage = 0;
    return data.map((item) => {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const startAngle = (cumulativePercentage / 100) * 360, endAngle = ((cumulativePercentage + percentage) / 100) * 360, midAngle = (startAngle + endAngle) / 2;
      const startAngleRad = (startAngle * Math.PI) / 180, endAngleRad = (endAngle * Math.PI) / 180, midAngleRad = (midAngle * Math.PI) / 180;
      const x1 = centerX + radius * Math.cos(startAngleRad), y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad), y2 = centerY + radius * Math.sin(endAngleRad);
      const textX = centerX + textRadius * Math.cos(midAngleRad), textY = centerY + textRadius * Math.sin(midAngleRad);
      const largeArcFlag = percentage > 50 ? 1 : 0;
      const pathData = [`M ${centerX} ${centerY}`, `L ${x1} ${y1}`, `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`, "Z"].join(" ");
      cumulativePercentage += percentage;
      return { pathData, color: item.color, label: item.label, value: item.value, percentage, textX, textY };
    });
  };

  const outerPaths = outerTotal > 0 ? createRingPath(outerData, outerTotal, outerRadius, outerTextRadius) : [];
  const innerPaths = innerTotal > 0 ? createRingPath(innerData, innerTotal, innerRadius, innerTextRadius) : [];

  return (
    <div className="flex flex-col items-center gap-4 text-deep-purple-text/70">
      <svg width={size} height={size} className="transform -rotate-90">
        {outerPaths.map((path, index) => (
          <g key={`outer-${index}`}>
            <path d={path.pathData} fill={path.color} stroke="white" strokeWidth="2" />
            {path.percentage > 8 && <text x={path.textX} y={path.textY} textAnchor="middle" dominantBaseline="middle" className="fill-white text-xs font-bold transform rotate-90" style={{ fontSize: "11px" }}>{path.value}</text>}
          </g>
        ))}
        {innerPaths.map((path, index) => (
          <g key={`inner-${index}`}>
            <path d={path.pathData} fill={path.color} stroke="white" strokeWidth="2" />
            {path.percentage > 10 && <text x={path.textX} y={path.textY} textAnchor="middle" dominantBaseline="middle" className="fill-white text-xs font-medium transform rotate-90" style={{ fontSize: "9px" }}>{path.value.toFixed(0)}</text>}
          </g>
        ))}
        <circle cx={centerX} cy={centerY} r={innerRadius - 20} fill="white" />
      </svg>
      <div className="grid grid-cols-2 gap-6 text-sm">
        <div>
          <h4 className="font-semibold mb-2 text-deep-purple-text">Outer Ring - Total Deals</h4>
          {outerData.map((item, index) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.label}: {item.value} ({outerTotal > 0 ? ((item.value / outerTotal) * 100).toFixed(1) : "0"}%)</span>
            </div>
          ))}
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-deep-purple-text">Inner Ring - Weekly Avg</h4>
          {innerData.map((item, index) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span>{item.label}: {item.value.toFixed(1)} ({innerTotal > 0 ? ((item.value / innerTotal) * 100).toFixed(1) : "0"}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SankeyDiagram({ deals }: { deals: Deal[] }) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showLostDeals, setShowLostDeals] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedLostReason, setSelectedLostReason] = useState<string | null>(null);

  const formatCurrency = (value: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  const handleSort = (field: string) => { if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortField(field); setSortDirection("asc") } };
  const getSortIcon = (field: string) => { if (sortField !== field) return <ArrowUpDown className="h-3 w-3" />; return sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> };

  const sankeyData = useMemo(() => {
    const stages = ["Enquiry Leads", "Opportunity", "1. Application", "2. Assessment", "3. Approval", "4. Loan Document", "5. Settlement Queue", "6. Settled"];
    const nodes: Array<{ id: string; name: string; type: "stage" | "lost" }> = [];
    const links: Array<{ source: string; target: string; value: number }> = [];
    stages.forEach((stage) => nodes.push({ id: stage, name: stage, type: "stage" }));
    nodes.push({ id: "Lost", name: "Lost", type: "lost" });
    const stageProgression = new Map<string, number>(), lostFromStage = new Map<string, number>(), lostReasonCounts = new Map<string, number>();

    deals.forEach((deal) => {
      let currentStage = ""; const reachedStages: string[] = [];
      stages.forEach((stage) => { const stageKey = stage as keyof Deal; if (deal[stageKey] && deal[stageKey]!.toString().trim() !== "") { reachedStages.push(stage); currentStage = stage } });
      if (deal.status === "Lost") {
        const lostFromProcess = deal["which process (if lost)"]; let lostStage = "Enquiry Leads";
        if (lostFromProcess) { const processStageMap: Record<string, string> = { "Enquiry Leads": "Enquiry Leads", Opportunity: "Opportunity", Application: "1. Application", Assessment: "2. Assessment", Approval: "3. Approval", "Loan Document": "4. Loan Document", "Settlement Queue": "5. Settlement Queue", Settled: "6. Settled" }; lostStage = processStageMap[lostFromProcess] || lostFromProcess }
        else if (currentStage) lostStage = currentStage;
        const lostKey = `${lostStage}->Lost`; lostFromStage.set(lostKey, (lostFromStage.get(lostKey) || 0) + 1);
        if (deal["lost reason"]) lostReasonCounts.set(deal["lost reason"], (lostReasonCounts.get(deal["lost reason"]) || 0) + 1);
      } else {
        for (let i = 0; i < reachedStages.length - 1; i++) { const from = reachedStages[i], to = reachedStages[i + 1], key = `${from}->${to}`; stageProgression.set(key, (stageProgression.get(key) || 0) + 1) }
      }
    });
    stageProgression.forEach((value, key) => { const [source, target] = key.split("->"); links.push({ source, target, value }) });
    lostFromStage.forEach((value, key) => { const [source, target] = key.split("->"); links.push({ source, target, value }) });
    return { nodes, links, lostReasonCounts };
  }, [deals]);

  const lostReasonsData = useMemo(() => {
    const data = Array.from(sankeyData.lostReasonCounts.entries()).map(([reason, count], index) => ({
      label: reason,
      value: count,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }));
    // Sort by value in descending order to affect the legend
    data.sort((a, b) => b.value - a.value);
    return data;
  }, [sankeyData.lostReasonCounts]);

  const renderSankey = () => {
    const width = 1200, height = 500, nodeWidth = 25; // Reduced height from 700 to 500
    const { nodes, links } = sankeyData;
    const stageNodes = nodes.filter((n) => n.type === "stage"), lostNode = nodes.find((n) => n.id === "Lost");
    const nodePositions = new Map<string, { x: number; y: number; height: number }>();
    const nodeValues = new Map<string, number>();
    links.forEach((link) => { nodeValues.set(link.source, (nodeValues.get(link.source) || 0) + link.value); nodeValues.set(link.target, (nodeValues.get(link.target) || 0) + link.value) });
    const stageWidth = (width - 300) / (stageNodes.length - 1), maxStageValue = Math.max(...stageNodes.map((n) => nodeValues.get(n.id) || 0));
    
    // Adjusted y-positioning to reduce top margin
    stageNodes.forEach((node, index) => { 
        const x = 50 + index * stageWidth;
        const nodeValue = nodeValues.get(node.id) || 0;
        const nodeHeight = Math.max(40, Math.min(120, (nodeValue / maxStageValue) * 100));
        const y = height / 2 - nodeHeight / 2 - 50; // Centered vertically with less top space
        nodePositions.set(node.id, { x, y, height: nodeHeight });
    });

    if (lostNode) {
        const lostValue = nodeValues.get(lostNode.id) || 0;
        const nodeHeight = Math.max(50, Math.min(100, (lostValue / maxStageValue) * 80));
        const settledPos = nodePositions.get("6. Settled");
        const lostX = settledPos ? settledPos.x : width - 300;
        const lostY = height - nodeHeight - 50; // Positioned closer to the bottom
        nodePositions.set(lostNode.id, { x: lostX, y: lostY, height: nodeHeight });
    }

    const createPath = (x1: number, y1: number, x2: number, y2: number, offset = 0) => { const midX = (x1 + x2) / 2, controlX1 = x1 + (midX - x1) * 0.8, controlX2 = x2 - (x2 - midX) * 0.8; return `M ${x1} ${y1 + offset} C ${controlX1} ${y1 + offset} ${controlX2} ${y2 + offset} ${x2} ${y2 + offset}` };
    const linksBySource = new Map<string, Array<{ target: string; value: number; index: number }>>();
    links.forEach((link, index) => { if (!linksBySource.has(link.source)) linksBySource.set(link.source, []); linksBySource.get(link.source)!.push({ target: link.target, value: link.value, index }) });

    return (
      <div className="w-full overflow-x-auto relative h-[55vh]">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="border rounded-lg bg-white/70">
          <defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e0e0e0" strokeWidth="1" /></pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {Array.from(linksBySource.entries()).map(([source, targets]) => {
            const sourcePos = nodePositions.get(source); if (!sourcePos) return null;
            const sortedTargets = targets.sort((a, b) => (nodePositions.get(a.target)?.y || 0) - (nodePositions.get(b.target)?.y || 0));
            return sortedTargets.map((target, targetIndex) => {
              const targetPos = nodePositions.get(target.target); if (!targetPos) return null;
              const x1 = sourcePos.x + nodeWidth, y1 = sourcePos.y + sourcePos.height / 2, x2 = targetPos.x, y2 = targetPos.y + targetPos.height / 2;
              const totalTargets = sortedTargets.length, offsetRange = Math.min(sourcePos.height, 40), offset = totalTargets > 1 ? (targetIndex - (totalTargets - 1) / 2) * (offsetRange / Math.max(1, totalTargets - 1)) : 0;
              const strokeWidth = Math.max(1, Math.min(15, target.value * 1.5)), isLostLink = target.target.includes("Lost"), color = isLostLink ? "#9CA3AF" : "#751FAE", opacity = isLostLink ? 0.7 : 0.6;
              return (
                <g key={`${source}-${target.target}-${target.index}`}>
                  <path d={createPath(x1, y1, x2, y2, offset)} stroke={color} strokeWidth={strokeWidth} fill="none" opacity={opacity} />
                  {target.value > 0 && strokeWidth > 3 && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + offset - 8} textAnchor="middle" className="text-xs font-medium fill-deep-purple-text" style={{ textShadow: "1px 1px 2px white" }}>{target.value}</text>}
                </g>
              );
            });
          })}
          {nodes.map((node) => {
            const pos = nodePositions.get(node.id); if (!pos) return null;
            const isStage = node.type === "stage", isLost = node.type === "lost"; let color = "#751FAE"; if (isLost) color = "#9CA3AF";
            const nodeValue = nodeValues.get(node.id) || 0;
            return (
              <g key={node.id}>
                <rect x={pos.x} y={pos.y} width={nodeWidth} height={pos.height} fill={color} rx={3} stroke="white" strokeWidth={1} className={isLost ? "cursor-pointer" : ""}
                  onMouseEnter={isLost ? (e) => { setHoveredNode(node.id); setMousePosition({ x: e.clientX, y: e.clientY }) } : undefined}
                  onMouseMove={isLost ? (e) => setMousePosition({ x: e.clientX, y: e.clientY }) : undefined}
                  onMouseLeave={isLost ? () => setHoveredNode(null) : undefined}
                  onClick={isLost ? () => setShowLostDeals(true) : undefined} />
                <text x={isStage ? pos.x + nodeWidth / 2 : pos.x - 5} y={isStage ? pos.y - 10 : pos.y + pos.height / 2} textAnchor={isStage ? "middle" : "end"} dominantBaseline={isStage ? "bottom" : "middle"} className="text-xs font-medium fill-deep-purple-text" style={{ maxWidth: "120px" }}>{node.name.length > 15 ? node.name.substring(0, 15) + "..." : node.name}</text>
                {nodeValue > 0 && <text x={isStage ? pos.x + nodeWidth / 2 : pos.x - 5} y={isStage ? pos.y + pos.height + 15 : pos.y + pos.height / 2 + 12} textAnchor={isStage ? "middle" : "end"} className="text-xs font-bold fill-deep-purple-text/80">({nodeValue})</text>}
              </g>
            );
          })}
          <g transform="translate(50, 50)">
            <rect x="0" y="0" width="200" height="65" fill="white" stroke="#ddd" rx="5" opacity="0.9" />
            <text x="10" y="20" className="text-sm font-semibold fill-deep-purple-text">Legend</text>
            <rect x="10" y="30" width="15" height="8" fill="#751FAE" /><text x="30" y="38" className="text-xs fill-deep-purple-text">Normal Flow</text>
            <rect x="10" y="45" width="15" height="8" fill="#9CA3AF" /><text x="30" y="53" className="text-xs fill-deep-purple-text">Lost Flow (hover for reasons, click for details)</text>
          </g>
        </svg>
        {showLostDeals && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-[95vw] h-[90vh] mx-4 overflow-hidden resize text-deep-purple-text" style={{ minWidth: "800px", minHeight: "600px" }}>
              <div className="flex items-center justify-between p-6 border-b"><h2 className="text-xl font-semibold">Lost Deals Details</h2><button onClick={() => { setShowLostDeals(false); setSelectedLostReason(null); }} className="text-gray-400 hover:text-gray-600 text-2xl">×</button></div>
              <div className="p-6 overflow-y-auto h-[calc(90vh-120px)]">
                <div className="grid gap-6 lg:grid-cols-4">
                  <div className="lg:col-span-1">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Lost Reasons Distribution</CardTitle>
                        <CardDescription>Click a reason to filter the table</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {lostReasonsData.length > 0 ? (
                          <div className="flex justify-center">
                            <PieChart 
                              data={lostReasonsData} 
                              size={250} 
                              legendTextColor="text-white" 
                              onLegendClick={(label) => setSelectedLostReason(label || null)} 
                              selectedLabel={selectedLostReason} 
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-64 text-deep-purple-text/70">
                            No lost reason data available
                          </div>
                        )}
                        <ChartComment chartId="lost-reasons-distribution" chartTitle="Lost Reasons Distribution" />
                      </CardContent>
                    </Card>
                  </div>
                  <div className="lg:col-span-3">
                    <div className="mb-4 text-sm text-deep-purple-text/80">Total Lost Deals: {deals.filter((d) => d.status === "Lost").length}</div>
                    <div className="rounded-md border overflow-x-auto">
                      <Table><TableHeader><TableRow>
                        <TableHead className="min-w-[150px]"><Button variant="ghost" className="h-auto p-0 font-semibold text-xs" onClick={() => handleSort("deal_name")}>Deal Name{getSortIcon("deal_name")}</Button></TableHead>
                        <TableHead className="min-w-[120px]"><Button variant="ghost" className="h-auto p-0 font-semibold text-xs" onClick={() => handleSort("broker_name")}>Broker{getSortIcon("broker_name")}</Button></TableHead>
                        <TableHead className="min-w-[100px]"><Button variant="ghost" className="h-auto p-0 font-semibold text-xs" onClick={() => handleSort("deal_value")}>Value{getSortIcon("deal_value")}</Button></TableHead>
                        <TableHead className="min-w-[150px]"><Button variant="ghost" className="h-auto p-0 font-semibold text-xs" onClick={() => handleSort("lost_reason")}>Lost Reason{getSortIcon("lost_reason")}</Button></TableHead>
                        <TableHead className="min-w-[120px]"><Button variant="ghost" className="h-auto p-0 font-semibold text-xs" onClick={() => handleSort("lost_process")}>Lost Process{getSortIcon("lost_process")}</Button></TableHead>
                        <TableHead className="min-w-[100px]"><Button variant="ghost" className="h-auto p-0 font-semibold text-xs" onClick={() => handleSort("lost_date")}>Lost Date{getSortIcon("lost_date")}</Button></TableHead>
                        <TableHead className="min-w-[100px]"><Button variant="ghost" className="h-auto p-0 font-semibold text-xs" onClick={() => handleSort("process_days")}>Process Days{getSortIcon("process_days")}</Button></TableHead>
                      </TableRow></TableHeader>
                        <TableBody>
                          {deals.filter((d) => d.status === "Lost" && (!selectedLostReason || d["lost reason"] === selectedLostReason)).sort((a, b) => {
                            if (!sortField) return 0; let aValue: any, bValue: any;
                            switch (sortField) {
                              case "deal_name": aValue = a.deal_name || ""; bValue = b.deal_name || ""; break;
                              case "broker_name": aValue = a.broker_name || ""; bValue = b.broker_name || ""; break;
                              case "deal_value": aValue = a.deal_value || 0; bValue = b.deal_value || 0; break;
                              case "lost_reason": aValue = a["lost reason"] || ""; bValue = b["lost reason"] || ""; break;
                              case "lost_process": aValue = a["which process (if lost)"] || ""; bValue = b["which process (if lost)"] || ""; break;
                              case "lost_date": aValue = a["Lost date"] ? new Date(a["Lost date"]).getTime() : 0; bValue = b["Lost date"] ? new Date(b["Lost date"]).getTime() : 0; break;
                              case "process_days": aValue = a["process days"] || 0; bValue = b["process days"] || 0; break;
                              default: return 0;
                            }
                            if (typeof aValue === "number" && typeof bValue === "number") return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
                            const comparison = String(aValue).localeCompare(String(bValue)); return sortDirection === "asc" ? comparison : -comparison;
                          }).map((deal) => (
                            <TableRow key={deal.deal_id}><TableCell className="font-medium text-sm text-deep-purple-text">{deal.deal_name}</TableCell>
                              <TableCell className="text-sm text-deep-purple-text/90">{deal.broker_name}</TableCell>
                              <TableCell className="text-sm text-deep-purple-text/90">{deal.deal_value ? formatCurrency(deal.deal_value) : "-"}</TableCell>
                              <TableCell className="text-sm text-deep-purple-text/90">{deal["lost reason"] || "-"}</TableCell>
                              <TableCell className="text-sm text-deep-purple-text/90">{deal["which process (if lost)"] || "-"}</TableCell>
                              <TableCell className="text-sm text-deep-purple-text/90">{deal["Lost date"] ? new Date(deal["Lost date"]).toLocaleDateString() : "-"}</TableCell>
                              <TableCell className="text-sm text-deep-purple-text/90">{deal["process days"] || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (sankeyData.nodes.length === 0) return <div className="flex items-center justify-center h-64 text-deep-purple-text/70">No data available for Sankey diagram</div>;
  return <div className="space-y-4">{renderSankey()}</div>;
}

export function DealsDashboard() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [brokerFilter, setBrokerFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [newDealsSortField, setNewDealsSortField] = useState<SortField | null>(null);
  const [newDealsSortDirection, setNewDealsSortDirection] = useState<SortDirection>(null);
  
  const { isFullscreen, isSupported, toggleFullscreen } = useFullscreen();

  // Initial loading animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000); // Show loading animation for 2 seconds on initial load
    
    return () => clearTimeout(timer);
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return; setIsLoading(true); setError(null);
    try {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();
      if (fileExtension === "json") {
        const text = await file.text(); const jsonData = JSON.parse(text);
        let dealsArray: Deal[]; if (Array.isArray(jsonData)) dealsArray = jsonData; else if (jsonData.deals && Array.isArray(jsonData.deals)) dealsArray = jsonData.deals; else throw new Error("Invalid JSON structure.");
        setDeals(dealsArray); setError(null);
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        const arrayBuffer = await file.arrayBuffer(); const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0], worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        if (jsonData.length < 2) throw new Error("Excel file must have at least a header row and one data row.");
        const headers = (jsonData[0] as string[]).map(h => h.trim());
        const dealsArray: Deal[] = (jsonData.slice(1) as any[][]).map((row, index) => {
          const deal: any = {}; headers.forEach((header, colIndex) => { deal[header] = row[colIndex] ?? null });
          deal.deal_id = String(deal.deal_id || `excel_${index + 1}`); deal.deal_name = String(deal.deal_name || `Deal ${index + 1}`); deal.broker_name = String(deal.broker_name || "Unknown Broker"); deal.status = String(deal.status || "Unknown");
          const dealValue = deal.deal_value; if (typeof dealValue === 'string') deal.deal_value = Number(dealValue.replace(/[^0-9.-]+/g,"")) || 0; else if (typeof dealValue !== 'number') deal.deal_value = 0;
          const processDays = deal["process days"]; if (typeof processDays === 'string') deal["process days"] = Number(processDays.replace(/[^0-9.-]+/g,"")) || null; else if (typeof processDays !== 'number') deal["process days"] = null;
          Object.keys(deal).forEach(key => { const value = deal[key]; if (value && (value instanceof Date)) deal[key] = value.toISOString() });
          return deal as Deal;
        }).filter((deal) => deal.deal_name && deal.deal_name.trim() !== "");
        setDeals(dealsArray); setError(null);
      } else throw new Error("Unsupported file format. Please upload a JSON or Excel (.xlsx/.xls) file.");
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to parse file"); setDeals([]) }
    finally { setIsLoading(false) }
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) { if (sortDirection === "asc") setSortDirection("desc"); else if (sortDirection === "desc") { setSortDirection(null); setSortField(null) } else setSortDirection("asc") }
    else { setSortField(field); setSortDirection("asc") }
  }, [sortField, sortDirection]);

  const handleNewDealsSort = useCallback((field: SortField) => {
    if (newDealsSortField === field) { 
      if (newDealsSortDirection === "asc") setNewDealsSortDirection("desc"); 
      else if (newDealsSortDirection === "desc") { setNewDealsSortDirection(null); setNewDealsSortField(null) } 
      else setNewDealsSortDirection("asc") 
    }
    else { setNewDealsSortField(field); setNewDealsSortDirection("asc") }
  }, [newDealsSortField, newDealsSortDirection]);

  const getNewDealsSortIcon = useCallback((field: string) => { 
    if (newDealsSortField !== field) return <ArrowUpDown className="h-3 w-3" />; 
    return newDealsSortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> 
  }, [newDealsSortField, newDealsSortDirection]);

  const getSortIcon = useCallback((field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />; if (sortDirection === "asc") return <ArrowUp className="h-4 w-4" />; if (sortDirection === "desc") return <ArrowDown className="h-4 w-4" />; return <ArrowUpDown className="h-4 w-4" />
  }, [sortField, sortDirection]);

  const getStatusBadgeClass = (status: string) => {
    const statusClass = status.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '-');
    return `status-badge-${statusClass}`;
  };

  const getDealDisplayStatus = (deal: Deal): string => {
      if (deal.status === "Lost") {
          return "Lost";
      }
      const stages: (keyof Deal)[] = ["Enquiry Leads", "Opportunity", "1. Application", "2. Assessment", "3. Approval", "4. Loan Document", "5. Settlement Queue", "6. Settled"];
      let latestStage: string | null = null;
      // Find the latest stage that has a date
      for (const stage of stages) {
          if (deal[stage] && String(deal[stage]).trim() !== "") {
              latestStage = stage;
          }
      }
      // If a stage is found, it's the current status. Otherwise, fall back to the original deal.status.
      return latestStage || deal.status || "Unknown";
  };

  const filteredDeals = useMemo(() => {
    const filtered = deals.filter((deal) => {
      const matchesSearch = 
        String(deal.deal_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        String(deal.broker_name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || deal.status === statusFilter;
      const matchesBroker = brokerFilter === "all" || deal.broker_name === brokerFilter;
      const matchesSource = sourceFilter === "all" || (sourceFilter === "rednote" && deal["From Rednote?"] === "Yes") || (sourceFilter === "lifex" && deal["From LifeX?"] === "Yes") || (sourceFilter === "other" && deal["From Rednote?"] === "No" && deal["From LifeX?"] === "No");
      
      const dateToCheck = deal.latest_date || deal["6. Settled"] || deal.created_time;
      let matchesDateRange = true;
      if (startDate || endDate) {
        if (!dateToCheck) {
            matchesDateRange = false;
        } else {
            const dealDateRaw = new Date(dateToCheck);
            if (isNaN(dealDateRaw.getTime())) {
                matchesDateRange = false;
            } else {
                // 使用本地日期字符串比较，避免时区问题
                const year = dealDateRaw.getFullYear();
                const month = String(dealDateRaw.getMonth() + 1).padStart(2, '0');
                const day = String(dealDateRaw.getDate()).padStart(2, '0');
                const dealDateStr = `${year}-${month}-${day}`; // 获取 YYYY-MM-DD 格式

                if (startDate) {
                    if (dealDateStr < startDate) {
                        matchesDateRange = false;
                    }
                }
                if (endDate && matchesDateRange) {
                    if (dealDateStr > endDate) {
                        matchesDateRange = false;
                    }
                }
            }
        }
      }

      return matchesSearch && matchesStatus && matchesBroker && matchesSource && matchesDateRange;
    });

    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;
        switch (sortField) {
          case "deal_name": aValue = a.deal_name || ""; bValue = b.deal_name || ""; break;
          case "broker_name": aValue = a.broker_name || ""; bValue = b.broker_name || ""; break;
          case "deal_value": aValue = a.deal_value || 0; bValue = b.deal_value || 0; break;
          case "status": aValue = a.status || ""; bValue = b.status || ""; break;
          case "source": aValue = a["From Rednote?"] === "Yes" ? "RedNote" : a["From LifeX?"] === "Yes" ? "LifeX" : "Other"; bValue = b["From Rednote?"] === "Yes" ? "RedNote" : b["From LifeX?"] === "Yes" ? "LifeX" : "Other"; break;
          case "process_days": aValue = a["process days"] || 0; bValue = b["process days"] || 0; break;
          case "latest_date": aValue = a.latest_date ? new Date(a.latest_date).getTime() : 0; bValue = b.latest_date ? new Date(b.latest_date).getTime() : 0; break;
          case "lost_reason": aValue = a["lost reason"] || ""; bValue = b["lost reason"] || ""; break;
          case "lost_process": aValue = a["which process (if lost)"] || ""; bValue = b["which process (if lost)"] || ""; break;
          default: return 0;
        }
        if (typeof aValue === "number" && typeof bValue === "number") return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        const comparison = String(aValue).localeCompare(String(bValue)); return sortDirection === "asc" ? comparison : -comparison;
      });
    }
    return filtered;
  }, [deals, searchTerm, statusFilter, brokerFilter, sourceFilter, startDate, endDate, sortField, sortDirection]);

  const stats = useMemo(() => {
    const totalDeals = filteredDeals.length;
    const settledCount = filteredDeals.filter((d) => d["6. Settled"] && d["6. Settled"].trim() !== "").length;
    const settledRate = totalDeals > 0 ? ((settledCount / totalDeals) * 100).toFixed(1) : "0";
    const convertedCount = filteredDeals.filter((d) => (d["1. Application"] && d["1. Application"].trim() !== "") || (d["2. Assessment"] && d["2. Assessment"].trim() !== "") || (d["3. Approval"] && d["3. Approval"].trim() !== "") || (d["4. Loan Document"] && d["4. Loan Document"].trim() !== "") || (d["5. Settlement Queue"] && d["5. Settlement Queue"].trim() !== "") || (d["6. Settled"] && d["6. Settled"].trim() !== "") || (d["2025 Settlement"] && d["2025 Settlement"].trim() !== "") || (d["2024 Settlement"] && d["2024 Settlement"].trim() !== "")).length;
    const conversionRate = totalDeals > 0 ? ((convertedCount / totalDeals) * 100).toFixed(1) : "0";
    const lostDeals = filteredDeals.filter((d) => d.status === "Lost").length;
    const totalValue = filteredDeals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0);
    const settledValue = filteredDeals.filter((d) => d["6. Settled"] && d["6. Settled"].trim() !== "").reduce((sum, deal) => sum + (deal.deal_value || 0), 0);
    return { totalDeals, settledCount, settledRate, convertedCount, conversionRate, lostDeals, totalValue, settledValue };
  }, [filteredDeals]);

  const brokers = useMemo(() => {
    const brokerStats = filteredDeals.reduce((acc, deal) => { if (!acc[deal.broker_name]) acc[deal.broker_name] = { total: 0, settled: 0, value: 0 }; acc[deal.broker_name].total++; if (deal["6. Settled"] && deal["6. Settled"].trim() !== "") { acc[deal.broker_name].settled++; acc[deal.broker_name].value += deal.deal_value || 0 } return acc }, {} as Record<string, { total: number; settled: number; value: number }>);
    return Object.entries(brokerStats).map(([name, stats]) => ({ name, ...stats, settledRate: stats.total > 0 ? ((stats.settled / stats.total) * 100).toFixed(1) : "0" })).sort((a, b) => b.value - a.value);
  }, [filteredDeals]);

  const brokerWeeklyAverage = useMemo(() => {
    if (deals.length === 0) return {};
    const weeks = new Set<string>(); deals.forEach((deal) => { if (deal.latest_date) { const date = new Date(deal.latest_date); const monday = new Date(date); monday.setDate(date.getDate() - date.getDay() + 1); weeks.add(monday.toISOString().split("T")[0]) } });
    const totalWeeks = weeks.size; if (totalWeeks === 0) return {};
    const brokerTotalDeals = deals.reduce((acc, deal) => { acc[deal.broker_name] = (acc[deal.broker_name] || 0) + 1; return acc }, {} as Record<string, number>);
    return Object.entries(brokerTotalDeals).reduce((acc, [brokerName, totalDeals]) => { acc[brokerName] = totalDeals / totalWeeks; return acc }, {} as Record<string, number>);
  }, [deals]);

  const brokerDistributionData = useMemo(() => {
    const outerData = brokers.slice(0, 10).map((broker, index) => ({ label: broker.name, value: broker.total, color: CHART_COLORS[index % CHART_COLORS.length] }));
    const innerData = brokers.slice(0, 10).map((broker, index) => ({ label: broker.name, value: brokerWeeklyAverage[broker.name] || 0, color: CHART_COLORS[index % CHART_COLORS.length] }));
    return { outerData, innerData };
  }, [brokers, brokerWeeklyAverage]);

  const statusCounts = useMemo(() => {
    const counts = filteredDeals.reduce((acc, deal) => { if (deal.status) acc[deal.status] = (acc[deal.status] || 0) + 1; return acc }, {} as Record<string, number>);
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredDeals]);

  const leadSourcesData = useMemo(() => {
    const rednoteCount = filteredDeals.filter((d) => d["From Rednote?"] === "Yes").length;
    const lifexCount = filteredDeals.filter((d) => d["From LifeX?"] === "Yes").length;
    const otherCount = filteredDeals.filter((d) => d["From Rednote?"] === "No" && d["From LifeX?"] === "No").length;
    return [{ label: "RedNote", value: rednoteCount, color: CHART_COLORS[0] }, { label: "LifeX", value: lifexCount, color: CHART_COLORS[1] }, { label: "Other Sources", value: otherCount, color: CHART_COLORS[2] }].filter((item) => item.value > 0);
  }, [filteredDeals]);

  const newDeals = useMemo(() => {
    const filtered = deals.filter(deal => {
      if (!deal.created_time) return false;
      
      const dealDateRaw = new Date(deal.created_time);
      if (isNaN(dealDateRaw.getTime())) return false;

      // 使用本地日期字符串比较，避免时区问题
      const year = dealDateRaw.getFullYear();
      const month = String(dealDateRaw.getMonth() + 1).padStart(2, '0');
      const day = String(dealDateRaw.getDate()).padStart(2, '0');
      const dealDateStr = `${year}-${month}-${day}`; // 获取 YYYY-MM-DD 格式

      if (startDate) {
        if (dealDateStr < startDate) return false;
      }
      if (endDate) {
        if (dealDateStr > endDate) return false;
      }
      return true;
    });

    // Apply sorting if specified
    if (newDealsSortField && newDealsSortDirection) {
      return filtered.sort((a, b) => {
        let aValue: any = "";
        let bValue: any = "";

        switch (newDealsSortField) {
          case "deal_name":
            aValue = a.deal_name || "";
            bValue = b.deal_name || "";
            break;
          case "broker_name":
            aValue = a.broker_name || "";
            bValue = b.broker_name || "";
            break;
          case "deal_value":
            aValue = a.deal_value || 0;
            bValue = b.deal_value || 0;
            break;
          case "status":
            aValue = getDealDisplayStatus(a);
            bValue = getDealDisplayStatus(b);
            break;
          case "source":
            aValue = a["From Rednote?"] === "Yes" ? "RedNote" : a["From LifeX?"] === "Yes" ? "LifeX" : "Other";
            bValue = b["From Rednote?"] === "Yes" ? "RedNote" : b["From LifeX?"] === "Yes" ? "LifeX" : "Other";
            break;
          case "latest_date":
            aValue = a.created_time || "";
            bValue = b.created_time || "";
            break;
          default:
            return 0;
        }

        if (typeof aValue === "string" && typeof bValue === "string") {
          const result = aValue.localeCompare(bValue);
          return newDealsSortDirection === "asc" ? result : -result;
        } else {
          const result = aValue - bValue;
          return newDealsSortDirection === "asc" ? result : -result;
        }
      });
    }

    return filtered;
  }, [deals, startDate, endDate, newDealsSortField, newDealsSortDirection, getDealDisplayStatus]);

  const newDealsStats = useMemo(() => {
    const totalNewDeals = newDeals.length;
    const totalNewValue = newDeals.reduce((sum, deal) => sum + (deal.deal_value || 0), 0);
    return { totalNewDeals, totalNewValue };
  }, [newDeals]);

  const [selectedBrokerForSourceChart, setSelectedBrokerForSourceChart] = useState<string | null>(null);

  const newDealsBrokerDistribution = useMemo(() => {
    const brokerCounts = newDeals.reduce((acc, deal) => {
      acc[deal.broker_name] = (acc[deal.broker_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(brokerCounts)
      .map(([broker, count], index) => ({
        label: broker,
        value: count,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [newDeals]);

  const newDealsSourceDistributionByBroker = useMemo(() => {
    const brokerSourceCounts: Record<string, Record<string, number>> = {};

    newDeals.forEach(deal => {
      const brokerName = deal.broker_name;
      const source = deal["From Rednote?"] === "Yes" ? "RED" : deal["From LifeX?"] === "Yes" ? "LIFEX" : "REFERRAL";

      if (!brokerSourceCounts[brokerName]) {
        brokerSourceCounts[brokerName] = { "RED": 0, "LIFEX": 0, "REFERRAL": 0 };
      }
      brokerSourceCounts[brokerName][source]++;
    });

    const result: Record<string, Array<{ label: string; value: number; color: string }>> = {};
    Object.entries(brokerSourceCounts).forEach(([broker, sources]) => {
      result[broker] = [
        { label: "RED", value: sources["RED"] || 0, color: CHART_COLORS[0] },
        { label: "LIFEX", value: sources["LIFEX"] || 0, color: CHART_COLORS[1] },
        { label: "REFERRAL", value: sources["REFERRAL"] || 0, color: CHART_COLORS[2] },
      ].filter(item => item.value > 0); // Only include sources with actual deals
    });

    return result;
  }, [newDeals]);

  const newDealsAllSourcesDistribution = useMemo(() => {
    const sourceCounts = newDeals.reduce((acc, deal) => {
      const source = deal["From Rednote?"] === "Yes" ? "RED" : deal["From LifeX?"] === "Yes" ? "LIFEX" : "REFERRAL";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { label: "RED", value: sourceCounts["RED"] || 0, color: CHART_COLORS[0] },
      { label: "LIFEX", value: sourceCounts["LIFEX"] || 0, color: CHART_COLORS[1] },
      { label: "REFERRAL", value: sourceCounts["REFERRAL"] || 0, color: CHART_COLORS[2] },
    ].filter(item => item.value > 0);
  }, [newDeals]);

  const newDealsStatusDistribution = useMemo(() => {
    const statusCounts = newDeals.reduce((acc, deal) => {
      const status = getDealDisplayStatus(deal);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts)
      .map(([status, count], index) => ({
        label: status,
        value: count,
        color: status === 'Lost' ? '#9CA3AF' : CHART_COLORS[index % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [newDeals, getDealDisplayStatus]);

  const formatCurrency = (value: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  if (isLoading) {
    return <LoadingAnimation message="Processing your data..." />
  }

  if (deals.length === 0 && !isLoading) {
    return (
      <div className="bg-gradient-to-br from-slate-100 via-purple-50 to-purple-100 text-gray-800 min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet/15 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-200/40 rounded-full blur-3xl"></div>
        </div>
        
        {/* Large background logo */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="relative animate-pulse">
            <Image 
              src="/lifex_logo.png" 
              alt="LifeX Background Logo" 
              width={1000} 
              height={400} 
              className="opacity-[0.04] select-none pointer-events-none transform scale-125 filter blur-[0.5px]"
            />
            {/* Additional logo layer for depth */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Image 
                src="/lifex_logo.png" 
                alt="LifeX Background Logo Secondary" 
                width={600} 
                height={240} 
                className="opacity-[0.02] select-none pointer-events-none transform scale-110 filter blur-[1px]"
              />
            </div>
          </div>
        </div>
        
        <div className="relative z-10 w-full max-w-2xl">
          {/* Header Section */}
          <div className="text-center space-y-6 mb-12">
            <div className="relative inline-block">
              <Image 
                src="/lifex_logo.png" 
                alt="LifeX Logo" 
                width={140} 
                height={56} 
                className="mx-auto drop-shadow-xl filter brightness-110" 
              />
            </div>
            <div className="space-y-3">
              <h1 className="text-5xl font-black bg-gradient-to-r from-violet via-hot-pink to-violet bg-clip-text text-transparent tracking-tight">
                Deals Dashboard
              </h1>
              <p className="text-violet/70 text-lg font-medium">
                Powerful analytics for your deals data
              </p>
            </div>
          </div>

          {/* Upload Card */}
          <Card className="bg-white/85 backdrop-blur-md border-0 shadow-2xl shadow-violet/25 ring-1 ring-violet/10">
            <CardContent className="p-8">
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-violet to-hot-pink rounded-full mb-4">
                  <Upload className="h-8 w-8 text-white" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-violet">Upload Your Data</h2>
                  <p className="text-violet/70">
                    Drag and drop your file here, or click to browse
                  </p>
                </div>

                {/* Upload Area */}
                <div className="relative">
                  <div className="border-2 border-dashed border-violet/30 rounded-xl p-8 hover:border-violet/50 transition-colors duration-200 hover:bg-violet/5">
                    <Input 
                      type="file" 
                      accept=".json, .xlsx, .xls" 
                      onChange={handleFileUpload} 
                      disabled={isLoading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="text-center space-y-3">
                      <div className="text-violet/60 text-lg">
                        <FileText className="h-12 w-12 mx-auto mb-3 text-violet/40" />
                        Choose file or drag it here
                      </div>
                      <div className="flex items-center justify-center space-x-4 text-sm text-violet/50">
                        <span className="px-3 py-1 bg-violet/10 rounded-full">JSON</span>
                        <span className="px-3 py-1 bg-violet/10 rounded-full">Excel</span>
                        <span className="px-3 py-1 bg-violet/10 rounded-full">CSV</span>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-700">{error}</AlertDescription>
                  </Alert>
                )}

                {/* Info Section */}
                <div className="bg-violet/5 rounded-lg p-4 text-left">
                  <h3 className="font-semibold text-violet mb-2 flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    File Requirements
                  </h3>
                  <ul className="text-sm text-violet/70 space-y-1">
                    <li>• Supported formats: JSON, Excel (.xlsx, .xls)</li>
                    <li>• Maximum file size: 10MB</li>
                    <li>• First row should contain column headers</li>
                    <li>• Required fields: deal_id, deal_name, broker_name, deal_value</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-violet/50 text-sm">
            Secure file processing • Your data stays private
          </div>
        </div>
      </div>
    );
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
              width={140} 
              height={56} 
              className="filter drop-shadow-lg" 
            />
          </div>
        </div>
        
        <div className="text-center">
          <h1 className="text-4xl font-black bg-gradient-to-r from-purple-700 via-pink-600 to-purple-700 bg-clip-text text-transparent tracking-wider">
            DEALS DASHBOARD
          </h1>
          <p className="text-gray-700 text-sm font-semibold mt-1">
            Real-time analytics & insights
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/marketing">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/60 border-violet/30 text-violet hover:bg-violet hover:text-white transition-all duration-300 shadow-sm hover:shadow-lg backdrop-blur-sm"
              title="营销仪表板"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              营销
            </Button>
          </Link>
          {isSupported && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleFullscreen()}
              className="bg-white/60 border-violet/30 text-violet hover:bg-violet hover:text-white transition-all duration-300 shadow-sm hover:shadow-lg backdrop-blur-sm"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => { setDeals([]); setError(null) }} 
            className="bg-gradient-to-r from-hot-pink to-violet text-white border-0 hover:from-violet hover:to-hot-pink transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload New File
          </Button>
        </div>
      </header>

      <div className="relative z-40 container mx-auto p-8 space-y-8">
        <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl shadow-violet/10 ring-1 ring-violet/20">
          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-3 text-2xl font-bold">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <span className="text-gray-800 font-black">
                Time Filters
              </span>
            </CardTitle>
            <CardDescription className="text-gray-600 text-base font-medium">
              Filter your deals data by date range to focus on specific time periods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                  Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-white border-gray-300 text-gray-800 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-200 hover:bg-gray-50"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(new Date(startDate), "PPP") : "Pick a start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate ? new Date(startDate) : undefined}
                      onSelect={(date) => setStartDate(date ? format(date, "yyyy-MM-dd") : "")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <div className="w-2 h-2 bg-pink-600 rounded-full"></div>
                  End Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal bg-white border-gray-300 text-gray-800 focus:border-pink-500 focus:ring-pink-500/20 transition-all duration-200 hover:bg-gray-50"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(new Date(endDate), "PPP") : "Pick an end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate ? new Date(endDate) : undefined}
                      onSelect={(date) => setEndDate(date ? format(date, "yyyy-MM-dd") : "")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={() => { setStartDate(""); setEndDate("") }} 
                  className="bg-white border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200 w-full font-semibold"
                >
                  <ZoomOut className="h-4 w-4 mr-2" />
                  Clear Dates
                </Button>
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => { 
                    const today = new Date(); 
                    setStartDate(today.toISOString().split("T")[0]); 
                    setEndDate(today.toISOString().split("T")[0]) 
                  }} 
                  className="flex-1 bg-purple-100 hover:bg-purple-200 text-purple-700 border-0 transition-all duration-200 font-semibold"
                >
                  Today
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => { 
                    const today = new Date(); 
                    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
                    const daysToLastMonday = currentDay === 0 ? 6 : currentDay - 1; // If Sunday, go back 6 days to Monday
                    const lastMonday = new Date(today.getTime() - (daysToLastMonday + 7) * 24 * 60 * 60 * 1000);
                    const lastSunday = new Date(lastMonday.getTime() + 6 * 24 * 60 * 60 * 1000);
                    setStartDate(lastMonday.toISOString().split("T")[0]); 
                    setEndDate(lastSunday.toISOString().split("T")[0]) 
                  }} 
                  className="flex-1 bg-pink-100 hover:bg-pink-200 text-pink-700 border-0 transition-all duration-200 font-semibold"
                >
                  7 Days
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-xl shadow-violet/10 ring-1 ring-violet/20 hover:shadow-2xl hover:ring-violet/30 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-bold text-gray-700">Total Deals</CardTitle>
              <div className="p-2 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg group-hover:from-purple-200 group-hover:to-pink-200 transition-all duration-300">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent mb-2">
                {stats.totalDeals}
              </div>
              <p className="text-xs text-gray-600 font-semibold">
                {stats.settledCount} settled, {stats.lostDeals} lost
                {(searchTerm || statusFilter !== "all" || brokerFilter !== "all" || sourceFilter !== "all" || startDate || endDate) && " (filtered)"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-xl shadow-violet/10 ring-1 ring-violet/20 hover:shadow-2xl hover:ring-violet/30 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-bold text-gray-700">Settled Rate</CardTitle>
              <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg group-hover:from-green-200 group-hover:to-emerald-200 transition-all duration-300">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent mb-2">
                {stats.settledRate}%
              </div>
              <p className="text-xs text-gray-600 font-semibold">
                {stats.settledCount} of {stats.totalDeals} deals settled
              </p>
            </CardContent>
          </Card>
          <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-xl shadow-violet/10 ring-1 ring-violet/20 hover:shadow-2xl hover:ring-violet/30 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-bold text-gray-700">Total Settled Value</CardTitle>
              <div className="p-2 bg-gradient-to-r from-emerald-100 to-green-100 rounded-lg group-hover:from-emerald-200 group-hover:to-green-200 transition-all duration-300">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent mb-2">
                {formatCurrency(stats.settledValue)}
              </div>
              <p className="text-xs text-gray-600 font-semibold">
                From {stats.settledCount} deals
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-xl shadow-violet/10 ring-1 ring-violet/20 hover:shadow-2xl hover:ring-violet/30 transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-bold text-gray-700">Conversion Rate</CardTitle>
              <div className="p-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg group-hover:from-blue-200 group-hover:to-indigo-200 transition-all duration-300">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent mb-2">
                {stats.conversionRate}%
              </div>
              <p className="text-xs text-gray-600 font-semibold">
                {stats.convertedCount} of {stats.totalDeals} deals converted
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-5 bg-white/95 backdrop-blur-xl border-0 shadow-xl shadow-violet/10 ring-1 ring-violet/20 p-1 rounded-2xl h-12">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-semibold rounded-xl text-gray-700 hover:text-gray-900 h-10 flex items-center justify-center"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="new-deals"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-semibold rounded-xl text-gray-700 hover:text-gray-900 h-10 flex items-center justify-center"
            >
              New Deals
            </TabsTrigger>
            <TabsTrigger 
              value="brokers"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-semibold rounded-xl text-gray-700 hover:text-gray-900 h-10 flex items-center justify-center"
            >
              Brokers
            </TabsTrigger>
            <TabsTrigger 
              value="pipeline"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-semibold rounded-xl text-gray-700 hover:text-gray-900 h-10 flex items-center justify-center"
            >
              Pipeline Analysis
            </TabsTrigger>
            <TabsTrigger 
              value="weekly-analysis"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 font-semibold rounded-xl text-gray-700 hover:text-gray-900 h-10 flex items-center justify-center"
            >
              Weekly Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card className="bg-white/95 backdrop-blur-xl border-0 shadow-2xl shadow-violet/10 ring-1 ring-violet/20 mt-6">
              <CardHeader>
                <CardTitle className="text-gray-800 font-bold">Deals Overview</CardTitle>
                <CardDescription className="text-gray-600 font-medium">A summary of all deals based on the current filters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="lg:col-span-1">
                    <h3 className="font-semibold mb-2 text-center text-lg text-violet">Lead Sources</h3>
                    <p className="text-center text-sm text-violet/70 mb-4">Total: {leadSourcesData.reduce((sum, item) => sum + item.value, 0)} deals</p>
                    <PieChart data={leadSourcesData} size={250} />
                    <ChartComment chartId="lead-sources" chartTitle="Lead Sources" />
                  </div>
                  <div className="lg:col-span-2">
                    <h3 className="font-semibold mb-2 text-center text-lg text-violet">Broker Distribution</h3>
                    <p className="text-center text-sm text-violet/70 mb-4">Total: {brokerDistributionData.outerData.reduce((sum, item) => sum + item.value, 0)} deals</p>
                    <DoubleRingPieChart outerData={brokerDistributionData.outerData} innerData={brokerDistributionData.innerData} size={350} />
                    <ChartComment chartId="broker-distribution" chartTitle="Broker Distribution" />
                  </div>
                </div>
                
                <Card className="bg-white/60 border-violet/20 shadow-sm mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl font-bold text-violet">
                      <Search className="h-5 w-5" />
                      All Deals ({filteredDeals.length} total)
                    </CardTitle>
                    <div className="flex gap-4 pt-4">
                      <Input 
                        placeholder="Search by deal or broker..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="max-w-sm bg-violet/10 border-violet/30 text-deep-purple-text" 
                      />
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] bg-violet/10 border-violet/30 text-deep-purple-text">
                          <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                          {[{ value: "all", label: "All Statuses" }, ...statusCounts.map(([status]) => ({ value: status, label: status }))].map(s => 
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Select value={brokerFilter} onValueChange={setBrokerFilter}>
                        <SelectTrigger className="w-[180px] bg-violet/10 border-violet/30 text-deep-purple-text">
                          <SelectValue placeholder="Filter by broker" />
                        </SelectTrigger>
                        <SelectContent>
                          {[{ value: "all", label: "All Brokers" }, ...brokers.map(b => ({ value: b.name, label: b.name }))].map(b => 
                            <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger className="w-[180px] bg-violet/10 border-violet/30 text-deep-purple-text">
                          <SelectValue placeholder="Filter by source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          <SelectItem value="rednote">RedNote</SelectItem>
                          <SelectItem value="lifex">LifeX</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border border-violet/20">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <Button variant="ghost" onClick={() => handleSort("deal_name")}>
                                Deal Name {getSortIcon("deal_name")}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button variant="ghost" onClick={() => handleSort("broker_name")}>
                                Broker {getSortIcon("broker_name")}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button variant="ghost" onClick={() => handleSort("deal_value")}>
                                Value {getSortIcon("deal_value")}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button variant="ghost" onClick={() => handleSort("status")}>
                                Status {getSortIcon("status")}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button variant="ghost" onClick={() => handleSort("source")}>
                                Source {getSortIcon("source")}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button variant="ghost" onClick={() => handleSort("process_days")}>
                                Process Days {getSortIcon("process_days")}
                              </Button>
                            </TableHead>
                            <TableHead>
                              <Button variant="ghost" onClick={() => handleSort("latest_date")}>
                                Latest Update {getSortIcon("latest_date")}
                              </Button>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDeals.length > 0 ? (
                            filteredDeals.map((deal) => (
                              <TableRow key={deal.deal_id}>
                                <TableCell className="font-medium text-deep-purple-text">
                                  {deal.deal_name}
                                </TableCell>
                                <TableCell className="text-deep-purple-text">
                                  {deal.broker_name}
                                </TableCell>
                                <TableCell className="text-deep-purple-text">
                                  {formatCurrency(deal.deal_value)}
                                </TableCell>
                                <TableCell>
                                  <Badge className={getStatusBadgeClass(getDealDisplayStatus(deal))}>
                                    {getDealDisplayStatus(deal)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-deep-purple-text">
                                  {deal["From Rednote?"] === "Yes" ? "RedNote" : 
                                   deal["From LifeX?"] === "Yes" ? "LifeX" : "Other"}
                                </TableCell>
                                <TableCell className="text-deep-purple-text">
                                  {deal["process days"]}
                                </TableCell>
                                <TableCell className="text-deep-purple-text">
                                  {deal.latest_date ? new Date(deal.latest_date).toLocaleDateString() : "N/A"}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="h-24 text-center text-deep-purple-text/70">
                                No results found.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="new-deals">
            <Card className="bg-white/60 border-violet/20 shadow-sm mt-4">
              <CardHeader>
                <CardTitle className="text-violet">New Deals Analysis</CardTitle>
                <CardDescription className="text-violet/80">Analysis of deals created within the selected date range.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="bg-white/60 border-violet/20 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-violet">Total New Deals</CardTitle>
                      <FileText className="h-4 w-4 text-violet/70" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-hot-pink">{newDealsStats.totalNewDeals}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/60 border-violet/20 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-violet">Total New Value</CardTitle>
                      <DollarSign className="h-4 w-4 text-violet/70" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-4xl font-bold text-hot-pink">{formatCurrency(newDealsStats.totalNewValue)}</div>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <Card className="bg-white/60 border-violet/20 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-violet">New Deals by Broker</CardTitle>
                      <CardDescription className="text-violet/70">Total: {newDealsBrokerDistribution.reduce((sum, item) => sum + item.value, 0)} deals</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BarChart
                        data={newDealsBrokerDistribution}
                        onBarClick={(label) => setSelectedBrokerForSourceChart(label || null)}
                        selectedLabel={selectedBrokerForSourceChart}
                      />
                      <ChartComment chartId="new-deals-by-broker" chartTitle="New Deals by Broker" />
                    </CardContent>
                  </Card>
                  <Card className="bg-white/60 border-violet/20 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-violet">
                        New Deals by Source {selectedBrokerForSourceChart ? `(${selectedBrokerForSourceChart})` : "(All Brokers)"}
                      </CardTitle>
                      <CardDescription className="text-violet/70">
                        Total: {selectedBrokerForSourceChart 
                          ? (newDealsSourceDistributionByBroker[selectedBrokerForSourceChart]?.reduce((sum, item) => sum + item.value, 0) || 0)
                          : newDealsAllSourcesDistribution.reduce((sum, item) => sum + item.value, 0)} deals
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedBrokerForSourceChart ? (
                        newDealsSourceDistributionByBroker[selectedBrokerForSourceChart] && newDealsSourceDistributionByBroker[selectedBrokerForSourceChart].length > 0 ? (
                          <BarChart
                            data={newDealsSourceDistributionByBroker[selectedBrokerForSourceChart]}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-32 text-deep-purple-text/70">
                            No source data for {selectedBrokerForSourceChart}
                          </div>
                        )
                      ) : (
                        newDealsAllSourcesDistribution.length > 0 ? (
                          <BarChart
                            data={newDealsAllSourcesDistribution}
                          />
                        ) : (
                          <div className="flex items-center justify-center h-32 text-deep-purple-text/70">
                            No new deals data available
                          </div>
                        )
                      )}
                      <ChartComment chartId="new-deals-by-source" chartTitle="New Deals by Source" />
                    </CardContent>
                  </Card>
                </div>
                <div className="rounded-md border border-violet/20 mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button variant="ghost" onClick={() => handleNewDealsSort("deal_name")}>
                            Deal Name {getNewDealsSortIcon("deal_name")}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" onClick={() => handleNewDealsSort("broker_name")}>
                            Broker {getNewDealsSortIcon("broker_name")}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" onClick={() => handleNewDealsSort("deal_value")}>
                            Value {getNewDealsSortIcon("deal_value")}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" onClick={() => handleNewDealsSort("status")}>
                            Status {getNewDealsSortIcon("status")}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" onClick={() => handleNewDealsSort("source")}>
                            Source {getNewDealsSortIcon("source")}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" onClick={() => handleNewDealsSort("latest_date")}>
                            Created Date {getNewDealsSortIcon("latest_date")}
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newDeals.length > 0 ? (
                        newDeals.map((deal) => (
                          <TableRow key={deal.deal_id}>
                            <TableCell className="font-medium text-deep-purple-text">
                              {deal.deal_name}
                            </TableCell>
                            <TableCell className="text-deep-purple-text">
                              {deal.broker_name}
                            </TableCell>
                            <TableCell className="text-deep-purple-text">
                              {formatCurrency(deal.deal_value)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusBadgeClass(getDealDisplayStatus(deal))}>
                                {getDealDisplayStatus(deal)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-deep-purple-text">
                              {deal["From Rednote?"] === "Yes" ? "RedNote" : 
                               deal["From LifeX?"] === "Yes" ? "LifeX" : "Other"}
                            </TableCell>
                            <TableCell className="text-deep-purple-text">
                              {deal.created_time ? new Date(deal.created_time).toLocaleDateString() : "N/A"}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            No new deals in the selected date range.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="brokers">
            <Card className="bg-white/60 border-violet/20 shadow-sm mt-4">
              <CardHeader>
                <CardTitle className="text-violet">Broker Performance</CardTitle>
                <CardDescription className="text-violet/80">Performance metrics for each broker. Total brokers: {brokers.length}, Total deals: {brokers.reduce((sum, broker) => sum + broker.total, 0)}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Broker</TableHead>
                      <TableHead>Total Deals</TableHead>
                      <TableHead>Settled Deals</TableHead>
                      <TableHead>Settled Rate</TableHead>
                      <TableHead>Total Value Settled</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brokers.map((broker) => (
                      <TableRow key={broker.name}>
                        <TableCell className="font-medium text-deep-purple-text">{broker.name}</TableCell>
                        <TableCell className="text-deep-purple-text">{broker.total}</TableCell>
                        <TableCell className="text-deep-purple-text">{broker.settled}</TableCell>
                        <TableCell className="text-deep-purple-text">{broker.settledRate}%</TableCell>
                        <TableCell className="text-deep-purple-text">{formatCurrency(broker.value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="bg-white/60 border-violet/20 shadow-sm mt-4">
              <CardHeader>
                <CardTitle className="text-violet">Settlement Analysis</CardTitle>
                <CardDescription className="text-violet/80">Interactive treemap of settled deals by value. Total settled: {filteredDeals.filter(d => d["6. Settled"] && d["6. Settled"].trim() !== "").length} deals</CardDescription>
              </CardHeader>
              <CardContent>
                <InteractiveTreemap deals={filteredDeals} />
                <ChartComment chartId="settlement-analysis-treemap" chartTitle="Settlement Analysis Treemap" />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="pipeline">
            <Card className="bg-white/60 border-violet/20 shadow-sm mt-4">
              <CardHeader>
                <CardTitle className="text-violet">Deal Pipeline Flow</CardTitle>
                <CardDescription className="text-violet/80">Visualize the deal flow from lead to settlement or loss. Total deals: {filteredDeals.length}</CardDescription>
              </CardHeader>
              <CardContent>
                <SankeyDiagram deals={filteredDeals} />
                <ChartComment chartId="pipeline-sankey-diagram" chartTitle="Pipeline Flow Diagram" />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="weekly-analysis">
            <WeeklyAnalysis filteredDeals={filteredDeals} allDeals={deals} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}