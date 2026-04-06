// Supabase Edge Function: process-issue
// Calls Groq AI to categorize an issue, stores it, and sends emergency email if needed.
// Deploy: supabase functions deploy process-issue

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are EaseStay's intelligent issue categorization engine for a PG (Paying Guest) accommodation management system.

When a resident reports an issue via text or voice, you must analyze it and return ONLY a valid JSON object with no additional text.

Analyze the input and return:
{
  "category": "<one of: Plumbing, Electrical, Cleaning, Network, Maintenance, Emergency, Other>",
  "priority": "<one of: Low, Medium, High, Critical>",
  "title": "<concise 6-10 word title summarizing the issue>",
  "intent": "<1 sentence describing exactly what the resident reported>",
  "is_emergency": <true if there is immediate danger to life/property (fire, gas leak, real electrical sparks/smoke, flooding), false otherwise>
}

Priority rules:
- Critical: life-threatening, fire, gas, severe flooding, real electrical sparks/smoke
- High: broken critical appliance, complete power outage, water leak
- Medium: slow drain, partial outage, dirty common areas  
- Low: minor inconvenience, cosmetic issues, slow wifi

Return ONLY the JSON. No markdown, no explanation.`;

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, user_id, community_id, room_number } = await req.json();

    if (!text || !user_id || !community_id) {
      return new Response(JSON.stringify({ error: "Missing required fields: text, user_id, community_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ── Step 1: Call Groq AI ──
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text }
        ],
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      throw new Error(`Groq API error: ${err}`);
    }

    const groqData = await groqRes.json();
    const rawContent = groqData.choices?.[0]?.message?.content ?? "{}";

    // Parse AI response — strip potential markdown code fences
    const cleaned = rawContent.replace(/```json|```/g, "").trim();
    let parsed: { category: string; priority: string; title: string; intent: string; is_emergency: boolean };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI returned invalid JSON: " + rawContent);
    }

    const { category, priority, title, intent, is_emergency } = parsed;

    // ── Step 2: Insert into Supabase ──
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: issue, error: insertErr } = await supabase
      .from("issues")
      .insert([{
        user_id,
        community_id,
        room_number: room_number || null,
        title: title || text.split(" ").slice(0, 6).join(" ") + "...",
        description: text,
        category: category || "Other",
        priority: priority || "Low",
        status: "Pending",
      }])
      .select()
      .single();

    if (insertErr) throw new Error("DB insert error: " + insertErr.message);

    // ── Step 3: Emergency Email via Resend (if is_emergency) ──
    let emailSent = false;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    
    if (is_emergency && resendKey) {
      // Fetch owner email
      const { data: community } = await supabase
        .from("communities")
        .select("owner_id, name, profiles(full_name)")
        .eq("id", community_id)
        .single();

      const { data: ownerUser } = await supabase.auth.admin.getUserById(community?.owner_id);
      const ownerEmail = ownerUser?.user?.email;

      if (ownerEmail) {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "EaseStay Alerts <alerts@easestay.app>",
            to: [ownerEmail],
            subject: `🚨 EMERGENCY: ${category} issue reported at ${community?.name}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #dc2626; color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                  <h1 style="margin: 0; font-size: 24px;">🚨 Emergency Alert</h1>
                  <p style="margin: 8px 0 0; opacity: 0.9;">EaseStay – ${community?.name}</p>
                </div>
                <div style="background: #fef2f2; border: 2px solid #dc2626; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
                  <h2 style="color: #dc2626; margin-top: 0;">${title}</h2>
                  <p><strong>Category:</strong> ${category}</p>
                  <p><strong>Priority:</strong> ${priority}</p>
                  <p><strong>Room:</strong> ${room_number || "Unknown"}</p>
                  <p><strong>Report:</strong> "${intent}"</p>
                  <p style="margin-top: 24px; padding: 12px; background: white; border-radius: 8px; border: 1px solid #fca5a5;">
                    <strong>Original voice report:</strong> "${text}"
                  </p>
                  <p style="color: #6b7280; font-size: 14px;">
                    Please respond immediately or call emergency services if required.
                  </p>
                </div>
              </div>
            `,
          }),
        });
        emailSent = emailRes.ok;
      }
    }

    // ── Step 4: Return result ──
    return new Response(
      JSON.stringify({
        success: true,
        issue,
        ai_analysis: { category, priority, title, intent, is_emergency },
        emergency_email_sent: emailSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("process-issue error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
