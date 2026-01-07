import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);

        const date = searchParams.get("date");                // YYYY-MM-DD
        const transTypeId = searchParams.get("transTypeId");  // number
        const provinceCode = searchParams.get("provinceCode"); // number

        if (!date || !transTypeId || !provinceCode) {
            return NextResponse.json(
                { message: "Missing required query parameters" },
                { status: 400 }
            );
        }

        // Format date → DD-MMM-YYYY
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

        const url = `https://gw.fbr.gov.pk/pdi/v2/SaleTypeToRate?date=${formattedDate}&transTypeId=${transTypeId}&originationSupplier=${provinceCode}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            return NextResponse.json(
                {
                    message: `FBR API error`,
                    status: response.status,
                },
                { status: response.status }
            );
        }

        const data = await response.json();

        const rates = Array.isArray(data)
            ? data
            : Array.isArray(data?.rates)
            ? data.rates
            : [];

        return NextResponse.json(
            {
                data: rates,
                count: rates.length,
            },
            { status: 200 }
        );
    } catch (error) {
        console.warn("Error fetching sales tax rate:", error);

        return NextResponse.json(
            {
                message: "Internal server error",
                error: error.message,
            },
            { status: 500 }
        );
    }
}
