import type { AIMessage } from '../types';
import { formatCurrency } from './utils';

// Rule-based AI Health Assistant - no external API needed
// Provides symptom analysis, triage recommendations, and basic medical Q&A

interface TriageInput {
  age: number;
  symptoms: string[];
  duration: string;
  temperature?: number;
  painLevel: number;
  medicalHistory?: string[];
}

interface TriageResult {
  department: string;
  priority: 'normal' | 'urgent' | 'emergency';
  emergencyLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedWaitTime: string;
  recommendation: string;
  suggestedActions: string[];
  emergencyAlert?: boolean;
}

const EMERGENCY_SYMPTOMS = [
  'chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious',
  'stroke', 'seizure', 'severe burn', 'choking', 'severe allergic reaction',
  'anaphylaxis', 'suicidal', 'not breathing', 'blue lips', 'severe head injury',
  'paralysis', 'slurred speech', 'weakness on one side', 'severe abdominal pain',
  'persistent vomiting blood', 'high fever with stiff neck', 'severe dehydration'
];

const URGENT_SYMPTOMS = [
  'high fever', 'severe pain', 'persistent vomiting', 'dehydration', 'dizziness',
  'rapid heartbeat', 'shortness of breath', 'severe headache', 'joint swelling',
  'infected wound', 'urinary tract infection', 'severe diarrhea', 'asthma attack'
];

const DEPARTMENT_MAP: Record<string, string[]> = {
  'Cardiology': ['chest pain', 'heart', 'palpitation', 'blood pressure', 'shortness of breath'],
  'Neurology': ['headache', 'seizure', 'numbness', 'dizziness', 'memory', 'stroke', 'paralysis'],
  'Orthopedics': ['bone', 'joint', 'fracture', 'sprain', 'back pain', 'knee', 'shoulder', 'arthritis'],
  'Gastroenterology': ['stomach', 'abdomen', 'nausea', 'vomiting', 'diarrhea', 'constipation', 'liver'],
  'Pulmonology': ['cough', 'breathing', 'asthma', 'lung', 'pneumonia', 'bronchitis'],
  'Dermatology': ['skin', 'rash', 'acne', 'eczema', 'mole', 'itching'],
  'ENT': ['ear', 'nose', 'throat', 'sinus', 'hearing', 'tonsil'],
  'Ophthalmology': ['eye', 'vision', 'blurred', 'cataract', 'glaucoma'],
  'Pediatrics': ['child', 'infant', 'baby', 'kid'],
  'Gynecology': ['pregnancy', 'menstrual', 'gynec', 'obstetric'],
  'Urology': ['urine', 'kidney', 'bladder', 'prostate'],
  'Endocrinology': ['diabetes', 'thyroid', 'hormone', 'insulin'],
  'General Medicine': ['fever', 'weakness', 'fatigue', 'cold', 'flu'],
};

export function performTriage(input: TriageInput): TriageResult {
  const symptomsLower = input.symptoms.map(s => s.toLowerCase());
  const allSymptomsText = symptomsLower.join(' ');

  // Check for emergency
  const hasEmergency = EMERGENCY_SYMPTOMS.some(s => allSymptomsText.includes(s));
  const hasHighFever = input.temperature && input.temperature >= 103;
  const hasSeverePain = input.painLevel >= 8;

  if (hasEmergency || (hasHighFever && hasSeverePain)) {
    return {
      department: 'Emergency',
      priority: 'emergency',
      emergencyLevel: 'critical',
      estimatedWaitTime: 'Immediate',
      recommendation: 'EMERGENCY: Seek immediate medical attention. Call emergency services or go to the nearest emergency room.',
      suggestedActions: [
        'Call emergency services immediately',
        'Do not drive yourself - have someone take you',
        'Keep the person calm and still',
        'If unconscious, ensure airway is clear',
      ],
      emergencyAlert: true,
    };
  }

  // Determine department
  let bestDepartment = 'General Medicine';
  let bestScore = 0;
  for (const [dept, keywords] of Object.entries(DEPARTMENT_MAP)) {
    const score = keywords.filter(k => allSymptomsText.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestDepartment = dept;
    }
  }

  // Check for urgent
  const hasUrgent = URGENT_SYMPTOMS.some(s => allSymptomsText.includes(s));
  const isUrgent = hasUrgent || (input.temperature && input.temperature >= 101) || input.painLevel >= 6;

  if (isUrgent) {
    return {
      department: bestDepartment,
      priority: 'urgent',
      emergencyLevel: 'high',
      estimatedWaitTime: '15-30 minutes',
      recommendation: 'Your symptoms require prompt medical attention. Please book an appointment as soon as possible or visit the hospital.',
      suggestedActions: [
        'Book an appointment with the recommended department',
        'Rest and stay hydrated',
        'Monitor your symptoms closely',
        'If symptoms worsen, seek emergency care',
      ],
    };
  }

  return {
    department: bestDepartment,
    priority: 'normal',
    emergencyLevel: input.painLevel >= 4 ? 'medium' : 'low',
    estimatedWaitTime: '30-60 minutes',
    recommendation: 'Your symptoms appear manageable. A routine consultation is recommended. Follow home care tips and monitor your condition.',
    suggestedActions: [
      'Book a routine appointment',
      'Get adequate rest',
      'Stay hydrated',
      'Monitor symptoms and seek care if they worsen',
    ],
  };
}

