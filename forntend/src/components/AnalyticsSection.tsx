import { useState } from "react";
import { TrendingUp, Activity, Shield, AlertTriangle, Globe, AreaChart as AreaChartIcon, Download, FileJson } from "lucide-react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from "recharts";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Button } from "@/components/ui/button";

const AnalyticsSection = () => {
  const { isAuthenticated } = useAuth();
  const { stats, changes, trend, forecast, isLoading, error, mlServiceStatus } = useDashboardData();
  const [demoData, setDemoData] = useState<{
    stats: any,
    changes: any,
    trend: any[], 
    forecast: any[]
  } | null>(null);

  const activeStats = demoData ? demoData.stats : stats;
  const activeChanges = demoData ? demoData.changes : changes;
  const activeTrend = demoData ? demoData.trend : trend;
  const activeForecast = demoData ? demoData.forecast : forecast;
  const normalizedTrend = (activeTrend || []).map((item: any) => {
    const safe = Number(item?.safe ?? item?.safe_emails ?? item?.probabilities?.safe ?? 0);
    const suspicious = Number(item?.suspicious ?? item?.phishing ?? item?.phishing_alerts ?? item?.suspicious_incidents ?? item?.probabilities?.suspicious ?? 0);
    const spam = Number(item?.spam ?? item?.scam ?? item?.scam_detected ?? item?.probabilities?.spam ?? 0);
    return {
      ...item,
      safe,
      suspicious,
      spam,
      total: Number(item?.total ?? (safe + suspicious + spam))
    };
  });
  const hasTrendData = normalizedTrend.some((d: any) => d.safe > 0 || d.suspicious > 0 || d.spam > 0);

  const toggleDemoData = () => {
    if (demoData) {
      setDemoData(null);
    } else {
      const now = new Date();
      
      const mockStats = {
        total_analyzed: 1284,
        scam_detected: 432,
        suspicious_incidents: 156,
        safe_emails: 696
      };

      const mockChanges = {
        total_change: 12.4,
        scam_change: -5.2,
        phishing_change: 8.1,
        safe_change: 15.3,
        is_increase: {
          total: true,
          spam: false,
          phishing: true,
          safe: true
        }
      };

      const mockTrend = Array.from({ length: 14 }).map((_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (13 - i));
        return {
          date: d.toISOString().split('T')[0],
          spam: Math.floor(Math.random() * 5) + 2,
          suspicious: Math.floor(Math.random() * 8) + 1,
          safe: Math.floor(Math.random() * 20) + 10,
          total: 30 + Math.floor(Math.random() * 10)
        };
      });
      
      const mockForecast = Array.from({ length: 3 }).map((_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() + i + 1);
        return {
          date: d.toISOString().split('T')[0],
          predicted_spam: 4 + i,
          predicted_suspicious: 6 - i,
          risk_level: i === 0 ? "elevated" : "stable"
        };
      });
      
      setDemoData({ 
        stats: mockStats, 
        changes: mockChanges, 
        trend: mockTrend, 
        forecast: mockForecast 
      });
    }
  };

  const exportData = (format: 'csv' | 'json') => {
    const dataToExport = activeTrend;
    if (!dataToExport || dataToExport.length === 0) return;
    
    let content = "";
    let filename = `threat_report_${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      const headers = "Date,Total,Spam,Suspicious,Safe\n";
      const rows = trend.map(d => `${d.date},${d.total},${d.spam},${d.suspicious},${d.safe}`).join("\n");
      content = headers + rows;
      filename += ".csv";
    } else {
      content = JSON.stringify({ stats, trend, forecast }, null, 2);
      filename += ".json";
    }

    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) return null;

  const statConfig = [
    { label: "Total Analyzed", key: "total_analyzed", changeKey: "total_change", isIncreaseKey: "total", icon: Activity, color: "text-white" },
    { label: "Spam / Blocked", key: "scam_detected", changeKey: "scam_change", isIncreaseKey: "spam", icon: Shield, color: "text-red-500" },
    { label: "Suspicious", key: "suspicious_incidents", changeKey: "phishing_change", isIncreaseKey: "phishing", icon: AlertTriangle, color: "text-amber-500" },
    { label: "Safe Emails", key: "safe_emails", changeKey: "safe_change", isIncreaseKey: "safe", icon: Globe, color: "text-success" }
  ];

  const formatPercentage = (val: number) => {
    return `${val > 0 ? '+' : ''}${val}%`;
  };

  const Skeleton = () => (
    <div className="h-10 w-24 bg-white/10 animate-pulse rounded" />
  );

  return <section id="analytics" className="py-32 relative bg-black overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header - Reference Style */}
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-6xl font-display font-extrabold text-white tracking-tighter mb-4 italic uppercase">
            Neural <span className="text-primary not-italic">Intelligence</span>
          </h2>
          <div className="w-24 h-1 bg-primary mx-auto mb-12 magenta-glow" />
        </div>

        {/* Stats Grid - Bento Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {statConfig.map((config, index) => {
            const value = (activeStats as any)?.[config.key] ?? 0;
            const change = (activeChanges as any)?.[config.changeKey] ?? 0;
            const isIncrease = (activeChanges?.is_increase as any)?.[config.isIncreaseKey] ?? true;
            const Icon = config.icon;

            return (
              <div key={config.label} className="bento-item group" style={{
                animationDelay: `${index * 0.1}s`
              }}>
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <Icon className="w-6 h-6 text-primary magenta-text-glow" />
                  </div>
                  <div className={`px-3 py-1 rounded-full border transition-colors ${
                    isIncrease ? 'bg-primary/10 border-primary/20' : 'bg-red-500/10 border-red-500/20'
                  }`}>
                    <span className={`text-[10px] font-black uppercase tracking-tighter ${
                      isIncrease ? 'text-primary' : 'text-red-500'
                    }`}>
                      {isLoading ? "..." : formatPercentage(change)}
                    </span>
                  </div>
                </div>
                <div className={`text-4xl font-display font-black tracking-tighter mb-2 italic ${config.color}`}>
                  {isLoading ? <Skeleton /> : value}
                </div>
                <div className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em]">
                  {config.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Grid - Reference Style */}
        <div className="grid lg:grid-cols-1 gap-8">
          <div className="glass-card rounded-2xl p-8 border-white/5 relative overflow-hidden group min-h-[450px]">
            <div className="absolute top-0 right-0 p-6 flex items-center gap-4">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`h-7 text-[8px] uppercase tracking-widest border-white/10 ${demoData ? 'bg-primary/20 text-primary border-primary/50' : 'hover:bg-white/5'}`}
                  onClick={toggleDemoData}
                >
                  {demoData ? 'Live Data' : 'Demo Mode'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-[8px] uppercase tracking-widest border-white/10 hover:bg-white/5"
                  onClick={() => exportData('csv')}
                  disabled={!activeTrend || activeTrend.length === 0}
                >
                  <Download className="w-3 h-3 mr-2" />
                  CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-[8px] uppercase tracking-widest border-white/10 hover:bg-white/5"
                  onClick={() => exportData('json')}
                  disabled={!activeTrend || activeTrend.length === 0}
                >
                  <FileJson className="w-3 h-3 mr-2" />
                  JSON
                </Button>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                error ? 'bg-gray-500' : 'bg-primary animate-pulse shadow-[0_0_8px_#ff3399]'
              }`} />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-10 flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              Threat Velocity Trend
            </h3>
            
            <div className="h-[300px] w-full relative">
              {isLoading ? (
                <div className="absolute inset-0 flex items-end justify-between px-4 pb-8">
                  {[...Array(14)].map((_, i) => (
                    <div key={i} className="w-4 bg-white/5 animate-pulse rounded-t" style={{ height: `${20 + Math.random() * 60}%` }} />
                  ))}
                </div>
              ) : (mlServiceStatus === 'unavailable') ? (
                <div className="absolute inset-0 flex items-center justify-center text-white/40 font-bold uppercase tracking-widest text-xs text-center px-12 leading-relaxed">
                  No data available.
                </div>
              ) : (!normalizedTrend.length || !hasTrendData) ? (
                <div className="absolute inset-0 flex items-center justify-center text-white/40 font-bold uppercase tracking-widest text-xs text-center px-12 leading-relaxed">
                  No classification data yet. <br /> Analyze some emails to see your threat trend.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={normalizedTrend}>
                    <defs>
                      <linearGradient id="colorSpam" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff0033" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ff0033" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSuspicious" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff8800" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ff8800" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSafe" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00cc66" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#00cc66" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#ffffff20" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis 
                      stroke="#ffffff20" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0a0a0a', 
                        borderColor: '#ffffff10',
                        borderRadius: '12px',
                        fontSize: '10px',
                        color: '#fff'
                      }}
                      itemStyle={{ padding: '2px 0' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      height={36}
                      iconType="circle"
                      iconSize={6}
                      wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="spam" 
                      name="Spam"
                      stroke="#ff0033" 
                      fillOpacity={1}
                      fill="url(#colorSpam)" 
                      strokeWidth={3}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="suspicious" 
                      name="Suspicious"
                      stroke="#ff8800" 
                      fillOpacity={1}
                      fill="url(#colorSuspicious)" 
                      strokeWidth={3}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="safe" 
                      name="Safe"
                      stroke="#00cc66" 
                      fillOpacity={1}
                      fill="url(#colorSafe)" 
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Predictive Modeling Widget (Fix: Feature Set) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {activeForecast && activeForecast.length > 0 ? (
            activeForecast.map((item, idx) => (
              <div key={item.date} className="glass-card rounded-xl p-6 border-white/5 relative group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                    {new Date(item.date).toLocaleDateString('en-US', { weekday: 'long' })}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${item.risk_level === 'elevated' ? 'bg-red-500 animate-pulse' : 'bg-primary'}`} />
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-2xl font-display font-black text-white tracking-tighter italic">
                        {item.predicted_spam}
                      </div>
                      <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                        Forecasted Spam
                      </div>
                    </div>
                    <Shield className={`w-5 h-5 ${item.risk_level === 'elevated' ? 'text-red-500' : 'text-primary'}`} />
                  </div>
                  <div className="pt-4 border-t border-white/5">
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-tight">
                      Predicted Risk: <span className={item.risk_level === 'elevated' ? 'text-red-500' : 'text-primary'}>{item.risk_level.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 py-12 glass-card rounded-xl border-white/5 text-center">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                Neural forecast requires historical data
              </p>
            </div>
          )}
        </div>
      </div>
    </section>;
};

export default AnalyticsSection;
