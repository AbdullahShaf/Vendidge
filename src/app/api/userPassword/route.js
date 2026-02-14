import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";

export async function PUT(req) {
    try {
        const body = await req.json();
        const {
            id,
            current_password,
            new_password,
        } = body;

        if (!id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const users = await db.query(
            'SELECT password FROM users WHERE id = ?',
            [id]
        );

        if (users.length === 0) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const user = users[0][0];
       
        if (user.password !== current_password) {
            return NextResponse.json({ error: 'Incorrect current password' }, { status: 401 });
        }

        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [new_password, id]
        );

        return NextResponse.json({ success: true, message: 'Password updated successfully' });

    } catch (error) {
        console.error('Update user password error:', error);
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }
}