const KNOWLEDGE_BASE: { keywords: string[]; response: string }[] = [
  {
    keywords: ['fever', 'high temperature', 'running a temperature'],
    response: 'A fever is your body\'s natural response to infection. For adults:\n• Rest and drink plenty of fluids\n• A fever below 103°F (39.4°C) usually doesn\'t need treatment\n• Use a damp cloth on your forehead\n• If fever exceeds 103°F or lasts more than 3 days, consult a doctor\n• For infants under 3 months with any fever, seek immediate care.',
  },
  {
    keywords: ['headache', 'head pain', 'migraine'],
    response: 'Headaches can have many causes. Common relief methods:\n• Rest in a quiet, dark room\n• Stay hydrated\n• Apply a cold compress\n• Try over-the-counter pain relievers as directed\n\nSeek immediate care if you experience: sudden severe headache, headache with fever/stiff neck, headache after head injury, or headache with vision changes/weakness.',
  },
  {
    keywords: ['common cold', 'cough', 'sore throat', 'flu', 'runny nose'],
    response: 'For common cold and flu symptoms:\n• Rest and stay hydrated\n• Gargle with warm salt water for sore throat\n• Use a humidifier\n• Honey can help soothe cough (not for infants under 1)\n• Symptoms usually resolve in 7-10 days\n\nSee a doctor if: symptoms last over 10 days, severe headache, difficulty breathing, or high fever persists.',
  },
  {
    keywords: ['stomach pain', 'stomach ache', 'nausea', 'vomiting', 'diarrhea', 'abdomen'],
    response: 'For digestive issues:\n• Drink clear fluids and electrolyte solutions\n• Eat bland foods (rice, toast, bananas)\n• Avoid dairy, caffeine, and fatty foods\n• Rest your digestive system\n\nSeek immediate care if: severe abdominal pain, blood in vomit/stool, signs of dehydration, or persistent vomiting for over 24 hours.',
  },
  {
    keywords: ['chest pain', 'chest tightness', 'heart attack'],
    response: '⚠️ Chest pain can be serious. If you experience chest pain with:\n• Shortness of breath\n• Pain spreading to arm/jaw/back\n• Sweating, dizziness, or nausea\n\nCALL EMERGENCY SERVICES IMMEDIATELY. This could be a heart attack. Do not drive yourself. Chew an aspirin if available and not allergic.',
  },
  {
    keywords: ['back pain', 'backache', 'spine', 'lower back'],
    response: 'For back pain:\n• Apply heat or cold packs\n• Gentle stretching and movement\n• Maintain good posture\n• Over-the-counter pain relievers can help\n\nSee a doctor if: pain lasts over 2 weeks, numbness/tingling in legs, loss of bladder/bowel control, or pain after a fall/injury.',
  },
  {
    keywords: ['skin rash', 'rash', 'itchy skin', 'acne'],
    response: 'For skin issues:\n• Keep the area clean and dry\n• Avoid scratching\n• Use mild, fragrance-free products\n• Apply cool compresses for itching\n\nSee a dermatologist if: rash spreads quickly, signs of infection (pus, warmth), severe itching, or no improvement with self-care.',
  },
  {
    keywords: ['insomnia', "can't sleep", 'trouble sleeping'],
    response: 'For better sleep:\n• Maintain a consistent sleep schedule\n• Avoid screens 1 hour before bed\n• Keep your room cool and dark\n• Limit caffeine after noon\n• Regular exercise (not close to bedtime)\n\nConsult a doctor if insomnia persists for over a month or affects daily functioning.',
  },
  {
    keywords: ['anxiety', 'anxious', 'depression', 'feeling stressed', 'panic attack'],
    response: 'Mental health is as important as physical health:\n• Practice deep breathing and mindfulness\n• Regular exercise helps reduce stress\n• Connect with friends and family\n• Consider talking to a counselor\n\nIf you have thoughts of self-harm, please reach out to a crisis helpline immediately. You are not alone, and help is available.',
  },
  {
    keywords: ['blood pressure', 'hypertension'],
    response: 'Blood pressure management:\n• Reduce sodium intake\n• Regular physical activity\n• Maintain a healthy weight\n• Limit alcohol\n• Manage stress\n• Monitor regularly\n\nNormal BP is around 120/80 mmHg. Consult a doctor if readings consistently exceed 130/80.',
  },
  {
    keywords: ['diabetes', 'blood sugar', 'glucose'],
    response: 'Diabetes management:\n• Monitor blood sugar regularly\n• Balanced diet with controlled carbs\n• Regular exercise\n• Take medications as prescribed\n• Regular check-ups (eyes, feet, kidneys)\n\nSee a doctor if: blood sugar is consistently high/low, or you experience excessive thirst, frequent urination, or unexplained weight loss.',
  },
  {
    keywords: ['pregnancy', 'pregnant', 'prenatal'],
    response: 'During pregnancy:\n• Attend all prenatal check-ups\n• Take prenatal vitamins\n• Eat a balanced diet\n• Avoid alcohol, smoking, and raw foods\n• Stay active with doctor-approved exercise\n\nContact your doctor immediately for: severe abdominal pain, bleeding, severe headache, vision changes, or decreased fetal movement.',
  },
];

