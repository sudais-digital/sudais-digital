import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "../../../lib/firebaseAdmin";

export async function POST(request: Request) {
  try {
    const authorizationHeader =
      request.headers.get("authorization");

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Login token nahi mila.",
        },
        { status: 401 }
      );
    }

    const idToken = authorizationHeader
      .replace("Bearer ", "")
      .trim();

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Login token khali hai.",
        },
        { status: 401 }
      );
    }

    const decodedToken =
      await adminAuth.verifyIdToken(idToken);

    const userDocument = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (!userDocument.exists) {
      return NextResponse.json(
        {
          success: false,
          message: "User ka Firestore document nahi mila.",
        },
        { status: 404 }
      );
    }

    const userData = userDocument.data();

    if (userData?.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Sirf admin backend test kar sakta hai.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Firebase Admin SDK successfully connected hai.",
      adminUid: decodedToken.uid,
    });
  } catch (error) {
    console.error("Firebase Admin test error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Firebase Admin connection test fail ho gaya.",
      },
      { status: 500 }
    );
  }
}