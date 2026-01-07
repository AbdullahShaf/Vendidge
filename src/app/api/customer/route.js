import { db } from '../../../../lib/db';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      userId,
      // customer_type,
      cnic_inc,
      ntn,
      // strn,
      // contact,
      // email,
      business_name,
      province,
      address,
      // registration_type = 'Unregistered',
    } = body;

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json({ error: 'Unauthorized: Invalid user ID' }, { status: 401 });
    }

    // const [result] = await db.query(`SELECT customer_id FROM customers ORDER BY id DESC LIMIT 1`);
    const [result] = await db.query(
      `SELECT customer_id FROM customers WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    const nextNum = result.length === 0 ? 1 : parseInt(result[0].customer_id.split('-')[1]) + 1;
    const customer_id = `CUST-${String(nextNum).padStart(3, '0')}`;

    await db.query(
      `INSERT INTO customers 
        (user_id, customer_id, cnic_inc, ntn, business_name, province, address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        customer_id,
        cnic_inc || null,
        ntn || null,
        business_name,
        province,
        address
      ]
    );

    return NextResponse.json({ success: true, customer_id }, { status: 201 });

  } catch (error) {
    console.warn('Add customer error:', error);
    return NextResponse.json({ error: 'Failed to add customer' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const {
      userId,
      id,
      // customer_type,
      cnic_inc,
      ntn,
      // strn,
      // contact,
      // email,
      business_name,
      province,
      address,
      // registration_type = 'Unregistered',
    } = body;

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    await db.query(
      `UPDATE customers SET 
        cnic_inc = ?, ntn = ?, business_name = ?, province = ?, address = ?
      WHERE id = ? AND user_id = ?`,
      [    
        cnic_inc || null,
        ntn || null,
        business_name,
        province,
        address,
        id,
        userId,
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
      `SELECT * FROM customers WHERE user_id = ? ORDER BY id DESC`,
      [userId]
    );
   // console.log('Fetched customers:', rows);
    return NextResponse.json(rows);

  } catch (error) {
    console.warn('Fetch customers error:', error);
    return NextResponse.json({ error: 'Failed to load customers' }, { status: 500 });
  }
}
