
import { NextRequest, NextResponse } from "next/server";

export async function POST(request) {
    try {
        const isProd = request.cookies.get('isProd')?.value;

        console.log('isProd:', isProd);
        const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ message: "Authorization header required" }, { status: 401 });
        }
        const token = authHeader.replace(/^Bearer\s+/i, '');
        
        const body = await request.json();

        let fbrUrl;
        if(isProd === '1' || isProd === 'true'){
            fbrUrl = process.env.POST_TO_FBR_PRODUCTION;
        }else{
             fbrUrl = process.env.POST_TO_FBR_SANDBOX;
        }
        console.log("FBR url " , fbrUrl);
            
        // const fbrUrl =
        //     "https://gw.fbr.gov.pk/di_data/v1/di/postinvoicedata_sb"


        const res = await fetch(fbrUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        let data;
        try {
            data = await res.json();
        } catch {
            data = { raw: await res.text() };
        }

        if (!res.ok) {
            console.warn("FBR invoice post failed:", res.status, data);
            return NextResponse.json(
                {
                    message: "FBR rejected invoice",
                    fbrStatus: res.status,
                    fbrResponse: data,
                },
                { status: res.status }
            );
        }

        console.log("FBR invoice posted successfully:", data);

        return NextResponse.json(
            { success: true, fbrResponse: data },
            { status: 200 }
        );
    } catch (err) {
        console.warn("Server error posting to FBR:", err);
        return NextResponse.json(
            { message: "Internal server error", error: err.message },
            { status: 500 }
        );
    }
}

