import 'server-only';

export const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

type TMDBMediaType = 'movie' | 'tv' | 'person';

type TMDBKnownFor = {
  id: number;
  media_type: TMDBMediaType;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path?: string | null;
};

type TMDBPerson = {
  id: number;
  name: string;
  known_for_department?: string | null;
  profile_path?: string | null;
  popularity?: number;
  known_for?: TMDBKnownFor[];
};

type TMDBSearchPersonResponse = {
  page: number;
  results: TMDBPerson[];
  total_pages: number;
  total_results: number;
};

export type TMDBDirectorSearchItem = {
  tmdb_id: number;
  name: string;
  known_for_department: 'Directing';
  profile_path: string | null;
  profile_image_url: string | null;
  popularity: number | null;
  known_for_titles: string[]; // UI 표시용 (최대 3개)
};

export function getTMDBProfileImageUrl(
  profilePath: string | null,
  size: 'w45' | 'w92' | 'w185' | 'w342' | 'w500' | 'original' = 'w185'
): string | null {
  if (!profilePath) return null;
  return `${TMDB_IMAGE_BASE_URL}${size}${profilePath}`;
}

function pickTitle(item: TMDBKnownFor): string | null {
  // movie: title / original_title
  // tv: name / original_name
  return (
    item.title ??
    item.name ??
    item.original_title ??
    item.original_name ??
    null
  );
}

/**
 * TMDB /search/person 호출 후,
 * known_for_department === 'Directing' 인 인물만 반환.
 *
 * - tmdb-ts 같은 라이브러리 없이 fetch 직접 사용
 * - TMDB API Key: process.env.TMDB_API_KEY
 */
export async function searchDirectorInTMDB(query: string): Promise<TMDBDirectorSearchItem[]> {
  const q = query.trim();
  if (!q) return [];

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB_API_KEY is missing in environment variables.');
  }

  const url = new URL(`${TMDB_API_BASE_URL}/search/person`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('query', q);
  url.searchParams.set('include_adult', 'false');
  url.searchParams.set('language', 'ko-KR');
  url.searchParams.set('page', '1');

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TMDB search/person failed: ${res.status} ${res.statusText} ${text}`);
  }

  const json = (await res.json()) as TMDBSearchPersonResponse;

  const directors = (json.results ?? [])
    .filter((p) => p.known_for_department === 'Directing')
    .map((p) => {
      const titles =
        (p.known_for ?? [])
          .map(pickTitle)
          .filter((t): t is string => Boolean(t))
          .slice(0, 3);

      return {
        tmdb_id: p.id,
        name: p.name,
        known_for_department: 'Directing' as const,
        profile_path: p.profile_path ?? null,
        profile_image_url: getTMDBProfileImageUrl(p.profile_path ?? null, 'w185'),
        popularity: typeof p.popularity === 'number' ? p.popularity : null,
        known_for_titles: titles,
      };
    })
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

  return directors;
}