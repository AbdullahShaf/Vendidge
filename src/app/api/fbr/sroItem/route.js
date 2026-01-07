import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        const sroId = searchParams.get("sroId");   // renamed for clarity (or keep as sro_id if preferred)
        const date = searchParams.get("date");     // YYYY-MM-DD

        if (!sroId || !date) {
            return NextResponse.json(
                { message: "Missing required query parameters: sroId and date" },
                { status: 400 }
            );
        }

        const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ message: "Authorization header required" }, { status: 401 });
        }
        const token = authHeader.replace(/^Bearer\s+/i, '');
        // const formattedDate = new Date(date)
        //     .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        //     .replace(/ /g, "-");
        console.log("Fetching SRO Items for SRO ID:", sroId, typeof sroId, "on date:", date, typeof date);
        const url = `https://gw.fbr.gov.pk/pdi/v2/SROItem?date=${encodeURIComponent(date)}&sro_id=${sroId}`;

        // Updated endpoint for SRO Items (v2)
        //const url = `https://gw.fbr.gov.pk/pdi/v2/SROItem?date=${formattedDate}&sro_id=${sroId}`;
        //const url = 'https://gw.fbr.gov.pk/pdi/v2/SROItem?date=2025-03-25&sro_id=389';

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            return NextResponse.json(
                { message: `FBR SROItem API error`, status: response.status },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Normalize to always return array (in case API returns object or wrapped response)
        const items = Array.isArray(data)
            ? data
            : Array.isArray(data?.sroItems)   // adjust key if wrapped differently
                ? data.sroItems
                : [];

        return NextResponse.json(
            { data: items, count: items.length },
            { status: 200 }
        );
    } catch (error) {
        console.warn("Error fetching SRO Items:", error);
        return NextResponse.json(
            { message: "Internal server error", error: error.message },
            { status: 500 }
        );
    }
}