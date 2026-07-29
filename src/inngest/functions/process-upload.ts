import { inngest } from "@/inngest/client";
import { supabaseAdmin } from "@/lib/supabase/server";
import { validateAllRows } from "@/lib/excel/validator";
import {
  loadTransformContext,
  applyFinanceTransforms,
  applyMarketingTransforms,
} from "@/lib/excel/mapper";
import { generateFinanceExcel, generateMarketingExcel } from "@/lib/excel/generator";
import { FinanceRow, MarketingRow } from "@/types";

export const processUpload = inngest.createFunction(
  {
    id: "process-upload",
    name: "Process Excel Upload",
    triggers: { event: "upload.completed" },
    concurrency: { limit: 5 },
  },
  async ({ event, step }) => {
    const { sessionId } = event.data;

    await step.run("update-status-processing", async () => {
      await supabaseAdmin
        .from("upload_sessions")
        .update({ status: "processing", started_at: new Date().toISOString() })
        .eq("id", sessionId);
    });

    await step.run("log-start", async () => {
      await supabaseAdmin.from("processing_logs").insert({
        session_id: sessionId,
        step: "validation",
        status: "started",
        details: {},
      });
    });

    const validationResult = await step.run("validate-rows", async () => {
      return await validateAllRows(sessionId);
    });

    await step.run("log-validation-complete", async () => {
      await supabaseAdmin.from("processing_logs").insert({
        session_id: sessionId,
        step: "validation",
        status: "completed",
        details: {
          valid: validationResult.validCount,
          errors: validationResult.errorCount,
        },
      });

      await supabaseAdmin
        .from("upload_sessions")
        .update({
          valid_rows: validationResult.validCount,
          error_rows: validationResult.errorCount,
        })
        .eq("id", sessionId);
    });

    if (validationResult.validCount === 0) {
      await step.run("mark-failed-no-valid-rows", async () => {
        await supabaseAdmin
          .from("upload_sessions")
          .update({ status: "failed", completed_at: new Date().toISOString() })
          .eq("id", sessionId);
      });

      return { success: false, reason: "No valid rows to process" };
    }

    await step.run("log-transform-start", async () => {
      await supabaseAdmin.from("processing_logs").insert({
        session_id: sessionId,
        step: "transform",
        status: "started",
        details: {},
      });
    });

    const transformData = await step.run("transform-data", async () => {
      const ctx = await loadTransformContext();

      const { data: validRows } = await supabaseAdmin
        .from("sales_raw")
        .select("id, raw_data, source_file")
        .eq("session_id", sessionId)
        .eq("validation_status", "valid");

      const financeData = applyFinanceTransforms(validRows || [], ctx);
      const marketingData = applyMarketingTransforms(validRows || [], ctx);

      return { financeData, marketingData };
    });

    await step.run("log-transform-complete", async () => {
      await supabaseAdmin.from("processing_logs").insert({
        session_id: sessionId,
        step: "transform",
        status: "completed",
        details: {
          financeRows: transformData.financeData.length,
          marketingRows: transformData.marketingData.length,
        },
      });
    });

    await step.run("log-generate-start", async () => {
      await supabaseAdmin.from("processing_logs").insert({
        session_id: sessionId,
        step: "generate",
        status: "started",
        details: {},
      });
    });

    const [financePath, marketingPath] = await step.run(
      "generate-output-files",
      async () => {
        const financePath = await generateFinanceExcel(
          transformData.financeData as unknown as FinanceRow[],
          sessionId
        );

        const marketingPath = await generateMarketingExcel(
          transformData.marketingData as unknown as MarketingRow[],
          sessionId
        );

        return [financePath, marketingPath];
      }
    );

    await step.run("log-generate-complete", async () => {
      await supabaseAdmin.from("processing_logs").insert({
        session_id: sessionId,
        step: "generate",
        status: "completed",
        details: { financePath, marketingPath },
      });
    });

    await step.run("mark-completed", async () => {
      await supabaseAdmin
        .from("upload_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      await supabaseAdmin.from("processing_logs").insert({
        session_id: sessionId,
        step: "complete",
        status: "completed",
        details: {
          validRows: validationResult.validCount,
          financeRows: transformData.financeData.length,
          marketingRows: transformData.marketingData.length,
        },
      });
    });

    return {
      success: true,
      sessionId,
      financeRows: transformData.financeData.length,
      marketingRows: transformData.marketingData.length,
    };
  }
);
