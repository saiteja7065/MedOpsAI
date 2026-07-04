import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, Phone, MessageSquare, ScreenShare, FileText, X, Send, Users, Sparkles } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { videoSessionsApi, appointmentsApi } from '../../lib/api';
import { Card, Button, Avatar, Skeleton, EmptyState } from '../../components/ui';
import { cn, formatDate } from '../../lib/utils';
import { useAuthStore } from '../../store/auth';

export function VideoSessionsPage({ role }: { role: 'admin' | 'doctor' | 'patient' }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeSession, setActiveSession] = useState<string | null>(null);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['video-appointments', role],
    queryFn: () => appointmentsApi.getAll({ status: 'confirmed' }),
  });

  const videoAppts = appointments.filter(a => a.type === 'video');

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Video Consultations</h1>
        <p className="text-slate-500">Manage and join video consultations</p>
      </div>

      {videoAppts.length === 0 ? (
        <EmptyState icon={<Video className="w-8 h-8" />} title="No video consultations" description="Confirmed video appointments will appear here" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videoAppts.map(appt => (
            <Card key={appt.id} className="hover:shadow-lg transition-all">
              <div className="flex items-center gap-3 mb-4">
                <Avatar name={role === 'doctor' ? appt.patient?.profile?.full_name || 'P' : appt.doctor?.profile?.full_name || 'D'} size="md" />
                <div className="flex-1">
                  <p className="font-medium">{role === 'doctor' ? appt.patient?.profile?.full_name : `Dr. ${appt.doctor?.profile?.full_name}`}</p>
                  <p className="text-xs text-slate-500">{appt.doctor?.specialization}</p>
                </div>
              </div>
              <div className="space-y-1 text-sm text-slate-500 mb-4">
                <p>{formatDate(appt.appointment_date, 'long')} at {appt.appointment_time}</p>
                <p>{appt.appointment_number}</p>
              </div>
              <Button className="w-full" icon={<Video className="w-4 h-4" />} onClick={() => navigate(`/${role}/video-call/${appt.id}`)}>
                Join Call
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function VideoCallRoom({ appointmentId, role }: { appointmentId: string; role: 'doctor' | 'patient' }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [videoOn, setVideoOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showPrescription, setShowPrescription] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { data: appointment } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => appointmentsApi.getById(appointmentId),
    enabled: !!appointmentId,
  });

  // Start camera
  useEffect(() => {
    let stream: MediaStream;
    navigator.mediaDevices.getUserMedia({ video: videoOn, audio: micOn })
      .then(s => {
        stream = s;
        setLocalStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(err => console.error('Camera access denied:', err));
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, []);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !videoOn);
      setVideoOn(!videoOn);
    }
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !micOn);
      setMicOn(!micOn);
    }
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(p => [...p, { sender: role, message: chatInput, timestamp: new Date().toISOString() }]);
    setChatInput('');
  };

  const endCall = () => {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    navigate(-1);
  };

  const otherParty = role === 'doctor' ? appointment?.patient?.profile : appointment?.doctor?.profile;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-slate-900/50 backdrop-blur">
        <div className="flex items-center gap-3 text-white">
          <div className="p-2 bg-rose-500 rounded-lg animate-pulse">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <p className="font-medium">{otherParty?.full_name || 'Connecting...'}</p>
            <p className="text-xs text-slate-400">{formatDuration(callDuration)} • {appointment?.doctor?.specialization}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white">
          <span className="flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Connected
          </span>
        </div>
      </div>

      {/* Main video area */}
      <div className="flex-1 flex">
        <div className="flex-1 relative bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
          {/* Remote video placeholder */}
          <div className="text-center">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center text-white text-4xl font-bold mb-4">
              {otherParty?.full_name?.[0] || '?'}
            </div>
            <p className="text-white font-medium text-lg">{otherParty?.full_name}</p>
            <p className="text-slate-400 text-sm">{role === 'doctor' ? 'Patient' : 'Doctor'}</p>
          </div>

          {/* Local video (picture-in-picture) */}
          <div className="absolute bottom-4 right-4 w-48 h-36 bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-600 shadow-xl">
            {videoOn ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500">
                <VideoOff className="w-8 h-8" />
              </div>
            )}
            <div className="absolute bottom-1 left-1 text-xs text-white bg-black/50 px-2 py-0.5 rounded">You</div>
          </div>
        </div>

        {/* Chat panel */}
        {showChat && (
          <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col animate-slide-down">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-medium text-white flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Chat</h3>
              <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">No messages yet. Start the conversation!</p>
              ) : chatMessages.map((msg, i) => (
                <div key={i} className={cn('flex', msg.sender === role ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[80%] rounded-xl px-3 py-2 text-sm',
                    msg.sender === role ? 'bg-primary-600 text-white' : 'bg-slate-800 text-slate-200')}>
                    <p>{msg.message}</p>
                    <p className="text-xs opacity-60 mt-0.5">{formatDate(msg.timestamp, 'time')}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-slate-800 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Type a message..."
                className="flex-1 bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none border border-slate-700 focus:border-primary-500"
              />
              <button onClick={sendChat} className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Prescription panel (doctor only) */}
        {showPrescription && role === 'doctor' && (
          <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col animate-slide-down">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-medium text-white flex items-center gap-2"><FileText className="w-4 h-4" /> Prescription</h3>
              <button onClick={() => setShowPrescription(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <PrescriptionPanel appointmentId={appointmentId} doctorId={appointment?.doctor_id || ''} patientId={appointment?.patient_id || ''} onClose={() => setShowPrescription(false)} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-slate-900/50 backdrop-blur flex items-center justify-center gap-3">
        <button
          onClick={toggleMic}
          className={cn('p-4 rounded-full transition-colors', micOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-rose-600 text-white')}
          title={micOn ? 'Mute' : 'Unmute'}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button
          onClick={toggleVideo}
          className={cn('p-4 rounded-full transition-colors', videoOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-rose-600 text-white')}
          title={videoOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {videoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setShowChat(!showChat)}
          className={cn('p-4 rounded-full transition-colors', showChat ? 'bg-primary-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600')}
          title="Chat"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        {role === 'doctor' && (
          <button
            onClick={() => setShowPrescription(!showPrescription)}
            className={cn('p-4 rounded-full transition-colors', showPrescription ? 'bg-primary-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600')}
            title="Prescription"
          >
            <FileText className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => alert('Screen sharing would start here (requires WebRTC screen capture API)')}
          className="p-4 rounded-full bg-slate-700 text-white hover:bg-slate-600"
          title="Share screen"
        >
          <ScreenShare className="w-5 h-5" />
        </button>
        <button
          onClick={endCall}
          className="p-4 rounded-full bg-rose-600 text-white hover:bg-rose-700"
          title="End call"
        >
          <Phone className="w-5 h-5 rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}

function PrescriptionPanel({ appointmentId, doctorId, patientId, onClose }: { appointmentId: string; doctorId: string; patientId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [diagnosis, setDiagnosis] = useState('');
  const [instructions, setInstructions] = useState('');
  const [medicines, setMedicines] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { supabase: sb } = await import('../../lib/supabase');
      const { data, error } = await sb.from('prescriptions').insert({
        appointment_id: appointmentId,
        doctor_id: doctorId,
        patient_id: patientId,
        diagnosis,
        instructions,
        medicines: medicines.filter(m => m.name),
      }).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      onClose();
    },
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 text-white">
      <div>
        <label className="block text-sm font-medium mb-2 text-slate-300">Diagnosis</label>
        <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none border border-slate-700 focus:border-primary-500" rows={3} placeholder="Enter diagnosis..." />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-slate-300">Medicines</label>
        <div className="space-y-2">
          {medicines.map((med, i) => (
            <div key={i} className="bg-slate-800 rounded-lg p-3 space-y-2">
              <input value={med.name} onChange={(e) => setMedicines(p => p.map((m, j) => j === i ? { ...m, name: e.target.value } : m))} placeholder="Medicine name" className="w-full bg-slate-700 text-white rounded px-2 py-1.5 text-sm outline-none" />
              <div className="grid grid-cols-3 gap-2">
                <input value={med.dosage} onChange={(e) => setMedicines(p => p.map((m, j) => j === i ? { ...m, dosage: e.target.value } : m))} placeholder="Dosage" className="bg-slate-700 text-white rounded px-2 py-1.5 text-xs outline-none" />
                <input value={med.frequency} onChange={(e) => setMedicines(p => p.map((m, j) => j === i ? { ...m, frequency: e.target.value } : m))} placeholder="Frequency" className="bg-slate-700 text-white rounded px-2 py-1.5 text-xs outline-none" />
                <input value={med.duration} onChange={(e) => setMedicines(p => p.map((m, j) => j === i ? { ...m, duration: e.target.value } : m))} placeholder="Duration" className="bg-slate-700 text-white rounded px-2 py-1.5 text-xs outline-none" />
              </div>
            </div>
          ))}
          <button onClick={() => setMedicines(p => [...p, { name: '', dosage: '', frequency: '', duration: '' }])} className="w-full py-2 border-2 border-dashed border-slate-700 rounded-lg text-sm text-slate-400 hover:border-primary-500 hover:text-primary-400">+ Add Medicine</button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2 text-slate-300">Instructions</label>
        <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none border border-slate-700 focus:border-primary-500" rows={3} placeholder="Follow-up instructions..." />
      </div>
      <div className="p-3 bg-primary-900/20 rounded-lg flex items-center gap-2 text-xs text-primary-300">
        <Sparkles className="w-4 h-4" />
        AI will generate a session summary after the call ends.
      </div>
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || !diagnosis}
        className="w-full btn-primary"
      >
        {saveMutation.isPending ? 'Saving...' : 'Save Prescription'}
      </button>
    </div>
  );
}
