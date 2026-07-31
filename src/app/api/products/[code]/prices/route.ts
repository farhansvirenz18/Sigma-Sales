import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const { data: product } = await supabaseAdmin
      .from("products")
      .select("code")
      .eq("code", code)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    const { data: prices, error } = await supabaseAdmin
      .from("product_prices")
      .select("*")
      .eq("product_code", code)
      .order("platform");

    if (error) throw new Error(error.message);

    return NextResponse.json({ prices: prices || [] });
  } catch (error) {
    console.error("Get prices error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Get failed" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { platform, hpp, effective_date } = body;

    if (!platform || hpp === undefined || hpp === null) {
      return NextResponse.json(
        { error: "Platform dan HPP wajib diisi" },
        { status: 400 }
      );
    }

    const { data: product } = await supabaseAdmin
      .from("products")
      .select("code")
      .eq("code", code)
      .single();

    if (!product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    const insertData = {
      product_code: code,
      platform,
      hpp,
      effective_date: effective_date || new Date().toISOString().split("T")[0],
    };

    const { data, error: insertError } = await supabaseAdmin
      .from("product_prices")
      .upsert(insertData, {
        onConflict: "product_code,platform,effective_date",
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    return NextResponse.json({ price: data }, { status: 201 });
  } catch (error) {
    console.error("Add price error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Add failed" },
      { status: 500 }
    );
  }
}
