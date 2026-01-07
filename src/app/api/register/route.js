import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
// import bcrypt from 'bcryptjs';

export async function POST(req) {
  const body = await req.json();

  const {
    business_name,
    owner_name,
    contact_no,
    email,
    password,
    cnic,
    ntn,
    strn,
    business_type,
    address,
    ref_code,
  } = body;

  if (
    !business_name ||
    !owner_name ||
    !contact_no ||
    !email ||
    !password ||
    !cnic ||
    !business_type ||
    !address
  ) {
    return NextResponse.json(
      { message: "All required fields must be filled" },
      { status: 400 }
    );
  }

  const emailRegex =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { message: "Invalid email format" },
      { status: 400 }
    );
  }

  try {
    const [existing] = await db.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Email already registered" },
        { status: 409 }
      );
    }

    // const hashedPassword = await bcrypt.hash(password, 10);
    const plainPassword = password;

    await db.query(
      `INSERT INTO users 
        (business_name, owner_name, contact_no, email, password, cnic, ntn, strn, business_type, address, ref_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        business_name,
        owner_name,
        contact_no,
        email,
        // hashedPassword,
        plainPassword,
        cnic,
        ntn,
        strn,
        business_type,
        address,
        ref_code
      ]
    );

    return NextResponse.json({ message: "User registered successfully" });
  } catch (error) {
    console.warn("Registration error:", error);
    return NextResponse.json(
      { message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}
