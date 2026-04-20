import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function logTokenUsage(
  supabase: SupabaseClient,
  params: {
    org_id: string;
    user_id: string;
    function_name: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
  },
) {
  const { org_id, user_id, function_name, model, input_tokens, output_tokens } = params;
  await supabase.from("token_usage_log").insert({
    org_id,
    user_id,
    function_name,
    model,
    input_tokens,
    output_tokens,
    total_tokens: input_tokens + output_tokens,
  });
}
