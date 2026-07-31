import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("products")
      .select("*", { count: "exact" })
      .order("code", { ascending: true });

    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { data: products, count, error } = await query
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    const productCodes = (products || []).map((p) => p.code);

    const prices: Record<string, { platform: string; hpp: number }[]> = {};
    if (productCodes.length > 0) {
      const { data: priceData } = await supabaseAdmin
        .from("product_prices")
        .select("product_code, platform, hpp")
        .in("product_code", productCodes)
        .order("platform");

      if (priceData) {
        for (const p of priceData) {
          if (!prices[p.product_code]) prices[p.product_code] = [];
          prices[p.product_code].push({ platform: p.platform, hpp: p.hpp });
        }
      }
    }

    const enriched = (products || []).map((p) => ({
      ...p,
      prices: prices[p.code] || [],
    }));

    return NextResponse.json({
      products: enriched,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Get products error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Get failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, category } = body;

    if (!code || !name) {
      return NextResponse.json(
        { error: "Code dan Name wajib diisi" },
        { status: 400 }
      );
    }

    const { error: checkError } = await supabaseAdmin
      .from("products")
      .select("code")
      .eq("code", code)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      throw new Error(checkError.message);
    }

    if (!checkError) {
      return NextResponse.json(
        { error: `Produk dengan kode "${code}" sudah ada` },
        { status: 409 }
      );
    }

    const { data, error: insertError } = await supabaseAdmin
      .from("products")
      .insert({ code, name, category: category || "Regular" })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ product: data }, { status: 201 });
  } catch (error) {
    console.error("Create product error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 500 }
    );
  }
}
