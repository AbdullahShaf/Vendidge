import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
// import bcrypt from 'bcryptjs';

export async function POST(req) {
  const { identifier, password } = await req.json();

  if (!identifier || !password) {
    return NextResponse.json({ message: 'identifier and password required' }, { status: 400 });
  }
if (identifier.length !== 13 && identifier.length !== 7 && identifier.length !== 9) {
  return NextResponse.json(
    { message: 'Invalid format: CNIC must be 13 digits, NTN must be 7 or 9 digits' },
    { status: 400 }
  );
}
  try {

    const [rows] = await db.query('SELECT * FROM users WHERE cnic_ntn = ? AND isAllowed =1', [identifier]);
    if (rows.length === 0) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const user = rows[0];
    if (password !== user.password) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // const isMatch = await bcrypt.compare(password, user.password);

    // if (!isMatch) {
    //   return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    // }

    // return NextResponse.json({ message: 'Login successful', user: { id: user.id, email: user.email } });
    console.log("all",user);
    
    return NextResponse.json({
      message: 'Login successful',
      user: user
    });

  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
