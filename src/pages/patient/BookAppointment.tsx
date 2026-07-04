import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar, Stethoscope, ArrowRight, ArrowLeft, Clock, CheckCircle,
  Search, HeartPulse, Brain, Bone, Wind, Hand, Ear, Eye,
  Thermometer, Droplet, BatteryLow, Activity, CreditCard, Lock,
  CheckCircle2, CalendarClock, User, Building2, Sparkles, Loader2,
  AlertCircle, Video, MapPin
} from 'lucide-react';
import { doctorsApi, departmentsApi, appointmentsApi, patientsApi, healthProblemsApi, slotsApi } from '../../lib/api';
import { useAuthStore } from '../../store/auth';
import { Card, CardHeader, Button, Skeleton, Avatar, Badge } from '../../components/ui';
import { cn, formatDate, formatCurrency } from '../../lib/utils';
import type { HealthProblem } from '../../types';

type Step = 'problem' | 'department' | 'doctor' | 'datetime' | 'review' | 'payment' | 'confirmation';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'heart-pulse': HeartPulse,
  'brain': Brain,
  'bone': Bone,
  'stomach': Activity,
  'wind': Wind,
  'hand': Hand,
  'ear': Ear,
  'eye': Eye,
  'thermometer': Thermometer,
  'droplet': Droplet,
  'battery-low': BatteryLow,
  'activity': Activity,
  'stethoscope': Stethoscope,
};

