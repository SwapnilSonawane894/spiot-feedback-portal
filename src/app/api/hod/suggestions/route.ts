import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const staffId = url.searchParams.get('staffId');
    const semester = url.searchParams.get('semester');
    if (!staffId || !semester) return NextResponse.json({ error: 'staffId and semester required' }, { status: 400 });

    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user?.role !== 'HOD') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const suggestion = await prisma.hodSuggestion.findUnique({ where: { staffId_semester: { staffId, semester } } as any });
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

    const upsert = await prisma.hodSuggestion.upsert({
      where: { staffId_semester: { staffId, semester } } as any,
      update: { content },
      create: { staffId, semester, content },
    });

    return NextResponse.json({ suggestion: upsert });
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

    const deleted = await prisma.hodSuggestion.deleteMany({});
    return NextResponse.json({ deleted: deleted.count || 0 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to clear suggestions' }, { status: 500 });
  }
}
