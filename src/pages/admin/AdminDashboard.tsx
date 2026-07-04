import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, BedDouble, Calendar, Stethoscope, DollarSign, AlertTriangle,
  Video, Activity, TrendingUp, Clock, ArrowRight, UserCheck, HeartPulse
} from 'lucide-react';
import { analyticsApi, appointmentsApi, bedsApi, otsApi } from '../../lib/api';
import { StatCard, Card, CardHeader, Skeleton, StatusBadge } from '../../components/ui';
import { formatCurrency, formatNumber, formatDate, timeAgo } from '../../lib/utils';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export function AdminDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: analyticsApi.getDashboardStats,
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['admin-appointments-recent'],
    queryFn: () => appointmentsApi.getAll(),
  });

  const { data: beds = [] } = useQuery({
    queryKey: ['beds'],
    queryFn: bedsApi.getAll,
  });

  const { data: ots = [] } = useQuery({
    queryKey: ['ots'],
    queryFn: otsApi.getAll,
  });

  const recentAppointments = appointments.slice(0, 5);

  // Generate chart data from appointments
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayAppts = appointments.filter(a => a.appointment_date === dateStr);
    return {
      date: d.toLocaleDateString('en-US', { weekday: 'short' }),
      appointments: dayAppts.length,
      completed: dayAppts.filter(a => a.status === 'completed').length,
      cancelled: dayAppts.filter(a => a.status === 'cancelled').length,
    };
  });

  const bedStatusData = [
    { name: 'Available', value: beds.filter(b => b.status === 'available').length, color: '#10b981' },
    { name: 'Occupied', value: beds.filter(b => b.status === 'occupied').length, color: '#f43f5e' },
    { name: 'Reserved', value: beds.filter(b => b.status === 'reserved').length, color: '#f59e0b' },
    { name: 'Cleaning', value: beds.filter(b => b.status === 'cleaning').length, color: '#64748b' },
    { name: 'Maintenance', value: beds.filter(b => b.status === 'maintenance').length, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  const otStatusData = [
    { name: 'Available', value: ots.filter(o => o.status === 'available').length, color: '#10b981' },
    { name: 'Occupied', value: ots.filter(o => o.status === 'occupied').length, color: '#f43f5e' },
    { name: 'Maintenance', value: ots.filter(o => o.status === 'maintenance').length, color: '#f59e0b' },
    { name: 'Emergency', value: ots.filter(o => o.status === 'emergency').length, color: '#dc2626' },
  ].filter(d => d.value > 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-slate-500">Hospital overview and analytics</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-slate-500">Hospital overview and analytics</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">{formatDate(new Date(), 'long')}</p>
          <p className="text-xs text-slate-400">Last updated {timeAgo(new Date())}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard label="Total Patients" value={formatNumber(stats?.totalPatients || 0)} icon={<Users className="w-5 h-5" />} color="primary" trend={{ value: '12%', positive: true }} />
        <StatCard label="Total Doctors" value={formatNumber(stats?.totalDoctors || 0)} icon={<Stethoscope className="w-5 h-5" />} color="cyan" />
        <StatCard label="Today's Appointments" value={formatNumber(stats?.todayAppointments || 0)} icon={<Calendar className="w-5 h-5" />} color="emerald" trend={{ value: '8%', positive: true }} />
        <StatCard label="Available Beds" value={formatNumber(stats?.bedsAvailable || 0)} icon={<BedDouble className="w-5 h-5" />} color="amber" subtitle={`${stats?.bedsOccupied || 0} occupied`} />
        <StatCard label="Emergency Cases" value={formatNumber(stats?.emergencyCases || 0)} icon={<AlertTriangle className="w-5 h-5" />} color="rose" />
        <StatCard label="Video Consultations" value={formatNumber(stats?.videoConsultations || 0)} icon={<Video className="w-5 h-5" />} color="cyan" />
        <StatCard label="Total Revenue" value={formatCurrency(stats?.revenue || 0)} icon={<DollarSign className="w-5 h-5" />} color="emerald" trend={{ value: '15%', positive: true }} />
        <StatCard label="Pending Approvals" value={formatNumber(stats?.pendingAppointments || 0)} icon={<Clock className="w-5 h-5" />} color="amber" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title="Appointment Trends" subtitle="Last 7 days" icon={<TrendingUp className="w-5 h-5" />} />
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={last7Days}>
              <defs>
                <linearGradient id="colorAppts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff' }} />
              <Area type="monotone" dataKey="appointments" stroke="#3b82f6" fill="url(#colorAppts)" strokeWidth={2} />
              <Area type="monotone" dataKey="completed" stroke="#10b981" fill="url(#colorCompleted)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardHeader title="Bed Status" subtitle="Real-time" icon={<BedDouble className="w-5 h-5" />} />
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={bedStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                {bedStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Appointments */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Appointments"
            subtitle="Latest booking activity"
            icon={<Calendar className="w-5 h-5" />}
            action={<button onClick={() => navigate('/admin/appointments')} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">View all <ArrowRight className="w-3.5 h-3.5" /></button>}
          />
          <div className="space-y-2">
            {recentAppointments.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No appointments yet</p>
            ) : recentAppointments.map((appt) => (
              <div key={appt.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                  {appt.patient?.profile?.full_name?.[0] || 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{appt.patient?.profile?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500 truncate">{appt.doctor?.profile?.full_name} • {appt.reason}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{formatDate(appt.appointment_date)} {appt.appointment_time}</p>
                  <StatusBadge status={appt.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* OT Status */}
        <Card>
          <CardHeader title="Operation Theatres" subtitle="Live status" icon={<Stethoscope className="w-5 h-5" />} />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={otStatusData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" horizontal={false} />
              <XAxis type="number" stroke="#94a3b8" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} width={80} />
              <Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: 'none', borderRadius: '12px', color: '#fff' }} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {otStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {ots.slice(0, 3).map((ot) => (
              <div key={ot.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{ot.ot_number}</span>
                <StatusBadge status={ot.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader title="Quick Actions" icon={<Activity className="w-5 h-5" />} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Manage Beds', icon: BedDouble, route: '/admin/beds', color: 'from-amber-500 to-orange-500' },
            { label: 'Operation Theatres', icon: Stethoscope, route: '/admin/operation-theatres', color: 'from-rose-500 to-pink-500' },
            { label: 'View Doctors', icon: UserCheck, route: '/admin/doctors', color: 'from-primary-500 to-cyan-500' },
            { label: 'Analytics', icon: TrendingUp, route: '/admin/analytics', color: 'from-emerald-500 to-teal-500' },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => navigate(action.route)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md transition-all group"
            >
              <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} text-white group-hover:scale-110 transition-transform`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
