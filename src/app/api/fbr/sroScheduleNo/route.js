import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        const rateId = searchParams.get("rateId");
        const date = searchParams.get("date"); // YYYY-MM-DD
        const provinceCode = searchParams.get("provinceCode");

        if (!rateId || !date || !provinceCode) {
            return NextResponse.json(
                { message: "Missing required query parameters" },
                { status: 400 }
            );
        }

        // format date → DD-MMM-YYYY
        const formattedDate = new Date(date)
            .toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            })
            .replace(/ /g, "-");

        const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ message: "Authorization header required" }, { status: 401 });
        }
        const token = authHeader.replace(/^Bearer\s+/i, '');

        const url = `https://gw.fbr.gov.pk/pdi/v1/SroSchedule?rate_id=${rateId}&date=${formattedDate}&origination_supplier_csv=${provinceCode}`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            return NextResponse.json(
                { message: `FBR SRO API error`, status: response.status },
                { status: response.status }
            );
        }

        const data = await response.json();

        const opts = Array.isArray(data)
            ? data
            : Array.isArray(data?.sroSchedules)
            ? data.sroSchedules
            : [];

        return NextResponse.json(
            { data: opts, count: opts.length },
            { status: 200 }
        );
    } catch (error) {
        console.warn("Error fetching SRO schedules:", error);
        return NextResponse.json(
            { message: "Internal server error", error: error.message },
            { status: 500 }
        );
    }
}
