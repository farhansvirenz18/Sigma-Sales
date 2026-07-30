import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { clearTransformCache } from "@/lib/excel/mapper";

interface MappingItem {
  source_file: string;
  source_column: string;
  target_table: string;
  target_column: string;
  transform_rule: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const { mappings } = (await request.json()) as { mappings: MappingItem[] };

    if (!mappings || !Array.isArray(mappings)) {
      return NextResponse.json(
        { error: "Invalid mappings data" },
        { status: 400 }
      );
    }

    const results: { source_file: string; inserted: number; errors: string[] }[] = [];
    const grouped: Record<string, MappingItem[]> = {};

    for (const m of mappings) {
      const key = m.source_file;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    }

    for (const [sourceFile, items] of Object.entries(grouped)) {
      const { error: deleteError } = await supabaseAdmin
        .from("column_mappings")
        .delete()
        .eq("source_file", sourceFile);

      if (deleteError) {
        results.push({
          source_file: sourceFile,
          inserted: 0,
          errors: [`Delete failed: ${deleteError.message}`],
        });
        continue;
      }

      const insertData = items.map((m) => ({
        source_file: m.source_file,
        source_column: m.source_column,
        target_table: m.target_table,
        target_column: m.target_column,
        transform_rule: m.transform_rule,
        is_required: false,
      }));

      const { data, error: insertError } = await supabaseAdmin
        .from("column_mappings")
        .insert(insertData)
        .select();

      if (insertError) {
        results.push({
          source_file: sourceFile,
          inserted: 0,
          errors: [`Insert failed: ${insertError.message}`],
        });
      } else {
        results.push({
          source_file: sourceFile,
          inserted: data?.length || 0,
          errors: [],
        });
      }
    }

    clearTransformCache();

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Save mappings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("column_mappings")
      .select("*")
      .order("source_file");

    if (error) throw new Error(error.message);

    return NextResponse.json({ mappings: data || [] });
  } catch (error) {
    console.error("Get mappings error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Get failed" },
      { status: 500 }
    );
  }
}
