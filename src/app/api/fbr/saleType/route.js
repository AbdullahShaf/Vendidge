import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ message: "Authorization header required" }, { status: 401 });
        }
        const token = authHeader.replace(/^Bearer\s+/i, '');

        const response = await fetch(
            "https://gw.fbr.gov.pk/pdi/v1/doctypecode",
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                cache: "no-store",
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { message: "Sale Type API failed", status: response.status },
                { status: response.status }
            );
        }

        const data = await response.json();

        return NextResponse.json(Array.isArray(data) ? data : [], { status: 200 });
    } catch (err) {
        console.warn("Sale type fetch failed:", err);
        return NextResponse.json([], { status: 500 });
    }
}
