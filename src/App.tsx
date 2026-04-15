import { useState, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  Upload, 
  Search, 
  TrendingUp, 
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Table as TableIcon,
  Trash2,
  Plus,
  BrainCircuit,
  Loader2,
  FileUp,
  FileText,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { useDropzone } from 'react-dropzone';
import { GoogleGenAI, Type } from "@google/genai";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

import { DataRecord, ColumnMetadata, DashboardConfig } from './types';
import { parseFile, analyzeColumns, generateDataSummary } from './lib/parser';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

export default function App() {
  const [data, setData] = useState<DataRecord[]>([]);
  const [columns, setColumns] = useState<ColumnMetadata[]>([]);
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setIsAnalyzing(true);
      const parsedData = await parseFile(file);
      if (parsedData.length === 0) {
        toast.error("No data found in file.");
        setIsAnalyzing(false);
        return;
      }

      const colMetadata = analyzeColumns(parsedData);
      setData(parsedData);
      setColumns(colMetadata);
      
      // Use Gemini to generate a dashboard config
      const summary = generateDataSummary(parsedData, colMetadata);
      await generateDashboardConfig(colMetadata, summary);
      
      toast.success(`Successfully loaded ${parsedData.length} rows.`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to process file.");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  } as any);

  const generateDashboardConfig = async (cols: ColumnMetadata[], summary: string) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        throw new Error("API_KEY_MISSING");
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        I have a dataset with the following columns: ${JSON.stringify(cols)}.
        Here is a summary of the data: ${summary}.
        
        Please suggest a dashboard configuration in JSON format.
        The configuration should include:
        1. A descriptive title for the dashboard.
        2. Up to 4 KPI columns (numeric columns that represent totals or averages).
        3. Up to 4 charts. Each chart needs:
           - type: 'bar', 'line', or 'pie'
           - xAxis: a categorical or date column name
           - yAxis: a numeric column name to aggregate (sum)
           - title: a descriptive title for the chart
        4. A "writtenAnalysis" field: Provide a professional, deep written analysis of the data in Arabic. 
           Identify trends, anomalies, and provide actionable recommendations based on the summary provided.
           The analysis should be thorough and insightful.
        
        Return ONLY the JSON object matching the DashboardConfig interface.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              kpis: { type: Type.ARRAY, items: { type: Type.STRING } },
              writtenAnalysis: { type: Type.STRING },
              charts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ['bar', 'line', 'pie'] },
                    xAxis: { type: Type.STRING },
                    yAxis: { type: Type.STRING },
                    title: { type: Type.STRING }
                  },
                  required: ['type', 'xAxis', 'yAxis', 'title']
                }
              }
            },
            required: ['title', 'kpis', 'charts', 'writtenAnalysis']
          }
        }
      });

      const configJson = JSON.parse(response.text);
      setConfig(configJson);
    } catch (error: any) {
      console.error("AI Analysis failed", error);
      
      if (error.message === "API_KEY_MISSING") {
        toast.error("Gemini API Key is missing. Please configure it in the settings or .env file.");
      } else {
        toast.error("AI analysis failed. Using fallback layout.");
      }

      // Fallback: simple heuristic
      const numericCols = cols.filter(c => c.type === 'number').map(c => c.name);
      const categoricalCols = cols.filter(c => c.isCategorical).map(c => c.name);
      
      setConfig({
        title: "Data Overview",
        kpis: numericCols.slice(0, 3),
        charts: numericCols.length > 0 && categoricalCols.length > 0 ? [
          {
            type: 'bar',
            xAxis: categoricalCols[0],
            yAxis: numericCols[0],
            title: `${numericCols[0]} by ${categoricalCols[0]}`
          }
        ] : []
      });
    }
  };

  const getChartData = (xAxis: string, yAxis: string) => {
    const map = new Map<string, number>();
    data.forEach(row => {
      const xVal = String(row[xAxis] || 'Unknown');
      const yVal = Number(row[yAxis] || 0);
      map.set(xVal, (map.get(xVal) || 0) + yVal);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).slice(0, 15);
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  const clearData = () => {
    setData([]);
    setColumns([]);
    setConfig(null);
    toast.info("Data cleared.");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Toaster position="top-right" />
      
      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
                <BrainCircuit className="text-white h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Insight<span className="text-indigo-600">Flow</span></h1>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">AI-Powered Data Analytics</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {data.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearData} className="text-slate-500 hover:text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
              <Button {...getRootProps()} className="bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 gap-2">
                <input {...getInputProps()} />
                <Upload className="h-4 w-4" />
                Upload File
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            <motion.div 
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-[60vh] text-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-100 rounded-full blur-2xl animate-pulse" />
                <Loader2 className="h-16 w-16 text-indigo-600 animate-spin relative z-10" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-2">Analyzing your data...</h2>
              <p className="text-slate-500 max-w-md">
                Gemini is processing your file and designing the best dashboard for your insights.
              </p>
            </motion.div>
          ) : data.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center h-[60vh] text-center"
            >
              <div 
                {...getRootProps()} 
                className={`
                  group cursor-pointer border-2 border-dashed rounded-[2rem] p-12 transition-all duration-300
                  ${isDragActive ? 'border-indigo-500 bg-indigo-50/50 scale-105' : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-slate-50'}
                `}
              >
                <input {...getInputProps()} />
                <div className="bg-slate-100 p-8 rounded-full mb-8 group-hover:scale-110 transition-transform duration-300">
                  <FileUp className={`h-16 w-16 ${isDragActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Drop your data here</h2>
                <p className="text-slate-500 max-w-sm mx-auto mb-8 text-lg">
                  Upload any Excel or CSV file to instantly generate a professional dashboard with AI insights.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Badge variant="secondary" className="px-4 py-1 text-sm">Excel (.xlsx)</Badge>
                  <Badge variant="secondary" className="px-4 py-1 text-sm">CSV (.csv)</Badge>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Dashboard Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{config?.title || "Data Dashboard"}</h2>
                  <p className="text-slate-500 mt-1">Real-time analysis of {data.length} records</p>
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium">
                  <BrainCircuit className="h-4 w-4" />
                  AI Optimized Layout
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {config?.kpis.map((kpi, idx) => {
                  const total = data.reduce((acc, row) => acc + Number(row[kpi] || 0), 0);
                  const avg = total / data.length;
                  return (
                    <Card key={idx} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-shadow duration-300">
                      <div className="h-1 w-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">{kpi}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-black text-slate-900">
                          {total > 1000000 ? `${(total/1000000).toFixed(1)}M` : total.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-medium italic">Avg: {avg.toFixed(1)}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Tabs defaultValue="visuals" className="space-y-8">
                <TabsList className="bg-white/50 border p-1 h-12 rounded-xl">
                  <TabsTrigger value="visuals" className="px-8 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Visual Insights
                  </TabsTrigger>
                  <TabsTrigger value="analysis" className="px-8 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600">
                    <FileText className="h-4 w-4 mr-2" />
                    AI Written Analysis
                  </TabsTrigger>
                  <TabsTrigger value="data" className="px-8 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600">
                    <TableIcon className="h-4 w-4 mr-2" />
                    Raw Data
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="visuals" className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {config?.charts.map((chart, idx) => (
                      <Card key={idx} className="border-none shadow-sm overflow-hidden">
                        <CardHeader className="border-b border-slate-50 bg-slate-50/30">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold text-slate-800">{chart.title}</CardTitle>
                            {chart.type === 'bar' && <BarChart3 className="h-5 w-5 text-indigo-400" />}
                            {chart.type === 'line' && <LineChartIcon className="h-5 w-5 text-emerald-400" />}
                            {chart.type === 'pie' && <PieChartIcon className="h-5 w-5 text-amber-400" />}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-6 h-[350px]">
                          <ResponsiveContainer width="100%" height="100%">
                            {chart.type === 'bar' ? (
                              <BarChart data={getChartData(chart.xAxis, chart.yAxis)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                <Tooltip 
                                  cursor={{ fill: '#f8fafc' }}
                                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                  {getChartData(chart.xAxis, chart.yAxis).map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            ) : chart.type === 'line' ? (
                              <LineChart data={getChartData(chart.xAxis, chart.yAxis)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                <Tooltip 
                                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                />
                                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                              </LineChart>
                            ) : (
                              <PieChart>
                                <Pie
                                  data={getChartData(chart.xAxis, chart.yAxis)}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={100}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {getChartData(chart.xAxis, chart.yAxis).map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                />
                                <Legend />
                              </PieChart>
                            )}
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="analysis">
                  <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader className="bg-indigo-600 text-white">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        <CardTitle>AI Written Analysis</CardTitle>
                      </div>
                      <CardDescription className="text-indigo-100">Deep insights and recommendations generated by Gemini</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 pb-12 px-8">
                      <div className="prose prose-indigo max-w-none">
                        <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-lg text-right" dir="rtl">
                          {config?.writtenAnalysis || "Analysis is being generated..."}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="data">
                  <Card className="border-none shadow-sm overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-slate-50">
                      <div>
                        <CardTitle>Data Explorer</CardTitle>
                        <CardDescription>Search and filter through all records</CardDescription>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                          placeholder="Search any field..." 
                          className="pl-9 w-[300px] bg-slate-50 border-none focus-visible:ring-indigo-500"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto max-h-[600px]">
                        <Table>
                          <TableHeader className="bg-slate-50/50 sticky top-0 z-10">
                            <TableRow>
                              {columns.map((col, idx) => (
                                <TableHead key={idx} className="font-bold text-slate-700 whitespace-nowrap">
                                  {col.name}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredData.length > 0 ? (
                              filteredData.map((row, rowIdx) => (
                                <TableRow key={rowIdx} className="hover:bg-slate-50/50 transition-colors">
                                  {columns.map((col, colIdx) => (
                                    <TableCell key={colIdx} className={`whitespace-nowrap ${col.type === 'number' ? 'font-mono text-right' : ''}`}>
                                      {col.type === 'number' ? Number(row[col.name] || 0).toLocaleString() : String(row[col.name] || '')}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={columns.length} className="h-32 text-center text-slate-400 italic">
                                  No records match your search.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-sm">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" />
            <span>Powered by Gemini AI</span>
          </div>
          <p>&copy; 2026 InsightFlow Analytics. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