export function getAIResponse(message: string, history: AIMessage[] = []): { response: string; emergency?: boolean; suggestAppointment?: boolean } {
  const lower = message.toLowerCase();

  // Check for emergency keywords
  const isEmergency = EMERGENCY_SYMPTOMS.some(s => lower.includes(s));
  if (isEmergency) {
    return {
      response: '🚨 EMERGENCY ALERT 🚨\n\nYour symptoms may indicate a medical emergency. Please:\n\n1. Call emergency services immediately (911 or your local emergency number)\n2. Do not attempt to drive yourself\n3. If with someone, have them stay with you\n4. Keep any relevant medications nearby\n\nThis is not a substitute for emergency medical care. Please seek immediate help.',
      emergency: true,
      suggestAppointment: true,
    };
  }

  // Find matching knowledge base entry
  for (const entry of KNOWLEDGE_BASE) {
    if (entry.keywords.some(k => lower.includes(k))) {
      const shouldSuggest = URGENT_SYMPTOMS.some(s => lower.includes(s));
      return {
        response: entry.response,
        suggestAppointment: shouldSuggest,
      };
    }
  }

  // Check for greeting
  if (lower.match(/^(hi|hello|hey|greetings)/)) {
    return {
      response: 'Hello! I\'m your AI Health Assistant. I can help you with:\n\n• General health questions\n• Symptom assessment\n• Triage recommendations\n• Guidance on when to seek care\n\nWhat health concern can I help you with today?',
    };
  }

  // Check for thanks
  if (lower.match(/(thank|thanks|appreciate)/)) {
    return {
      response: 'You\'re welcome! Remember, I\'m here 24/7 if you have more health questions. Take care of yourself!',
    };
  }

  // Default response
  return {
    response: 'I understand you\'re concerned about your health. Could you describe your symptoms in more detail? For example:\n\n• What symptoms are you experiencing?\n• How long have you had them?\n• Do you have a fever or pain?\n\nThis will help me provide better guidance. Remember, I can provide general information but cannot prescribe medication. For specific diagnosis and treatment, please consult a doctor.',
    suggestAppointment: false,
  };
}

