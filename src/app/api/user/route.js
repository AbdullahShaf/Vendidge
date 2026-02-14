
import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
export async function PUT(req) {
  try {
    const body = await req.json();
    const {
      id,
      business_logo,
      cnic_ntn,
      business_name,
      email,
      contact,
      province,
      province_id,
      address,
      invoice_type,
      bearer_token
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    console.log( id,
      cnic_ntn,
      business_name,
      province,
      province_id,
      address,
      invoice_type,
      bearer_token)
    const isProd = invoice_type === "production" ? 1 : 0;
    console.log(isProd);
    await db.query(
      `UPDATE users SET 
        cnic_ntn = ?, business_logo= ? ,business_name = ?, email=? , contact=? , province = ?,provinceId=?,  address = ?, token=? , isProd =?
      WHERE id = ? `,
      [    
        cnic_ntn,
        business_logo || null,
        business_name,
        email,
        contact,
        province,
        province_id,
        address,
        bearer_token,
        isProd,
        id,
      ]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.warn('Update customer error:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId || isNaN(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [rows] = await db.query(
      `SELECT * FROM users WHERE id = ?`,
      [userId]
    );
   // console.log('Fetched user:', rows);
    return NextResponse.json(rows);

  } catch (error) {
    console.warn('Fetch customers error:', error);
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 });
  }
}
