import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ message: "Authorization header required" }, { status: 401 });
        }
        const token = authHeader.replace(/^Bearer\s+/i, '');

        const response = await fetch(
            "https://gw.fbr.gov.pk/pdi/v1/provinces",
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                // Important: disable Next.js caching for live API
                cache: "no-store",
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                return NextResponse.json(
                    { message: "Unauthorized – invalid or expired token" },
                    { status: 401 }
                );
            }

            if (response.status === 403) {
                return NextResponse.json(
                    { message: "Forbidden – you don't have permission" },
                    { status: 403 }
                );
            }

            return NextResponse.json(
                {
                    message: `API error: ${response.status} ${response.statusText}`,
                },
                { status: response.status }
            );
        }

        const data = await response.json();
      //  console.log("Fetched provinces data:", data);

        return NextResponse.json(
            {
                data: Array.isArray(data) ? data : [],
                count: Array.isArray(data) ? data.length : 0,
            },
            { status: 200 }
        );
    } catch (error) {
        console.warn("Error fetching provinces:", error);

        return NextResponse.json(
            {
                message: "Internal server error",
                error: error.message,
            },
            { status: 500 }
        );
    }
}