// AI Copilot for Admin
export function getAdminCopilotResponse(query: string, stats: any): string {
  const lower = query.toLowerCase();

  if (lower.includes('appointment') && (lower.includes('today') || lower.includes('how many'))) {
    return `Today there are ${stats.todayAppointments} appointments scheduled. ${stats.pendingAppointments} are pending confirmation, and ${stats.completedAppointments} have been completed overall.`;
  }

  if (lower.includes('bed') && lower.includes('available')) {
    const rate = stats.totalBeds > 0 ? Math.round((stats.bedsOccupied / stats.totalBeds) * 100) : 0;
    return `Currently ${stats.bedsAvailable} beds are available out of ${stats.totalBeds} total beds. ${stats.bedsOccupied} beds are occupied, giving an occupancy rate of ${rate}%.`;
  }

  if (lower.includes('bed') || lower.includes('occupancy')) {
    const rate = stats.totalBeds > 0 ? Math.round((stats.bedsOccupied / stats.totalBeds) * 100) : 0;
    return `Hospital bed occupancy is at ${rate}%. ${stats.bedsOccupied} beds occupied, ${stats.bedsAvailable} available out of ${stats.totalBeds} total.`;
  }

  if (lower.includes('doctor') && (lower.includes('workload') || lower.includes('highest') || lower.includes('busiest'))) {
    return `Based on current data, the hospital has ${stats.totalDoctors} active doctors. The Cardiology and General Medicine departments typically see the highest patient volume. Check the Analytics page for detailed doctor performance metrics.`;
  }

  if (lower.includes('emergency')) {
    return `There have been ${stats.emergencyCases} emergency cases. All emergency cases are given priority handling with immediate attention.`;
  }

  if (lower.includes('revenue')) {
    return `Total revenue from completed appointments is ${formatCurrency(stats.revenue)}. This includes ${stats.completedAppointments} completed consultations.`;
  }

  if (lower.includes('patient') && (lower.includes('total') || lower.includes('how many'))) {
    return `The hospital currently has ${stats.totalPatients} registered patients in the system.`;
  }

  if (lower.includes('video') || lower.includes('consultation')) {
    return `There have been ${stats.videoConsultations} video consultations. This represents remote care services provided to patients.`;
  }

  if (lower.includes('report') || lower.includes('weekly') || lower.includes('summary')) {
    const bedOccupancyPct = stats.totalBeds > 0 ? Math.round((stats.bedsOccupied / stats.totalBeds) * 100) : 0;
    const otUtilizationPct = stats.totalOTs > 0 ? Math.round((stats.otsOccupied / stats.totalOTs) * 100) : 0;
    return `Hospital Summary Report:\n\n• Total Patients: ${stats.totalPatients}\n• Total Doctors: ${stats.totalDoctors}\n• Total Appointments: ${stats.totalAppointments}\n• Completed: ${stats.completedAppointments}\n• Emergency Cases: ${stats.emergencyCases}\n• Bed Occupancy: ${bedOccupancyPct}%\n• OT Utilization: ${otUtilizationPct}%\n• Revenue: ${formatCurrency(stats.revenue)}\n• Video Consultations: ${stats.videoConsultations}`;
  }

  if (/\bots?\b/.test(lower) || lower.includes('operation') || lower.includes('theatre')) {
    const otUtilizationPct = stats.totalOTs > 0 ? Math.round((stats.otsOccupied / stats.totalOTs) * 100) : 0;
    return `Operation Theatre status: ${stats.otsAvailable} available, ${stats.otsOccupied} occupied out of ${stats.totalOTs} total OTs. Utilization rate is ${otUtilizationPct}%.`;
  }

  if (lower.includes('help') || lower.includes('what can you')) {
    return `I can help you with:\n\n• Appointment statistics ("How many appointments today?")\n• Bed management ("How many beds available?")\n• Doctor workload ("Which doctor has highest workload?")\n• Emergency cases ("How many emergency patients?")\n• Revenue reports ("Generate revenue report")\n• Hospital occupancy ("Show hospital occupancy")\n• Weekly reports ("Generate weekly report")\n• OT utilization ("OT status")\n\nJust ask me a question about hospital operations!`;
  }

  return `I can help you analyze hospital operations. Try asking:\n\n• "How many appointments today?"\n• "How many beds available?"\n• "Show hospital occupancy"\n• "Which doctor has highest workload?"\n• "How many emergency patients today?"\n• "Generate revenue report"\n• "Generate weekly report"\n\nCurrent stats: ${stats.totalPatients} patients, ${stats.totalDoctors} doctors, ${stats.todayAppointments} appointments today.`;
}
