import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("code", code)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    const { data: prices } = await supabaseAdmin
      .from("product_prices")
      .select("*")
      .eq("product_code", code)
      .order("platform");

    return NextResponse.json({
      product,
      prices: prices || [],
    });
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Get failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();

    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("code")
      .eq("code", code)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data yang diupdate" },
        { status: 400 }
      );
    }

    const { data, error: updateError } = await supabaseAdmin
      .from("products")
      .update(updateData)
      .eq("code", code)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ product: data });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("code")
      .eq("code", code)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan" },
        { status: 404 }
      );
    }

    await supabaseAdmin
      .from("product_prices")
      .delete()
      .eq("product_code", code);

    const { error: deleteError } = await supabaseAdmin
      .from("products")
      .delete()
      .eq("code", code);

    if (deleteError) throw new Error(deleteError.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
