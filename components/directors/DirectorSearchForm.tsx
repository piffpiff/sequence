'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchDirectors, upsertDirector } from '@/app/actions/director';

type SearchItem = Awaited<ReturnType<typeof searchDirectors>>[number];

export default function DirectorSearchForm() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [savingTmdbId, setSavingTmdbId] = useState<number | null>(null);

  const isSaving = savingTmdbId !== null;

  const canSearch = useMemo(
    () => query.trim().length > 0 && !isSearching && !isSaving,
    [query, isSearching, isSaving]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const data = await searchDirectors(q);
      setResults(data);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : '검색 중 오류가 발생했어요.');
    } finally {
      setIsSearching(false);
    }
  };

  const onPick = async (item: SearchItem) => {
    setError(null);
    setSavingTmdbId(item.tmdb_id);

    try {
      const directorId = await upsertDirector({
        tmdb_id: item.tmdb_id,
        name: item.name,
        profile_path: item.profile_path,
        profile_image_url: item.profile_image_url,
      });

      if (!directorId || typeof directorId !== 'string') {
        throw new Error('감독 페이지 주소를 가져오지 못했어요.');
      }

      const nextUrl = `/directors/${directorId}`;

      console.log('selected item:', item);
      console.log('directorId:', directorId);
      console.log('nextUrl:', nextUrl);

      // 1차: Next router 전환
      router.push(nextUrl);
      router.refresh();

      // 2차: 전환이 안 먹는 경우 강제 이동
      setTimeout(() => {
        if (window.location.pathname !== nextUrl) {
          window.location.assign(nextUrl);
        }
      }, 150);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했어요.');
      setSavingTmdbId(null);
    }
  };

  return (
    <section className="w-full">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-sm">
        <form onSubmit={onSubmit} className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="질문할 감독 이름을 입력하세요"
              className="w-full flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600"
              aria-label="감독 검색어"
              disabled={isSearching || isSaving}
            />

            <button
              type="submit"
              disabled={!canSearch}
              className="rounded-xl px-6 py-3 text-base font-semibold bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? '찾는 중…' : '질문할 감독 찾기'}
            </button>
          </div>

          {error ? (
            <div className="mt-3 rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-4">
            {results.length === 0 ? (
              <div className="text-sm text-zinc-500">
                {query.trim() ? '검색 결과가 없어요.' : ''}
              </div>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-zinc-800 divide-y divide-zinc-800">
                {results.map((item) => {
                  const rowSaving = savingTmdbId === item.tmdb_id;

                  return (
                    <li key={item.tmdb_id}>
                      <button
                        type="button"
                        onClick={() => onPick(item)}
                        disabled={isSearching || isSaving}
                        className="w-full flex items-center gap-4 p-4 text-left bg-zinc-950 hover:bg-zinc-900 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-zinc-800">
                          {item.profile_image_url ? (
                            <img
                              src={item.profile_image_url}
                              alt={`${item.name} 프로필`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-full w-full grid place-items-center text-xs font-semibold text-zinc-300">
                              NO IMG
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-base font-semibold text-zinc-100">
                              {item.name}
                            </span>
                            <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300">
                              Directing
                            </span>
                          </div>

                          {item.known_for_titles?.length ? (
                            <div className="mt-1 truncate text-sm text-zinc-400">
                              대표작: {item.known_for_titles.join(' · ')}
                            </div>
                          ) : (
                            <div className="mt-1 text-sm text-zinc-500">대표작 정보 없음</div>
                          )}
                        </div>

                        <div className="shrink-0 text-sm text-zinc-400">
                          {rowSaving ? '이동…' : '선택'}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}