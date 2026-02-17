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
  // UI에서 넘어오더라도, 서버에서 profile_path 기준으로 재계산해서 저장할 거라 optional 처리
  profile_image_url?: string | null;
};

/**
 * 클라이언트에서 선택된 감독을 directors 테이블에 upsert.
 * - onConflict: tmdb_person_id
 * - 성공 시 우리 DB의 directors.id(uuid) 반환
 */
export async function upsertDirector(input: UpsertDirectorInput): Promise<string> {
  if (!input || typeof input.tmdb_id !== 'number' || !Number.isFinite(input.tmdb_id)) {
    throw new Error('Invalid tmdb_id');
  }
  const name = (input.name ?? '').trim();
  if (!name) {
    throw new Error('Invalid director name');
  }

  const supabase = await createClient();

  // 상세 페이지에서 쓰기 좋게 조금 더 큰 사이즈로 저장
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

  if (error) {
    throw new Error(`Failed to upsert director: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error('Upsert succeeded but no director id returned');
  }

  return data.id as string;
}