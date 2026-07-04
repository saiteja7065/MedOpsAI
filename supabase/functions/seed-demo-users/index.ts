import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
// v2: stronger passwords for GoTrue password policy

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const demoUsers = [
      {
        email: "admin@medicore.health",
        password: "Admin@MediCore2026",
        userData: { full_name: "Admin User", role: "admin", phone: "+1234567890" },
      },
      {
        email: "doctor@medicore.health",
        password: "Doctor@MediCore2026",
        userData: { full_name: "Dr. Sarah Smith", role: "doctor", phone: "+1234567891" },
      },
      {
        email: "patient@medicore.health",
        password: "Patient@MediCore2026",
        userData: { full_name: "John Doe", role: "patient", phone: "+1234567892" },
      },
    ];

    const results: any[] = [];

    for (const demo of demoUsers) {
      // Use signUp via the public auth API (not admin API)
      // First check if user already exists by trying to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: demo.email,
        password: demo.password,
      });

      let userId: string;

      if (!signInError && signInData.user) {
        userId = signInData.user.id;
        results.push({ email: demo.email, status: "already_exists", id: userId });
      } else {
        // User doesn't exist or can't sign in - try to create via signUp
        // Use a separate client with anon key for signUp
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const publicClient = createClient(supabaseUrl, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { data, error } = await publicClient.auth.signUp({
          email: demo.email,
          password: demo.password,
          options: {
            data: demo.userData,
          },
        });

        if (error) {
          results.push({ email: demo.email, status: "signup_error", error: error.message });
          continue;
        }

        if (!data.user) {
          results.push({ email: demo.email, status: "no_user_returned" });
          continue;
        }

        userId = data.user.id;
        results.push({ email: demo.email, status: "created", id: userId });

        // If email confirmation is required, we need to confirm it
        // The trigger should auto-confirm since we set email_confirm in signUp options
        // But let's also try to update via service role
        if (!data.session) {
          // Email confirmation might be on - try to confirm via admin API
          try {
            await supabase.auth.admin.updateUserById(userId, { email_confirm: true });
          } catch (e) {
            // Ignore - the trigger might have already handled it
          }
        }
      }

      // Update profile (trigger should have created it, but update to be safe)
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          email: demo.email,
          full_name: demo.userData.full_name,
          role: demo.userData.role,
          phone: demo.userData.phone,
          is_active: true,
        });

      if (profileError) {
        results.push({ email: demo.email, status: "profile_error", error: profileError.message });
      }
    }

    // Now seed related data for the demo users
    // Get the created users
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", "admin@medicore.health")
      .maybeSingle();
    const { data: doctorProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", "doctor@medicore.health")
      .maybeSingle();
    const { data: patientProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", "patient@medicore.health")
      .maybeSingle();

    if (doctorProfile && patientProfile) {
      // Get cardiology department
      const { data: cardiologyDept } = await supabase
        .from("departments")
        .select("id")
        .eq("name", "Cardiology")
        .maybeSingle();

      // Create doctor record
      if (cardiologyDept) {
        const { data: existingDoctor } = await supabase
          .from("doctors")
          .select("id")
          .eq("profile_id", doctorProfile.id)
          .maybeSingle();

        if (!existingDoctor) {
          await supabase.from("doctors").insert({
            profile_id: doctorProfile.id,
            department_id: cardiologyDept.id,
            employee_id: "EMP-001",
            specialization: "Interventional Cardiology",
            qualification: "MD, DM Cardiology, MBBS",
            experience_years: 12,
            consultation_fee: 800,
            bio: "Dr. Sarah Smith is a board-certified cardiologist with over 12 years of experience in interventional cardiology.",
            languages: ["English", "Spanish", "French"],
            available_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            rating: 4.8,
            total_consultations: 1250,
            is_available: true,
          });
        }
      }

      // Create patient record
      const { data: existingPatient } = await supabase
        .from("patients")
        .select("id")
        .eq("profile_id", patientProfile.id)
        .maybeSingle();

      if (!existingPatient) {
        const { data: newPatient } = await supabase
          .from("patients")
          .insert({
            profile_id: patientProfile.id,
            patient_id: "PAT-001",
            blood_group: "O+",
            height_cm: 175.5,
            weight_kg: 72.3,
            allergies: ["Penicillin", "Peanuts"],
            chronic_conditions: ["Hypertension"],
            emergency_contact_name: "Jane Doe",
            emergency_contact_phone: "+1234567893",
            insurance_provider: "Blue Cross Blue Shield",
            insurance_number: "BCBS-123456789",
          })
          .select("id")
          .maybeSingle();

        // Create appointments
        if (newPatient) {
          const { data: doctor } = await supabase
            .from("doctors")
            .select("id")
            .eq("profile_id", doctorProfile.id)
            .maybeSingle();

          if (doctor && cardiologyDept) {
            const today = new Date().toISOString().split("T")[0];
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
            const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

            await supabase.from("appointments").insert([
              {
                appointment_number: "APT-100001",
                patient_id: newPatient.id,
                doctor_id: doctor.id,
                department_id: cardiologyDept.id,
                appointment_date: today,
                appointment_time: "09:30",
                type: "in_person",
                status: "confirmed",
                priority: "normal",
                reason: "Regular cardiac check-up",
                symptoms: ["chest discomfort", "mild fatigue"],
                fee: 800,
                is_paid: true,
              },
              {
                appointment_number: "APT-100002",
                patient_id: newPatient.id,
                doctor_id: doctor.id,
                department_id: cardiologyDept.id,
                appointment_date: tomorrow,
                appointment_time: "10:00",
                type: "video",
                status: "pending",
                priority: "normal",
                reason: "Follow-up consultation",
                symptoms: ["shortness of breath"],
                fee: 800,
                is_paid: false,
              },
              {
                appointment_number: "APT-100003",
                patient_id: newPatient.id,
                doctor_id: doctor.id,
                department_id: cardiologyDept.id,
                appointment_date: lastWeek,
                appointment_time: "11:00",
                type: "in_person",
                status: "completed",
                priority: "normal",
                reason: "Initial consultation",
                symptoms: ["high blood pressure"],
                fee: 800,
                is_paid: true,
              },
            ]);

            // Create a prescription for the completed appointment
            const { data: completedAppt } = await supabase
              .from("appointments")
              .select("id")
              .eq("appointment_number", "APT-100003")
              .maybeSingle();

            if (completedAppt) {
              await supabase.from("prescriptions").insert({
                appointment_id: completedAppt.id,
                patient_id: newPatient.id,
                doctor_id: doctor.id,
                diagnosis: "Essential Hypertension - Stage 1",
                medicines: [
                  { name: "Amlodipine 5mg", dosage: "1 tablet", frequency: "Once daily", duration: "30 days", notes: "Take in the morning" },
                  { name: "Lisinopril 10mg", dosage: "1 tablet", frequency: "Once daily", duration: "30 days", notes: "Take with water" },
                ],
                instructions: "Monitor blood pressure daily. Maintain low-sodium diet. Exercise regularly for 30 minutes. Follow up in 2 weeks.",
                follow_up_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
                is_active: true,
              });
            }
          }
        }
      }

      // Create medical report
      const { data: patient } = await supabase
        .from("patients")
        .select("id")
        .eq("profile_id", patientProfile.id)
        .maybeSingle();
      const { data: doctor } = await supabase
        .from("doctors")
        .select("id")
        .eq("profile_id", doctorProfile.id)
        .maybeSingle();

      if (patient && doctor) {
        const { data: existingReport } = await supabase
          .from("medical_reports")
          .select("id")
          .eq("patient_id", patient.id)
          .maybeSingle();

        if (!existingReport) {
          await supabase.from("medical_reports").insert({
            patient_id: patient.id,
            doctor_id: doctor.id,
            report_type: "lab",
            title: "Complete Blood Count (CBC) Report",
            description: "Routine blood work including hemoglobin, WBC, platelets, and differential count",
            ai_summary: "AI Analysis: The complete blood count shows normal hemoglobin levels at 13.5 g/dL. White blood cell count is within normal range at 7.2 K/uL. Platelet count is adequate at 250 K/uL. No significant abnormalities detected. Recommend follow-up in 6 months for routine monitoring.",
            ai_diseases: ["Mild Vitamin D deficiency"],
            ai_medicines: ["Vitamin D3 1000IU daily", "Multivitamin supplement"],
            ai_test_results: { hemoglobin: "13.5 g/dL", wbc: "7.2 K/uL", platelets: "250 K/uL", rbc: "4.8 M/uL", hematocrit: "41.2%" },
            is_processed: true,
          });
        }
      }
    }

    // Create notifications
    if (patientProfile) {
      await supabase.from("notifications").upsert([
        {
          user_id: patientProfile.id,
          title: "Appointment Confirmed",
          message: "Your appointment with Dr. Sarah Smith has been confirmed for today at 9:30 AM.",
          type: "appointment",
        },
        {
          user_id: patientProfile.id,
          title: "Welcome to MediCore",
          message: "Welcome to MediCore OS! Your patient account has been created successfully.",
          type: "system",
        },
      ], { onConflict: "user_id" });
    }

    if (doctorProfile) {
      await supabase.from("notifications").upsert([
        {
          user_id: doctorProfile.id,
          title: "New Appointment Request",
          message: "You have a new appointment request from John Doe for a video consultation.",
          type: "appointment",
        },
      ], { onConflict: "user_id" });
    }

    if (adminProfile) {
      await supabase.from("notifications").upsert([
        {
          user_id: adminProfile.id,
          title: "System Update",
          message: "Hospital analytics dashboard has been updated with latest data.",
          type: "system",
        },
      ], { onConflict: "user_id" });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
