import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { hodSuggestionService, staffService } from "@/lib/mongodb-services";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const staffId = url.searchParams.get('staffId');
    const semester = url.searchParams.get('semester');
    if (!staffId || !semester) return NextResponse.json({ error: 'staffId and semester required' }, { status: 400 });

    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user?.role !== 'HOD') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Get HOD's staff profile to get their ID
    const hodProfile = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!hodProfile) return NextResponse.json({ error: 'HOD profile not found' }, { status: 404 });

    // Find suggestion for this specific HOD, staff, and semester combination
    const suggestion = await hodSuggestionService.findUnique({ 
      hodId_staffId_semester: { hodId: hodProfile.id, staffId, semester } 
    });
    return NextResponse.json({ suggestion });
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: 'Failed to fetch suggestion' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user?.role !== 'HOD') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Get HOD's staff profile to get their ID
    const hodProfile = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!hodProfile) return NextResponse.json({ error: 'HOD profile not found' }, { status: 404 });

    const body = await req.json();
    const { staffId, semester, content } = body;
    if (!staffId || !semester) return NextResponse.json({ error: 'staffId and semester required' }, { status: 400 });

    // Use upsert to avoid duplicate key errors
    const suggestion = await hodSuggestionService.upsert(
      { hodId: hodProfile.id, staffId, semester },
      { content }
    );

    return NextResponse.json({ suggestion });
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: 'Failed to save suggestion' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // allow HOD or ADMIN to clear suggestions
    if (session.user?.role !== 'HOD' && session.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const deleted = await hodSuggestionService.deleteMany({});
    return NextResponse.json({ deleted: deleted.count || 0 });
  } catch (error) {
    // console.error(error);
    return NextResponse.json({ error: 'Failed to clear suggestions' }, { status: 500 });
  }
}
