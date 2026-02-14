// app/api/fbr/registration-type/route.ts

import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ message: "Authorization header required" }, { status: 401 });
        }
        console.log("using auth header:", authHeader );
        const token = authHeader.replace(/^Bearer\s+/i, '');
        console.log("using token:", token );
        const { searchParams } = new URL(request.url);
        const registrationNo = searchParams.get("regNo")?.trim();

        if (!registrationNo) {
            return NextResponse.json({ message: "regNo is required" }, { status: 400 });
        }

        console.log("Fetching FBR Registration Type for:", registrationNo);

        const response = await fetch(
            "https://gw.fbr.gov.pk/dist/v1/Get_Reg_Type",
            {
                method: "POST",
                headers: {
                   // Authorization: `Bearer ${token}`,
                    Authorization: authHeader,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    Registration_No: registrationNo,
                }),
                cache: "no-store",
            }
        );

        let data;
        try {
            data = await response.json();
        } catch (jsonErr) {
            const text = await response.text().catch(() => "");
            console.warn("FBR response not JSON:", response.status, text);
            return NextResponse.json(
                { message: "FBR returned invalid JSON", raw: text },
                { status: 502 }
            );
        }

        // ── IMPORTANT ──
        // FBR returns 500 even for normal "unregistered" cases
        console.log("FBR Registration Type response:", response.status, data);
        if (response.status === 200 || response.status === 500) {
            // Return the FBR payload as-is — your client will interpret statuscode
            return NextResponse.json(data, { status: 200 });
        }

        // Only truly failed requests (401, 429, 503, etc.)
        console.warn("FBR upstream real error:", response.status, data || await response.text());
        return NextResponse.json(
            {
                message: "FBR Registration Type API failed",
                status: response.status,
                detail: data || "No response body",
            },
            { status: response.status }
        );
    } catch (err) {
        console.warn("Route crash:", err);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}