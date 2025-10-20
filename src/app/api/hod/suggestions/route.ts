import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { hodSuggestionService } from "@/lib/mongodb-services";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const staffId = url.searchParams.get('staffId');
    const semester = url.searchParams.get('semester');
    if (!staffId || !semester) return NextResponse.json({ error: 'staffId and semester required' }, { status: 400 });

    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user?.role !== 'HOD') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const suggestion = await hodSuggestionService.findUnique({ staffId_semester: { staffId, semester } });
    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch suggestion' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user?.role !== 'HOD') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { staffId, semester, content } = body;
    if (!staffId || !semester) return NextResponse.json({ error: 'staffId and semester required' }, { status: 400 });

    const existing = await hodSuggestionService.findUnique({ staffId_semester: { staffId, semester } });
    
    let suggestion;
    if (existing) {
      await hodSuggestionService.deleteMany({ staffId, semester });
    }
    suggestion = await hodSuggestionService.create({ staffId, semester, content });

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error(error);
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
    console.error(error);
    return NextResponse.json({ error: 'Failed to clear suggestions' }, { status: 500 });
  }
}
