import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = Number(searchParams.get("userId"));

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rows] = await db.query(
      `
      SELECT 
        ucf.id,
        ucf.field_id,
        cf.name,
        ucf.\`show\`,
        ucf.show_if_value,
        ucf.hide
      FROM user_choosable_fields ucf
      JOIN choosable_fields cf ON cf.id = ucf.field_id
      WHERE ucf.user_id = ?
      ORDER BY cf.id
      `,
      [userId]
    );
    console.log(rows);

    return NextResponse.json(rows);

  } catch (error) {
    console.error("Fetch user fields error:", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}


export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, userId, show, show_if_value, hide } = body;

    if (!id || !userId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    await db.query(
      `
      UPDATE user_choosable_fields
      SET \`show\` = ?, show_if_value = ?, hide = ?
      WHERE id = ? AND user_id = ?
      `,
      [show, show_if_value, hide, id, userId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update user choosable field error:", error);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    );
  }
}
