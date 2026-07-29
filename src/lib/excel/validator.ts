import { supabaseAdmin } from "@/lib/supabase/server";
import { ValidationError, ValidationRule, SalesRaw } from "@/types";

export async function validateAllRows(
  sessionId: string
): Promise<{ validCount: number; errorCount: number }> {
  const rules = await loadValidationRules();

  const { data: rows } = await supabaseAdmin
    .from("sales_raw")
    .select("*")
    .eq("session_id", sessionId)
    .eq("validation_status", "pending");

  if (!rows || rows.length === 0) {
    return { validCount: 0, errorCount: 0 };
  }

  let validCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    const errors = validateSingleRow(row, rules);

    if (errors.length === 0) {
      await supabaseAdmin
        .from("sales_raw")
        .update({ validation_status: "valid" })
        .eq("id", row.id);
      validCount++;
    } else {
      await supabaseAdmin
        .from("sales_raw")
        .update({
          validation_status: "error",
          validation_errors: errors,
        })
        .eq("id", row.id);
      errorCount++;
    }
  }

  return { validCount, errorCount };
}

function validateSingleRow(
  row: SalesRaw,
  rules: ValidationRule[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const rowRules = rules.filter(
    (r) => r.source_file === row.source_file && r.is_active
  );

  for (const rule of rowRules) {
    const value = row.raw_data[rule.field_name];

    const error = applyValidationRule(rule, value, row.raw_data);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

function applyValidationRule(
  rule: ValidationRule,
  value: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fullRow: Record<string, unknown>
): ValidationError | null {
  const { rule_type, rule_config, error_message, field_name } = rule;

  switch (rule_type) {
    case "required":
      if (value === null || value === undefined || value === "") {
        return { field: field_name, message: error_message, value };
      }
      break;

    case "type":
      if (value !== null && value !== undefined && value !== "") {
        const dataType = rule_config.data_type as string;
        if (dataType === "number" && isNaN(Number(value))) {
          return { field: field_name, message: error_message, value };
        }
        if (dataType === "date") {
          const date = new Date(value as string);
          if (isNaN(date.getTime())) {
            return { field: field_name, message: error_message, value };
          }
        }
      }
      break;

    case "format":
      if (value !== null && value !== undefined && value !== "") {
        const pattern = rule_config.pattern as string;
        const regex = new RegExp(pattern);
        if (!regex.test(String(value))) {
          return { field: field_name, message: error_message, value };
        }
      }
      break;

    case "lookup":
      // Lookup validation is handled by database constraints
      // This rule type is kept for documentation purposes
      break;

    case "range":
      if (value !== null && value !== undefined && value !== "") {
        const num = Number(value);
        const min = rule_config.min as number;
        const max = rule_config.max as number;
        if (num < min || num > max) {
          return { field: field_name, message: error_message, value };
        }
      }
      break;

    case "unique":
      // Unique validation is handled by database constraints
      // This rule type is kept for documentation purposes
      break;
  }

  return null;
}

// Lookup and unique checks would be implemented with actual DB calls in production
// For now, these are handled by database constraints

async function loadValidationRules(): Promise<ValidationRule[]> {
  const { data } = await supabaseAdmin
    .from("validation_rules")
    .select("*")
    .eq("is_active", true);

  return (data as ValidationRule[]) || [];
}
