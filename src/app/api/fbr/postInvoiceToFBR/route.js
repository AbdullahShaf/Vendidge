
// import { NextRequest, NextResponse } from "next/server";

// export async function POST(request) {
//     try {
//         const isProd = request.cookies.get('isProd')?.value;

//         console.log('isProd:', isProd);
//         const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
//         if (!authHeader) {
//             return NextResponse.json({ message: "Authorization header required" }, { status: 401 });
//         }
//         const token = authHeader.replace(/^Bearer\s+/i, '');

//         const body = await request.json();

//         let fbrUrl;
//         if(isProd === '1' || isProd === 'true'){
//             fbrUrl = process.env.POST_TO_FBR_PRODUCTION;
//         }else{
//              fbrUrl = process.env.POST_TO_FBR_SANDBOX;
//         }
//         console.log("FBR url " , fbrUrl);

//         // const fbrUrl =
//         //     "https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata_sb"


//         const res = await fetch(fbrUrl, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 Authorization: `Bearer ${token}`,
//             },
//             body: JSON.stringify(body),
//         });

//         let data;
//         try {
//             data = await res.json();
//         } catch {
//             data = { raw: await res.text() };
//         }

//         if (!res.ok) {
//             console.warn("FBR invoice post failed:", res.status, data);
//             return NextResponse.json(
//                 {
//                     message: "FBR rejected invoice",
//                     fbrStatus: res.status,
//                     fbrResponse: data,
//                 },
//                 { status: res.status }
//             );
//         }

//         console.log("FBR invoice posted successfully:", data);



//         return NextResponse.json(
//             { success: true, fbrResponse: data },
//             { status: 200 }
//         );
//     } catch (err) {
//         console.warn("Server error posting to FBR:", err);
//         return NextResponse.json(
//             { message: "Internal server error", error: err.message },
//             { status: 500 }
//         );
//     }
// }


import { db } from '../../../../../lib/db';
import { NextRequest, NextResponse } from "next/server";


export async function POST(request) {
    try {
        const isProd = request.cookies.get('isProd')?.value;
        const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

        if (!authHeader) {
            return NextResponse.json({ message: "Authorization header required" }, { status: 401 });
        }
        const token = authHeader.replace(/^Bearer\s+/i, '');

        const body = await request.json();
        const { userId, invoiceId, ...fbrPayload } = body;
        const tableName = (isProd === '1' || isProd === 'true') ? 'invoices_prod' : 'invoices';

        if (userId && invoiceId) {
            try {
                await db.query(
                    `UPDATE ${tableName} 
                     SET status = 'Processing'
                     WHERE user_id = ? AND id = ?`,
                    [userId, invoiceId]
                );
            } catch (dbErr) {
                console.error("Database update failed after FBR call:", dbErr);
            }
        }

    //    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    //    await sleep(10000);

        let fbrUrl = (isProd === '1' || isProd === 'true')
            ? process.env.POST_TO_FBR_PRODUCTION
            : process.env.POST_TO_FBR_SANDBOX;

        const res = await fetch(fbrUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(fbrPayload),
        });

        if (res.status === 503 || res.status === 504) {
            if (userId && invoiceId) {
                await db.query(
                    `UPDATE ${tableName} SET status = 'Pending' WHERE user_id = ? AND id = ?`,
                    [userId, invoiceId]
                );
            }
            return NextResponse.json({ 
                message: "FBR Service is currently unavailable. Status reset to Pending.",
                success: false 
            }, { status: 503 });
        }

        let fbrData;
        try {
            fbrData = await res.json();
        } catch {
            fbrData = { raw: await res.text() };
        }
        console.log("FBR Response Data:", fbrData);

        const isInvalid = !res.ok || fbrData?.validationResponse?.status === "Invalid";
        const finalStatus = isInvalid ? 'Failed' : 'Success';
        const fbrInvoiceNo = fbrData?.invoiceNumber || null;


        if (userId && invoiceId) {
            try {
                await db.query(
                    `UPDATE ${tableName} 
                     SET status = ?, fbr_invoice_no = ? 
                     WHERE user_id = ? AND id = ?`,
                    [finalStatus, fbrInvoiceNo, userId, invoiceId]
                );
                console.log(`DB Updated: Invoice ${invoiceId} set to ${finalStatus}`);
            } catch (dbErr) {
                console.error("Database update failed after FBR call:", dbErr);
            }
        }

        return NextResponse.json({
            success: !isInvalid,
            fbrResponse: fbrData,
            dbStatus: finalStatus
        }, { status: res.status });

    } catch (err) {
        console.warn("Server error:", err);
        return NextResponse.json({ message: "Internal server error", error: err.message }, { status: 500 });
    }
}