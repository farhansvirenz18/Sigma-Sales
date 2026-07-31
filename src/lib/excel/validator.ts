import { supabaseAdmin } from "@/lib/supabase/server";
import { ValidationError, ValidationRule, SalesRaw } from "@/types";

export async function validateAllRows(
  sessionId: string
): Promise<{ validCount: number; errorCount: number }> {
  const rules = await loadValidationRules();

  const { data: rows, error: rowsError } = await supabaseAdmin
    .from("sales_raw")
    .select("*")
    .eq("session_id", sessionId)
    .eq("validation_status", "pending");

  if (rowsError) {
    throw new Error(`Failed to fetch rows for validation: ${rowsError.message}`);
  }

  if (!rows || rows.length === 0) {
    return { validCount: 0, errorCount: 0 };
  }

  let validCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    const errors = await validateSingleRow(row, rules);

    if (errors.length === 0) {
      const { error } = await supabaseAdmin
        .from("sales_raw")
        .update({ validation_status: "valid" })
        .eq("id", row.id);
      if (error) {
        console.error(`Failed to update row ${row.id} to valid:`, error);
      }
      validCount++;
    } else {
      const { error } = await supabaseAdmin
        .from("sales_raw")
        .update({
          validation_status: "error",
          validation_errors: errors,
        })
        .eq("id", row.id);
      if (error) {
        console.error(`Failed to update row ${row.id} to error:`, error);
      }
      errorCount++;
    }
  }

  return { validCount, errorCount };
}

async function validateSingleRow(
  row: SalesRaw,
  rules: ValidationRule[]
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  const rowRules = rules.filter(
    (r) => r.source_file === row.source_file && r.is_active
  );

  for (const rule of rowRules) {
    const value = row.raw_data[rule.field_name];

    const error = await applyValidationRule(rule, value, row.raw_data);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

async function applyValidationRule(
  rule: ValidationRule,
  value: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _fullRow: Record<string, unknown>
): Promise<ValidationError | null> {
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

    case "lookup": {
      if (value === null || value === undefined || value === "") break;
      const table = rule_config.table as string;
      const field = rule_config.field as string;
      if (table && field) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select(field)
          .eq(field, value)
          .limit(1);
        if (error) {
          console.error(`Lookup validation error for ${table}.${field}:`, error);
          break;
        }
        if (!data || data.length === 0) {
          return { field: field_name, message: error_message, value };
        }
      }
      break;
    }

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
      break;

    default:
      console.warn(`Unknown validation rule type: ${rule_type} for field ${field_name}`);
      break;
  }

  return null;
}

async function loadValidationRules(): Promise<ValidationRule[]> {
  const { data, error } = await supabaseAdmin
    .from("validation_rules")
    .select("*")
    .eq("is_active", true);

  if (error) {
    throw new Error(`Failed to load validation rules: ${error.message}`);
  }

  return (data as ValidationRule[]) || [];
}
