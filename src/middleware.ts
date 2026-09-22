import { getSession } from "better-auth/api";
import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = ["/feed", "/case/create", "/reports"];

export const middleware = (request: NextRequest)=> {
    const pathName = request.nextUrl.pathname;
    const session = getSessionCookie(request);

    const isProtectedRoutes = protectedRoutes.some((route) => pathName.startsWith(route));

    if(isProtectedRoutes && !session){
        const loginUrl = new URL ("/login", request.url);
        loginUrl.searchParams.set("redirect", pathName);
        return NextResponse.redirect(loginUrl)
    }

    if(session && pathName === "/login"){
        return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next();
}

export const config = {
    matcher:["/feed", "/case/:path*", "/login", "/reports"]
}