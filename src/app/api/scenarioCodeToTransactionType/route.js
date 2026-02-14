import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export async function GET(req) {
  try {
    // Call the stored procedure
    const [rows] = await db.query("SELECT * FROM scenarioCodeToTransactionType");

   // console.log("scenarioCodeToTransactionType:", rows);
    return NextResponse.json({ scenarioCodeToTransactionType: rows });
  } catch (err) {
    console.warn(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}