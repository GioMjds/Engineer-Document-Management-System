import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { canAccessProject } from '@/app/actions/documents';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const supabase = await createClient();

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, project_id, file_path, file_name, mime_type')
      .eq('id', id)
      .maybeSingle();

    if (docError || !doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    const allowed = await canAccessProject(
      supabase,
      user.id,
      user.role,
      doc.project_id,
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Access denied to document project' },
        { status: 403 },
      );
    }

    const admin = createAdminClient();
    const { data: blob, error: downloadError } = await admin.storage
      .from('documents')
      .download(doc.file_path);

    if (downloadError || !blob) {
      return NextResponse.json(
        { error: downloadError?.message || 'File not found in storage' },
        { status: 404 },
      );
    }

    const arrayBuffer = await blob.arrayBuffer();
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': doc.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.file_name)}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server download error' },
      { status: 500 },
    );
  }
}
