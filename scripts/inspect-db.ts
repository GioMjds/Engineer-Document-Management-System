import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseSecret);

async function main() {
  const { data: projs, error: pErr } = await supabase.from('projects').select('*').limit(5);
  console.log('--- PROJECTS ---', projs?.length, pErr?.message);

  const { data: files } = await supabase.storage.from('documents').list();
  console.log('--- STORAGE FILES in documents ---', files?.length);
  if (files) console.log(files.map(f => f.name));

  const { data: pNocs, error: nocErr } = await supabase.from('project_nocs').select('id, project_id, sequence_no, description, status_code');
  console.log('--- PROJECT NOCS ---', pNocs?.length, nocErr?.message);

  const { data: reviews, error: revErr } = await supabase.from('reviews').select('*');
  console.log('--- REVIEWS ---', reviews?.length, revErr?.message);

  const { data: docReviews, error: docRevErr } = await supabase.from('document_reviews').select('*');
  console.log('--- DOCUMENT REVIEWS ---', docReviews?.length, docRevErr?.message);

  const { data: projMembers, error: pmErr } = await supabase.from('project_members').select('*');
  console.log('--- PROJECT MEMBERS ---', projMembers?.length, pmErr?.message);

  console.log('--- TESTING EXACT REVIEW QUEUE QUERY ---');
  const reviewQuery = await supabase
    .from('documents')
    .select(`
      id,
      project_id,
      doc_number,
      title,
      description,
      discipline,
      revision,
      status,
      file_name,
      file_size,
      created_at,
      uploaded_by,
      projects (
        id,
        code,
        description
      ),
      uploader:profiles!documents_uploaded_by_fkey (
        full_name
      ),
      reviews:document_reviews (
        id,
        revision_label,
        level,
        decision,
        comment,
        created_at,
        reviewer:profiles!document_reviews_reviewer_id_fkey (
          full_name
        )
      )
    `)
    .in('status', ['submitted', 'escalated'])
    .order('created_at', { ascending: true });

  console.log('REVIEW QUERY RESULT:', reviewQuery.error ? `ERROR: ${reviewQuery.error.message}` : 'SUCCESS! Count: ' + reviewQuery.data?.length);
}

main().catch(console.error);
