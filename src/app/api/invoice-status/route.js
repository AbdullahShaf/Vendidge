import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';

export async function PUT(request) {
    try {
        const isProd = request.cookies.get('isProd')?.value;

        console.log('isProd:', isProd);
        const body = await request.json();
        const { userId, id, fbrInvoiceNo, status } = body;

        console.log("Received invoice status update:", userId, id, fbrInvoiceNo, status);

        if (!userId || !id || !status) {
            return NextResponse.json(
                { error: 'Missing required fields: user id, invoice id, status' },
                { status: 400 }
            );
        }
        const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Karachi",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());

        console.log("Updating invoice status in database:", { userId, id, fbrInvoiceNo, status, today });
         if (isProd === '1' || isProd === 'true') {
            await db.query(
                `UPDATE invoices_prod 
             SET status = ?, fbr_invoice_no = ?, invoice_posted_date = ?
             WHERE user_id = ? AND id = ?`,
                [
                    status,
                    fbrInvoiceNo ?? null,
                    today,
                    userId,
                    id
                ]
            );
        } else {
            await db.query(
               `UPDATE invoices 
                SET status = ?,
                     fbr_invoice_no = ?,
                     invoice_posted_date = ?
                WHERE user_id = ? AND id = ?`,
                [
                    status,
                    fbrInvoiceNo ?? null,
                    today,
                    userId,
                    id
                ]
            );
        }

        return NextResponse.json(
            { message: 'Invoice updated successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.warn(error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
