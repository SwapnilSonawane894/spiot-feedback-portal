import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { staffService, hodSuggestionService } from "@/lib/mongodb-services";

// GET - Fetch faculty response for a specific HOD suggestion
export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const role = session.user?.role;
    if (role !== 'STAFF' && role !== 'FACULTY' && role !== 'HOD') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const semester = url.searchParams.get('semester');
    const departmentId = url.searchParams.get('departmentId');
    
    if (!semester) {
      return NextResponse.json({ error: 'semester required' }, { status: 400 });
    }

    // Get the faculty's staff profile
    const staffProfile = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staffProfile) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
    }

    // Find the HOD suggestion for this staff member in this semester
    // We need to find suggestions where this faculty is the target
    const suggestions = await hodSuggestionService.findMany({ 
      where: { staffId: staffProfile.id, semester } 
    });

    // If departmentId is specified, filter by department's HOD
    let suggestion = null;
    if (suggestions && suggestions.length > 0) {
      suggestion = suggestions[0]; // Take the first one or the one matching departmentId
    }

    return NextResponse.json({ 
      suggestion: suggestion ? {
        id: suggestion.id,
        content: suggestion.content || '',
        facultyResponse: suggestion.facultyResponse || '',
        semester: suggestion.semester
      } : null
    });
  } catch (error) {
    console.error('Error fetching faculty response:', error);
    return NextResponse.json({ error: 'Failed to fetch response' }, { status: 500 });
  }
}

// POST - Save faculty response to HOD suggestion
export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const role = session.user?.role;
    if (role !== 'STAFF' && role !== 'FACULTY') {
      return NextResponse.json({ error: 'Forbidden - Only faculty can respond' }, { status: 403 });
    }

    const body = await req.json();
    const { semester, facultyResponse, suggestionId } = body;
    
    if (!semester) {
      return NextResponse.json({ error: 'semester required' }, { status: 400 });
    }

    // Get the faculty's staff profile
    const staffProfile = await staffService.findFirst({ where: { userId: session.user.id } });
    if (!staffProfile) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
    }

    // Find the HOD suggestion to update
    const suggestions = await hodSuggestionService.findMany({ 
      where: { staffId: staffProfile.id, semester } 
    });

    if (!suggestions || suggestions.length === 0) {
      return NextResponse.json({ error: 'No HOD suggestion found for this semester' }, { status: 404 });
    }

    // Update the suggestion with faculty response
    const suggestion = suggestions[0];
    const { getDatabase } = await import('@/lib/mongodb');
    const db = await getDatabase();
    const { ObjectId } = await import('mongodb');
    
    await db.collection('hodSuggestions').updateOne(
      { _id: new ObjectId(suggestion.id) },
      { 
        $set: { 
          facultyResponse: facultyResponse || '',
          facultyResponseUpdatedAt: new Date()
        } 
      }
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Response saved successfully' 
    });
  } catch (error) {
    console.error('Error saving faculty response:', error);
    return NextResponse.json({ error: 'Failed to save response' }, { status: 500 });
  }
}
