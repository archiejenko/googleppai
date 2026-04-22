// Every data export path in the application MUST call canExport.
// This is a compliance requirement, not optional.

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Check whether data from a table (and optionally specific columns) may
 * be exported. Queries data_classification_registry for the exportable flag.
 *
 * Returns false if the table or any specified column has exportable = false.
 */
export async function canExport(
  adminClient: SupabaseClient,
  tableName: string,
  columnName?: string,
): Promise<boolean> {
  let query = adminClient
    .from("data_classification_registry")
    .select("exportable")
    .eq("table_name", tableName);

  if (columnName) {
    query = query.or(`column_name.eq.${columnName},column_name.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[export-guard] Failed to check classification:", error.message);
    return false;
  }

  if (!data || data.length === 0) {
    return true;
  }

  return data.every((row: { exportable: boolean }) => row.exportable !== false);
}
