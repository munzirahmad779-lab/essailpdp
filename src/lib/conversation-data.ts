import { supabase } from "@/integrations/supabase/client";
import { orderedSegments, type InterviewMessage } from "./interview-history";
export const conversationOptions = {
  queryKey: ["conversation"],
  queryFn: async () => {
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error("Silakan masuk.");
    const { error: initError } = await supabase
      .from("interview_conversations")
      .upsert({ user_id: auth.user.id }, { onConflict: "user_id", ignoreDuplicates: true });
    if (initError) throw initError;
    const [
      { data: conversation, error },
      { data: segments, error: segmentError },
      { data: profile, error: profileError },
    ] = await Promise.all([
      supabase.from("interview_conversations").select("*").eq("user_id", auth.user.id).single(),
      supabase
        .from("interview_sessions")
        .select("id,title,interviewer_name,created_at")
        .order("created_at"),
      supabase.from("profiles").select("display_name").eq("id", auth.user.id).single(),
    ]);
    if (error || segmentError || profileError) throw error || segmentError || profileError;
    return {
      id: conversation.id,
      messages: conversation.messages as unknown as InterviewMessage[],
      segments: orderedSegments(segments),
      name: profile.display_name,
    };
  },
};
