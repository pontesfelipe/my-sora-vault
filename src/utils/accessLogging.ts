import { supabase } from "@/integrations/supabase/client";

export const logAccess = async (
  action: string,
  page?: string,
  details?: Record<string, unknown>
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const userAgent = navigator.userAgent;

    await supabase.from('access_logs').insert({
      user_id: session.user.id,
      user_email: session.user.email || null,
      action,
      page: page || window.location.pathname,
      details: details || null,
      user_agent: userAgent,
      ip_address: null,
    });
  } catch (error) {
    console.error('Failed to log access:', error);
  }
};
