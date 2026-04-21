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
  Sparkles,
  Sun,
  Moon,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from 'next-themes';
import { useTranslation } from './lib/i18n';
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
  const { theme, setTheme } = useTheme();
  const { t, language, setLanguage, isRtl } = useTranslation();
  
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
      const apiKey = (process.env as any).GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured. Please check the Secrets panel.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
        You are a Senior Data Scientist and Business Analyst. 
        I have a dataset with the following columns: ${JSON.stringify(cols)}.
        Here is a detailed statistical summary of the data: ${summary}.
        
        Please provide a professional dashboard configuration and a deep business analysis.
        
        The analysis and all text inside the JSON configuration MUST be in ${language === 'ar' ? 'Arabic (باللغة العربية الفصحى)' : 'English'}.
        
        The configuration MUST include:
        1. title: A descriptive, professional title for the dashboard.
        2. kpis: Up to 4 numeric column names.
        3. charts: Up to 4 chart objects with type ('bar', 'line', or 'pie'), xAxis, yAxis, and title.
        4. writtenAnalysis: A comprehensive, professional business report structured with headers like Summary, Findings, Recommendations, etc.
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

      const configJson = JSON.parse(response.text || '{}');
      setConfig(configJson);
    } catch (error: any) {
      console.error("AI Analysis failed", error);
      toast.error(`AI analysis failed: ${error.message}`);

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
      const xVal = String(row[xAxis] ?? 'Unknown');
      const yVal = Number(row[yAxis]);
      const safeYVal = isNaN(yVal) ? 0 : yVal;
      map.set(xVal, (map.get(xVal) || 0) + safeYVal);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => !isNaN(item.value))
      .slice(0, 15);
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  const downloadAnalysis = () => {
    if (!config?.writtenAnalysis) return;
    const element = document.createElement("a");
    const file = new Blob([config.writtenAnalysis], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${config.title || 'analysis'}_report.txt`;
    document.body.appendChild(element);
    element.click();
    toast.success("Analysis report downloaded.");
  };

  const clearData = () => {
    setData([]);
    setColumns([]);
    setConfig(null);
    toast.info("Data cleared.");
  };

  return (
    <div className={`min-h-screen flex flex-col bg-background transition-colors duration-300 ${isRtl ? 'font-sans' : ''}`}>
      <Toaster position="top-right" />
      
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
                <BrainCircuit className="text-primary-foreground h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">{t('appTitle')}</h1>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{t('appTagline')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-1 bg-muted p-1 rounded-lg">
                <Button 
                  variant={language === 'en' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setLanguage('en')}
                  className="h-8 px-3 text-xs"
                >
                  EN
                </Button>
                <Button 
                  variant={language === 'ar' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setLanguage('ar')}
                  className="h-8 px-3 text-xs font-sans"
                >
                  عربي
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-lg text-muted-foreground"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              {data.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearData} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{t('clear')}</span>
                </Button>
              )}
              <Button {...getRootProps()} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-2">
                <input {...getInputProps()} />
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">{t('uploadFile')}</span>
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
                <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse" />
                <Loader2 className="h-16 w-16 text-primary animate-spin relative z-10" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mt-8 mb-2">
                {language === 'ar' ? 'جاري تحليل بياناتك...' : 'Analyzing your data...'}
              </h2>
              <p className="text-muted-foreground max-w-md">
                {language === 'ar' 
                  ? 'يقوم Gemini بمعالجة ملفك وتصميم أفضل لوحة تحكم لرؤاك.' 
                  : 'Gemini is processing your file and designing the best dashboard for your insights.'}
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
                <div className="bg-muted p-8 rounded-full mb-8 group-hover:scale-110 transition-transform duration-300">
                  <FileUp className={`h-16 w-16 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-4">{t('dropDataTitle')}</h2>
                <p className="text-muted-foreground max-w-sm mx-auto mb-8 text-lg">
                  {t('dropDataDesc')}
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Badge variant="secondary" className="px-4 py-1 text-sm">{t('excelBadge')}</Badge>
                  <Badge variant="secondary" className="px-4 py-1 text-sm">{t('csvBadge')}</Badge>
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
                  <h2 className="text-3xl font-extrabold text-foreground tracking-tight">{config?.title || (language === 'ar' ? "لوحة تحكم البيانات" : "Data Dashboard")}</h2>
                  <p className="text-muted-foreground mt-1">{t('realTimeAnalysis', { count: data.length })}</p>
                </div>
                <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-medium">
                  <BrainCircuit className="h-4 w-4" />
                  {t('aiOptimized')}
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {config?.kpis.map((kpi, idx) => {
                  const numericValues = data.map(row => Number(row[kpi])).filter(val => !isNaN(val));
                  const total = numericValues.reduce((acc, val) => acc + val, 0);
                  const avg = numericValues.length > 0 ? total / numericValues.length : 0;
                  
                  return (
                    <Card key={idx} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-shadow duration-300 bg-card">
                      <div className="h-1 w-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{kpi}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-black text-foreground">
                          {isNaN(total) ? "0" : (total > 1000000 ? `${(total/1000000).toFixed(1)}M` : total.toLocaleString())}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">{t('avg')}: {isNaN(avg) ? "0.0" : avg.toFixed(1)}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Tabs defaultValue="visuals" className="space-y-8">
                <TabsList className="bg-muted/50 border p-1 h-12 rounded-xl">
                  <TabsTrigger value="visuals" className="px-8 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {t('visualizations')}
                  </TabsTrigger>
                  <TabsTrigger value="analysis" className="px-8 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary">
                    <FileText className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'التحليل المكتوب' : 'AI Written Analysis'}
                  </TabsTrigger>
                  <TabsTrigger value="data" className="px-8 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-primary">
                    <TableIcon className="h-4 w-4 mr-2" />
                    {t('rawData')}
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
                  <Card className="border-none shadow-sm overflow-hidden bg-card">
                    <CardHeader className="bg-primary text-primary-foreground p-8">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-background/20 p-2 rounded-lg backdrop-blur-sm">
                            <Sparkles className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl font-bold">{t('insightsTitle')}</CardTitle>
                            <CardDescription className="text-primary-foreground/70">{t('insightsDesc')}</CardDescription>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={downloadAnalysis}
                          className="bg-primary-foreground/10 border-primary-foreground/20 hover:bg-primary-foreground/20 text-primary-foreground gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          {language === 'ar' ? 'تحميل التقرير' : 'Download Report'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-w-4xl mx-auto py-12 px-6 md:px-12">
                        <div className="bg-muted/50 rounded-2xl p-8 md:p-12 border border-border shadow-inner">
                          <div className="prose dark:prose-invert max-w-none">
                            <div 
                              className={`whitespace-pre-wrap text-foreground leading-relaxed text-lg font-medium ${isRtl ? 'text-right' : 'text-left'}`} 
                              dir={isRtl ? 'rtl' : 'ltr'}
                            >
                              {config?.writtenAnalysis || (language === 'ar' ? 'جاري توليد التحليل...' : 'Generating analysis...')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="p-6 bg-primary/5 rounded-xl border border-primary/10">
                            <TrendingUp className="h-8 w-8 text-primary mb-4" />
                            <h4 className="font-bold text-primary mb-2">{language === 'ar' ? 'رؤى استراتيجية' : 'Strategic Insights'}</h4>
                            <p className="text-sm text-foreground/70">
                              {language === 'ar' 
                                ? 'تحليل الاتجاهات المستقبلية بناءً على الأنماط الحالية في البيانات.' 
                                : 'Analyzing future trends based on current data patterns.'}
                            </p>
                          </div>
                          <div className="p-6 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                            <BarChart3 className="h-8 w-8 text-emerald-500 mb-4" />
                            <h4 className="font-bold text-emerald-900 dark:text-emerald-400 mb-2">{language === 'ar' ? 'دقة إحصائية' : 'Statistical Precision'}</h4>
                            <p className="text-sm text-foreground/70">
                              {language === 'ar' 
                                ? 'استخدام مقاييس الانحراف المعياري والمتوسطات لضمان دقة النتائج.' 
                                : 'Using standard deviation and averages to ensure accuracy.'}
                            </p>
                          </div>
                          <div className="p-6 bg-amber-500/5 rounded-xl border border-amber-500/10">
                            <BrainCircuit className="h-8 w-8 text-amber-500 mb-4" />
                            <h4 className="font-bold text-amber-900 dark:text-amber-400 mb-2">{language === 'ar' ? 'ذكاء اصطناعي' : 'AI Powered'}</h4>
                            <p className="text-sm text-foreground/70">
                              {language === 'ar' 
                                ? 'معالجة متقدمة للبيانات باستخدام نماذج Gemini الحديثة.' 
                                : 'Advanced data processing using modern Gemini models.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="data">
                  <Card className="border-none shadow-sm overflow-hidden bg-card">
                    <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b">
                      <div>
                        <CardTitle>{language === 'ar' ? 'مستعرض البيانات' : 'Data Explorer'}</CardTitle>
                        <CardDescription>{language === 'ar' ? 'البحث والتصفية في جميع السجلات' : 'Search and filter through all records'}</CardDescription>
                      </div>
                      <div className="relative">
                        <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
                        <Input 
                          placeholder={t('searchPlaceholder')} 
                          className={`${isRtl ? 'pr-9' : 'pl-9'} w-full md:w-[300px] bg-muted border-none focus-visible:ring-primary`}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto max-h-[600px]">
                        <Table>
                          <TableHeader className="bg-muted/50 sticky top-0 z-10">
                            <TableRow>
                              {columns.map((col, idx) => (
                                <TableHead key={idx} className={`font-bold text-foreground whitespace-nowrap ${isRtl ? 'text-right' : 'text-left'}`}>
                                  {col.name}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredData.length > 0 ? (
                              filteredData.map((row, rowIdx) => (
                                <TableRow key={rowIdx} className="hover:bg-muted/30 transition-colors">
                                  {columns.map((col, colIdx) => (
                                    <TableCell key={colIdx} className={`whitespace-nowrap ${col.type === 'number' ? 'font-mono text-right' : ''} ${isRtl ? 'text-right' : 'text-left'}`}>
                                      {col.type === 'number' ? Number(row[col.name] || 0).toLocaleString() : String(row[col.name] || '')}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground italic">
                                  {t('noResults')}
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

      <footer className="border-t bg-background py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" />
            <span>{language === 'ar' ? 'بدعم من ذكاء Gemini' : 'Powered by Gemini AI'}</span>
          </div>
          <p dir="ltr">&copy; 2026 {t('appTitle')} Analytics. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
