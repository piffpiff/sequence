'use server';

import { createClient } from '@/lib/supabase/server';
import {
  getTMDBProfileImageUrl,
  searchDirectorInTMDB,
  type TMDBDirectorSearchItem,
} from '@/lib/external/tmdb';

export async function searchDirectors(query: string): Promise<TMDBDirectorSearchItem[]> {
  return searchDirectorInTMDB(query);
}

export type UpsertDirectorInput = {
  tmdb_id: number;
  name: string;
  profile_path?: string | null;
  profile_image_url?: string | null;
};

export async function upsertDirector(input: UpsertDirectorInput): Promise<string> {
  if (!input || typeof input.tmdb_id !== 'number' || !Number.isFinite(input.tmdb_id)) {
    throw new Error('Invalid tmdb_id');
  }
  const name = (input.name ?? '').trim();
  if (!name) throw new Error('Invalid director name');

  const supabase = await createClient(); // ✅

  const profileImageUrl =
    getTMDBProfileImageUrl(input.profile_path ?? null, 'w342') ??
    input.profile_image_url ??
    null;

  const { data, error } = await supabase
    .from('directors')
    .upsert(
      {
        tmdb_person_id: input.tmdb_id,
        name,
        profile_image_url: profileImageUrl,
      },
      { onConflict: 'tmdb_person_id' }
    )
    .select('id')
    .single();

  if (error) throw new Error(`Failed to upsert director: ${error.message}`);
  if (!data?.id) throw new Error('Upsert succeeded but no director id returned');

  return data.id as string;
}