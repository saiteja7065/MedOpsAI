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

export const EMERGENCY_SYMPTOMS = [
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

