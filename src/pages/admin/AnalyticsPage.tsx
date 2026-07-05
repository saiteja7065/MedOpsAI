import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, Activity, BedDouble, Stethoscope, Video, AlertTriangle, Sparkles } from 'lucide-react';
import { analyticsApi, appointmentsApi, bedsApi, otsApi, doctorsApi, patientsApi, forecastApi } from '../../lib/api';
import { Card, CardHeader, Skeleton, StatCard, Button } from '../../components/ui';
import { formatCurrency, formatNumber, formatDate } from '../../lib/utils';
import { groupByWeek, forecastWeeklyVolume } from '../../lib/forecast';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar
} from 'recharts';

const WEEKS_AHEAD = 4;

export function AnalyticsPage() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: analyticsApi.getDashboardStats });
  const { data: appointments = [] } = useQuery({ queryKey: ['appointments-all'], queryFn: () => appointmentsApi.getAll({ includeHistorical: true }) });
  const { data: beds = [] } = useQuery({ queryKey: ['beds'], queryFn: bedsApi.getAll });
  const { data: ots = [] } = useQuery({ queryKey: ['ots'], queryFn: otsApi.getAll });
  const { data: doctors = [] } = useQuery({ queryKey: ['doctors'], queryFn: () => doctorsApi.getAll() });
  const [insight, setInsight] = useState<string | null>(null);

  // Monthly data (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.getMonth();
    const year = d.getFullYear();
    const monthAppts = appointments.filter(a => {
      const ad = new Date(a.appointment_date);
      return ad.getMonth() === month && ad.getFullYear() === year;
    });
    return {
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      appointments: monthAppts.length,
      revenue: monthAppts.filter(a => a.status === 'completed').reduce((s, a) => s + Number(a.fee || 0), 0),
      patients: Math.floor(monthAppts.length * 0.7),
    };
  });

  // Appointment status distribution
  const statusData = [
    { name: 'Completed', value: appointments.filter(a => a.status === 'completed').length, color: '#10b981' },
    { name: 'Pending', value: appointments.filter(a => a.status === 'pending').length, color: '#f59e0b' },
    { name: 'Confirmed', value: appointments.filter(a => a.status === 'confirmed').length, color: '#3b82f6' },
    { name: 'Cancelled', value: appointments.filter(a => a.status === 'cancelled').length, color: '#f43f5e' },
    { name: 'Missed', value: appointments.filter(a => a.status === 'missed').length, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  // Bed occupancy radial
  const bedOccupancy = stats && stats.totalBeds > 0 ? Math.round((stats.bedsOccupied / stats.totalBeds) * 100) : 0;
  const otUtilization = stats && stats.totalOTs > 0 ? Math.round((stats.otsOccupied / stats.totalOTs) * 100) : 0;

  // Doctor performance
  const doctorPerf = doctors.slice(0, 5).map(d => ({
    name: d.profile?.full_name?.split(' ')[0] || 'Dr',
    consultations: d.total_consultations,
    rating: d.rating,
  }));

  // Demand forecast — a real linear-trend fit over historical weekly appointment
  // volume, not an LLM guess. See lib/forecast.ts for the "rules decide" half
  // of the split; the AI Insight button below is the "AI narrates" half.
  const todayStr = new Date().toISOString().split('T')[0];
  const historicalDates = appointments.filter(a => a.appointment_date <= todayStr).map(a => a.appointment_date);
  const weeklyHistory = groupByWeek(historicalDates);
  const forecast = forecastWeeklyVolume(weeklyHistory, WEEKS_AHEAD);
  const lastHistoricalIdx = forecast.points.findIndex(p => p.isForecast) - 1;
  const forecastChartData = forecast.points.map((p, i) => ({
    label: formatDate(p.weekStart, 'short').split(',')[0],
    historical: p.isForecast ? null : p.value,
    forecast: (p.isForecast || i === lastHistoricalIdx) ? p.value : null,
  }));
  const lastHistoricalCount = weeklyHistory[weeklyHistory.length - 1]?.count;
  const lastForecastCount = forecast.points[forecast.points.length - 1]?.value;
  const projectedBedDemand = Math.min(100, Math.round(bedOccupancy * (1 + forecast.weeklyGrowthRate * WEEKS_AHEAD)));

  const insightMutation = useMutation({
    mutationFn: () => forecastApi.narrate({
      weeklyGrowthRate: forecast.weeklyGrowthRate,
      projectedGrowthPct: forecast.projectedGrowthPct,
      trend: forecast.trend,
      weeksAhead: WEEKS_AHEAD,
      lastHistoricalCount,
      lastForecastCount,
    }),
    onSuccess: (text) => setInsight(text),
  });

  const TrendIcon = forecast.trend === 'rising' ? TrendingUp : forecast.trend === 'falling' ? TrendingDown : Minus;

  if (isLoading) {
    return <div className="space-y-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-slate-500">Hospital performance insights</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={formatCurrency(stats?.revenue || 0)} icon={<DollarSign className="w-5 h-5" />} color="emerald" trend={{ value: '15%', positive: true }} />
        <StatCard label="Total Appointments" value={formatNumber(stats?.totalAppointments || 0)} icon={<Activity className="w-5 h-5" />} color="primary" trend={{ value: '8%', positive: true }} />
        <StatCard label="Bed Occupancy" value={`${bedOccupancy}%`} icon={<BedDouble className="w-5 h-5" />} color="amber" />
        <StatCard label="OT Utilization" value={`${otUtilization}%`} icon={<Stethoscope className="w-5 h-5" />} color="rose" />
      </div>

      {/* Demand Forecast */}
      <Card>
        <CardHeader
          title="Demand Forecast"
          subtitle={`Weekly appointment volume — ${weeklyHistory.length} weeks of history, ${WEEKS_AHEAD}-week projection`}
          icon={<TrendIcon className="w-5 h-5" />}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={forecastChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="historical" name="Historical" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-500 mb-1">Trend</p>
              <p className="font-semibold capitalize flex items-center gap-1.5">
                <TrendIcon className="w-4 h-4" /> {forecast.trend} · {forecast.projectedGrowthPct >= 0 ? '+' : ''}{forecast.projectedGrowthPct.toFixed(0)}% in {WEEKS_AHEAD}wk
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <p className="text-xs text-slate-500 mb-1">Projected bed demand</p>
              <p className="font-semibold">{projectedBedDemand}% occupancy</p>
              <p className="text-xs text-slate-400 mt-0.5">Derived from the appointment-volume trend — beds have no independent history to model on their own.</p>
            </div>
            <Button size="sm" variant="secondary" className="w-full" icon={<Sparkles className="w-3.5 h-3.5" />} loading={insightMutation.isPending} onClick={() => insightMutation.mutate()}>
              Get AI Insight
            </Button>
            {insight && (
              <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-sm text-slate-700 dark:text-slate-300">
                {insight}
              </div>
            )}
            {insightMutation.isError && (
              <p className="text-xs text-rose-600">{(insightMutation.error as Error).message}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Revenue & Appointments Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Revenue Trend" subtitle="Last 6 months" icon={<DollarSign className="w-5 h-5" />} />
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff' }} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#colorRev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Patient Growth" subtitle="Last 6 months" icon={<Users className="w-5 h-5" />} />
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff' }} />
              <Line type="monotone" dataKey="patients" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="appointments" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Appointment Status & Doctor Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Appointment Status" subtitle="Distribution" icon={<Activity className="w-5 h-5" />} />
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Doctor Performance" subtitle="Top 5 by consultations" icon={<TrendingUp className="w-5 h-5" />} />
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={doctorPerf} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={80} />
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff' }} />
              <Bar dataKey="consultations" fill="#3b82f6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Occupancy Radial */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Bed Occupancy" subtitle={`${bedOccupancy}% occupied`} icon={<BedDouble className="w-5 h-5" />} />
          <div className="relative" style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="50%" outerRadius="90%" data={[{ name: 'Occupancy', value: bedOccupancy, fill: '#f59e0b' }]} startAngle={90} endAngle={-270}>
                <RadialBar background dataKey="value" cornerRadius={10} />
                <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-3xl font-bold">{bedOccupancy}%</p>
              <p className="text-sm text-slate-500">Occupied</p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="OT Utilization" subtitle={`${otUtilization}% in use`} icon={<Stethoscope className="w-5 h-5" />} />
          <div className="relative" style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="50%" outerRadius="90%" data={[{ name: 'Utilization', value: otUtilization, fill: '#f43f5e' }]} startAngle={90} endAngle={-270}>
                <RadialBar background dataKey="value" cornerRadius={10} />
                <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff' }} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-3xl font-bold">{otUtilization}%</p>
              <p className="text-sm text-slate-500">In Use</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
