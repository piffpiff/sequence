'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { searchDirectors, upsertDirector } from '@/app/actions/director';

type SearchItem = Awaited<ReturnType<typeof searchDirectors>>[number];

export default function DirectorSearchForm() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [savingTmdbId, setSavingTmdbId] = useState<number | null>(null);

  const canSearch = useMemo(() => query.trim().length > 0 && !isPending, [query, isPending]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }

    startTransition(async () => {
      try {
        const data = await searchDirectors(q);
        setResults(data);
      } catch (err) {
        setResults([]);
        setError(err instanceof Error ? err.message : '검색 중 오류가 발생했어요.');
      }
    });
  };

  const onPick = (item: SearchItem) => {
    setError(null);
    setSavingTmdbId(item.tmdb_id);

    startTransition(async () => {
      try {
        const directorId = await upsertDirector({
          tmdb_id: item.tmdb_id,
          name: item.name,
          profile_path: item.profile_path,
          profile_image_url: item.profile_image_url,
        });

        router.push(`/directors/${directorId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : '저장 중 오류가 발생했어요.');
        setSavingTmdbId(null);
      }
    });
  };

  return (
    <section className="w-full max-w-xl mx-auto">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-sm">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-200">감독 검색</h2>
          <p className="mt-1 text-xs text-zinc-400">TMDB에서 감독(Directing)만 필터링해 보여줘요.</p>
        </div>

        <form onSubmit={onSubmit} className="p-4">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="감독 이름을 입력… (예: 봉준호)"
              className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600"
              aria-label="감독 검색어"
            />
            <button
              type="submit"
              disabled={!canSearch}
              className="rounded-lg px-4 py-2 text-sm font-medium
                         bg-zinc-100 text-zinc-900
                         hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? '검색 중…' : '검색'}
            </button>
          </div>

          {error ? (
            <div className="mt-3 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-4">
            {results.length === 0 ? (
              <div className="text-xs text-zinc-500">
                {query.trim() ? '검색 결과가 없어요.' : '검색어를 입력하고 검색을 눌러주세요.'}
              </div>
            ) : (
              <ul className="overflow-hidden rounded-lg border border-zinc-800 divide-y divide-zinc-800">
                {results.map((item) => {
                  const isSaving = savingTmdbId === item.tmdb_id;

                  return (
                    <li key={item.tmdb_id}>
                      <button
                        type="button"
                        onClick={() => onPick(item)}
                        disabled={isPending}
                        className="w-full flex items-center gap-3 p-3 text-left
                                   bg-zinc-950 hover:bg-zinc-900
                                   disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                          {item.profile_image_url ? (
                            <img
                              src={item.profile_image_url}
                              alt={`${item.name} 프로필`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-full w-full grid place-items-center text-[10px] text-zinc-400">
                              NO IMG
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-zinc-100">
                              {item.name}
                            </span>
                            <span className="shrink-0 rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300">
                              Directing
                            </span>
                          </div>

                          {item.known_for_titles?.length ? (
                            <div className="mt-1 truncate text-xs text-zinc-400">
                              대표작: {item.known_for_titles.join(' · ')}
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-zinc-500">대표작 정보 없음</div>
                          )}
                        </div>

                        <div className="shrink-0 text-xs text-zinc-400">
                          {isSaving ? '저장…' : '선택'}
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

      <p className="mt-3 text-[11px] text-zinc-500">
        선택 시 directors 테이블에 upsert 후 해당 감독 페이지로 이동해요.
      </p>
    </section>
  );
}