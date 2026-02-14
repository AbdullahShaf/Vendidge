import { db } from '../../../../lib/db';
import { NextRequest, NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("id");

    if (!invoiceId) {
      return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 });
    }

    const [rows] = await db.query(
      `SELECT error FROM invoices_error WHERE invoiceId = ?`,
      [invoiceId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "No error logs found for this invoice." }, { status: 404 });
    }
    return NextResponse.json({ errorData: rows[0].error }, { status: 200 });

  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}