export function BookAppointment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [step, setStep] = useState<Step>('problem');
  const [search, setSearch] = useState('');
  const [selectedProblem, setSelectedProblem] = useState<HealthProblem | null>(null);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [type, setType] = useState<'in_person' | 'video'>('in_person');
  const [reason, setReason] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [confirmedAppt, setConfirmedAppt] = useState<any>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const { data: patient } = useQuery({
    queryKey: ['patient-profile', user?.id],
    queryFn: () => patientsApi.getByProfileId(user!.id),
    enabled: !!user,
  });

  const { data: healthProblems = [], isLoading: problemsLoading } = useQuery({
    queryKey: ['health-problems'],
    queryFn: healthProblemsApi.getAll,
  });

  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: departmentsApi.getAll });

  const { data: doctors = [], isLoading: doctorsLoading } = useQuery({
    queryKey: ['doctors', selectedDept],
    queryFn: () => doctorsApi.getAll({ department_id: selectedDept || undefined }),
    enabled: !!selectedDept,
  });

  const selectedDoctorObj = useMemo(() => doctors.find(d => d.id === selectedDoctor), [doctors, selectedDoctor]);

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['available-slots', selectedDoctor, appointmentDate],
    queryFn: () => slotsApi.getAvailableSlots(selectedDoctor, appointmentDate),
    enabled: !!selectedDoctor && !!appointmentDate,
  });

  // Auto-select department when problem is selected
  useEffect(() => {
    if (selectedProblem) {
      setSelectedDept(selectedProblem.department_id);
    }
  }, [selectedProblem]);

  const filteredProblems = useMemo(() => {
    if (!search) return healthProblems;
    return healthProblems.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [healthProblems, search]);

  const groupedProblems = useMemo(() => {
    const groups: Record<string, HealthProblem[]> = {};
    filteredProblems.forEach(p => {
      const cat = p.category || 'general';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [filteredProblems]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const apptNumber = `APT-${Date.now().toString().slice(-6)}`;
      return appointmentsApi.create({
        appointment_number: apptNumber,
        patient_id: patient!.id,
        doctor_id: selectedDoctor,
        department_id: selectedDept || undefined,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        type,
        status: 'confirmed',
        priority: 'normal',
        reason: reason || selectedProblem?.name || 'General consultation',
        symptoms: [selectedProblem?.name || ''],
        fee: selectedDoctorObj?.consultation_fee || 500,
        is_paid: true,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['available-slots'] });
      setConfirmedAppt(data);
      setStep('confirmation');
    },
    onError: (err: any) => {
      setBookingError(err.message || 'Failed to create appointment');
      setPaymentProcessing(false);
    },
  });

  const handlePayment = () => {
    setPaymentProcessing(true);
    setBookingError(null);
    // Simulate payment processing
    setTimeout(() => {
      createMutation.mutate();
    }, 1800);
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'problem', label: 'Health Problem' },
    { key: 'doctor', label: 'Choose Doctor' },
    { key: 'datetime', label: 'Date & Time' },
    { key: 'review', label: 'Review' },
    { key: 'payment', label: 'Payment' },
    { key: 'confirmation', label: 'Done' },
  ];
  const currentStepIndex = steps.findIndex(s => s.key === step);

  const canProceedFromProblem = !!selectedProblem;
  const canProceedFromDoctor = !!selectedDoctor;
  const canProceedFromDateTime = !!appointmentDate && !!appointmentTime;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Book Appointment</h1>
        <p className="text-slate-500">Find the right doctor in a few simple steps</p>
      </div>

      {/* Progress Bar */}
      {step !== 'confirmation' && (
        <div className="flex items-center gap-1">
          {steps.slice(0, -1).map((s, i) => (
            <div key={s.key} className="flex items-center flex-1">
              <div className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                i < currentStepIndex ? 'bg-emerald-500 text-white' :
                i === currentStepIndex ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30' :
                'bg-slate-100 dark:bg-slate-800 text-slate-400'
              )}>
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0',
                  i < currentStepIndex ? 'bg-white/20' : i === currentStepIndex ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
                )}>
                  {i < currentStepIndex ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className="hidden md:inline whitespace-nowrap">{s.label}</span>
              </div>
              {i < steps.length - 2 && (
                <div className={cn('flex-1 h-0.5 mx-1 rounded-full transition-colors', i < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700')} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step: Problem Selection */}
      {step === 'problem' && (
        <Card>
          <CardHeader
            title="What health problem are you experiencing?"
            subtitle="Select your symptoms and we'll find the right department"
            icon={<Activity className="w-5 h-5" />}
          />
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search symptoms or health problems..."
                className="input pl-10"
                autoFocus
              />
            </div>

            {problemsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
              </div>
            ) : Object.keys(groupedProblems).length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p>No health problems found. Try a different search.</p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[450px] overflow-y-auto pr-1">
                {Object.entries(groupedProblems).map(([category, problems]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                      {category}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {problems.map(problem => {
                        const Icon = ICON_MAP[problem.icon] || Activity;
                        const isSelected = selectedProblem?.id === problem.id;
                        return (
                          <button
                            key={problem.id}
                            onClick={() => setSelectedProblem(problem)}
                            className={cn(
                              'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                              isSelected
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
                            )}
                          >
                            <div className={cn(
                              'p-2.5 rounded-xl flex-shrink-0 transition-colors',
                              isSelected ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            )}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{problem.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{problem.description}</p>
                              <div className="flex items-center gap-1 mt-2">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-400">{problem.department?.name || 'General'}</span>
                              </div>
                            </div>
                            {isSelected && <CheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                onClick={() => setStep('doctor')}
                disabled={!canProceedFromProblem}
                icon={<ArrowRight className="w-4 h-4" />}
                className="flex-1"
              >
                Continue
              </Button>
              <Button variant="ghost" onClick={() => navigate(-1)} icon={<ArrowLeft className="w-4 h-4" />}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step: Doctor Selection */}
      {step === 'doctor' && (
        <Card>
          <CardHeader
            title="Choose Your Doctor"
            subtitle={`${departments.find(d => d.id === selectedDept)?.name || 'General'} Department`}
            icon={<Stethoscope className="w-5 h-5" />}
          />
          <div className="space-y-3">
            {selectedProblem && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800">
                <div className="p-1.5 rounded-lg bg-primary-500 text-white">
                  {(() => {
                    const Icon = ICON_MAP[selectedProblem.icon] || Activity;
                    return <Icon className="w-4 h-4" />;
                  })()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary-700 dark:text-primary-300">{selectedProblem.name}</p>
                  <p className="text-xs text-primary-500 dark:text-primary-400">Auto-mapped to {selectedProblem.department?.name}</p>
                </div>
                <button
                  onClick={() => { setSelectedProblem(null); setSelectedDept(''); setStep('problem'); }}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium underline"
                >
                  Change
                </button>
              </div>
            )}

            {doctorsLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                <p className="text-slate-500">No doctors available in this department.</p>
                <Button variant="ghost" size="sm" onClick={() => setStep('problem')} className="mt-3">Go back</Button>
              </div>
            ) : (
              doctors.map(doc => {
                const isSelected = selectedDoctor === doc.id;
                return (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDoctor(doc.id)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                      isSelected
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
                    )}
                  >
                    <Avatar name={doc.profile?.full_name || 'D'} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{doc.profile?.full_name}</p>
                      <p className="text-sm text-slate-500">{doc.specialization}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" /> {doc.experience_years} yrs exp
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Sparkles className="w-3 h-3 text-amber-500" /> {doc.rating}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <User className="w-3 h-3" /> {doc.total_consultations} consults
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-primary-600 dark:text-primary-400">{formatCurrency(doc.consultation_fee)}</p>
                      <p className="text-xs text-slate-400">consultation</p>
                    </div>
                    {isSelected && <CheckCircle className="w-5 h-5 text-primary-500 flex-shrink-0" />}
                  </button>
                );
              })
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                onClick={() => setStep('datetime')}
                disabled={!canProceedFromDoctor}
                icon={<ArrowRight className="w-4 h-4" />}
                className="flex-1"
              >
                Continue
              </Button>
              <Button variant="ghost" onClick={() => setStep('problem')} icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step: Date & Time */}
      {step === 'datetime' && (
        <Card>
          <CardHeader
            title="Select Date & Time"
            subtitle={selectedDoctorObj ? `Dr. ${selectedDoctorObj.profile?.full_name}` : ''}
            icon={<CalendarClock className="w-5 h-5" />}
          />
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Appointment Date</label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => { setAppointmentDate(e.target.value); setAppointmentTime(''); }}
                min={new Date().toISOString().split('T')[0]}
                className="input"
              />
            </div>

            {appointmentDate && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Available Time Slots
                  {slotsLoading && <span className="ml-2 text-xs text-slate-400">Loading...</span>}
                </label>
                {slotsLoading ? (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-8 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-500">No available slots on this date.</p>
                    <p className="text-xs text-slate-400 mt-1">The doctor may not be available on this day. Try another date.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                      {slots.map(slot => (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && setAppointmentTime(slot.time)}
                          disabled={!slot.available}
                          className={cn(
                            'px-3 py-2.5 rounded-lg text-sm font-medium border-2 transition-all text-center',
                            !slot.available
                              ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-slate-300 dark:text-slate-600 cursor-not-allowed line-through'
                              : appointmentTime === slot.time
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/10'
                          )}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-primary-500 bg-primary-50" /> Available</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-slate-200 bg-slate-50" /> Booked</span>
                    </div>
                  </>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Consultation Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setType('in_person')}
                  className={cn(
                    'p-4 rounded-xl border-2 flex items-center gap-3 transition-all',
                    type === 'in_person' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  )}
                >
                  <div className={cn('p-2 rounded-lg', type === 'in_person' ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500')}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">In Person</p>
                    <p className="text-xs text-slate-500">Visit the hospital</p>
                  </div>
                </button>
                <button
                  onClick={() => setType('video')}
                  className={cn(
                    'p-4 rounded-xl border-2 flex items-center gap-3 transition-all',
                    type === 'video' ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  )}
                >
                  <div className={cn('p-2 rounded-lg', type === 'video' ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500')}>
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Video Call</p>
                    <p className="text-xs text-slate-500">From your home</p>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Reason for Visit (optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input"
                rows={2}
                placeholder={selectedProblem ? `Describe your ${selectedProblem.name.toLowerCase()} symptoms...` : 'Describe your concern...'}
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                onClick={() => setStep('review')}
                disabled={!canProceedFromDateTime}
                icon={<ArrowRight className="w-4 h-4" />}
                className="flex-1"
              >
                Review Appointment
              </Button>
              <Button variant="ghost" onClick={() => setStep('doctor')} icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step: Review */}
      {step === 'review' && (
        <Card>
          <CardHeader title="Review Appointment Details" icon={<CheckCircle2 className="w-5 h-5" />} />
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                <Avatar name={selectedDoctorObj?.profile?.full_name || 'D'} size="lg" />
                <div>
                  <p className="font-semibold">{selectedDoctorObj?.profile?.full_name}</p>
                  <p className="text-sm text-slate-500">{selectedDoctorObj?.specialization}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ReviewItem icon={<Activity className="w-4 h-4" />} label="Health Problem" value={selectedProblem?.name || 'General'} />
                <ReviewItem icon={<Building2 className="w-4 h-4" />} label="Department" value={departments.find(d => d.id === selectedDept)?.name || 'General'} />
                <ReviewItem icon={<Calendar className="w-4 h-4" />} label="Date" value={formatDate(appointmentDate, 'long')} />
                <ReviewItem icon={<Clock className="w-4 h-4" />} label="Time" value={appointmentTime} />
                <ReviewItem icon={type === 'video' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />} label="Type" value={type === 'video' ? 'Video Call' : 'In Person'} />
                <ReviewItem icon={<CreditCard className="w-4 h-4" />} label="Fee" value={formatCurrency(selectedDoctorObj?.consultation_fee || 0)} />
              </div>

              {reason && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-500 mb-1">Reason for visit</p>
                  <p className="text-sm">{reason}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setStep('payment')} className="flex-1" icon={<CreditCard className="w-4 h-4" />}>
                Proceed to Payment
              </Button>
              <Button variant="ghost" onClick={() => setStep('datetime')} icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step: Payment */}
      {step === 'payment' && (
        <Card>
          <CardHeader title="Payment" subtitle="Complete payment to confirm your appointment" icon={<CreditCard className="w-5 h-5" />} />
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-primary-600 dark:text-primary-400">Consultation Fee</p>
                  <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">{formatCurrency(selectedDoctorObj?.consultation_fee || 0)}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary-500 text-white">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">Card Number</label>
                <div className="relative">
                  <input type="text" placeholder="4242 4242 4242 4242" className="input pl-10" maxLength={19} />
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Expiry</label>
                  <input type="text" placeholder="MM/YY" className="input" maxLength={5} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">CVV</label>
                  <div className="relative">
                    <input type="text" placeholder="123" className="input pl-10" maxLength={3} />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Lock className="w-3.5 h-3.5" />
              <span>Your payment is secured with 256-bit SSL encryption</span>
            </div>

            {bookingError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {bookingError}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                onClick={handlePayment}
                disabled={paymentProcessing}
                loading={paymentProcessing}
                className="flex-1"
                icon={!paymentProcessing ? <Lock className="w-4 h-4" /> : undefined}
              >
                {paymentProcessing ? 'Processing Payment...' : `Pay ${formatCurrency(selectedDoctorObj?.consultation_fee || 0)} & Confirm`}
              </Button>
              <Button variant="ghost" onClick={() => setStep('review')} disabled={paymentProcessing} icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step: Confirmation */}
      {step === 'confirmation' && confirmedAppt && (
        <Card>
          <div className="flex flex-col items-center text-center py-8">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Appointment Confirmed!</h2>
            <p className="text-slate-500 mb-1">Your appointment has been successfully booked.</p>
            <p className="text-sm text-slate-400 mb-6">A confirmation has been sent to your registered email.</p>

            <div className="w-full max-w-md p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-3 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-500">Appointment ID</span>
                <span className="font-bold text-primary-600 dark:text-primary-400">{confirmedAppt.appointment_number}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Doctor</span>
                <span className="font-medium">Dr. {confirmedAppt.doctor?.profile?.full_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Department</span>
                <span className="font-medium">{confirmedAppt.department?.name || 'General'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Date & Time</span>
                <span className="font-medium">{formatDate(confirmedAppt.appointment_date, 'long')} • {confirmedAppt.appointment_time}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Type</span>
                <span className="font-medium capitalize">{confirmedAppt.type.replace('_', ' ')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <Badge variant="success">Confirmed & Paid</Badge>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={() => navigate('/patient/appointments')} icon={<Calendar className="w-4 h-4" />}>
                View My Appointments
              </Button>
              <Button variant="ghost" onClick={() => navigate('/patient')}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function ReviewItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="font-medium">{value}</p>
    </div>
  );
}
