import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export async function GET(req) {
  try {
    // Call the stored procedure
    const [rows] = await db.query("CALL GetScenarioCodes()");

    // Result is in rows[0]
    const scenarioCodes = rows[0];
    //console.log("Scenario codes:", scenarioCodes);
    return NextResponse.json({ scenarioCodes });
  } catch (err) {
    console.warn(err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
