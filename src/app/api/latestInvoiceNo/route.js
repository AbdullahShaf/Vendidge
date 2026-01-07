import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  const isProd = req.cookies.get('isProd')?.value;

  console.log('isProd:', isProd);

  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  try {
    let rows;
    if (isProd === '1' || isProd === 'true') {
      [rows] = await db.query("CALL GetLatestInvoiceNoProd(?)", [user_id]);
    } else {
      [rows] = await db.query("CALL GetLatestInvoiceNo(?)", [user_id]);
    }

    console.log("Latest invoice rows:", rows);
    const latestInvoice = rows[0][0]?.latest_invoice ?? 1;
    console.log("Latest invoice number:", latestInvoice);
    return NextResponse.json({ latestInvoice });
  } catch (err) {
    console.warn(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
