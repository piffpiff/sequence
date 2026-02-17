'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { searchDirectors, upsertDirector } from '@/app/actions/director';
import { AlertCircle, ArrowRight, Search, User } from 'lucide-react';

type SearchItem = Awaited<ReturnType<typeof searchDirectors>>[number];

export default function DirectorSearchForm() {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [savingTmdbId, setSavingTmdbId] = useState<number | null>(null);
  const [mode, setMode] = useState<'idle' | 'searching' | 'saving'>('idle');

  const [isPending, startTransition] = useTransition();

  const canSearch = useMemo(() => query.trim().length > 0 && mode === 'idle', [query, mode]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const q = query.trim();
    if (!q) {
      setHasSearched(false);
      setResults([]);
      return;
    }

    setHasSearched(true);
    setMode('searching');

    startTransition(async () => {
      try {
        const data = await searchDirectors(q);
        setResults(data);
      } catch (err) {
        setResults([]);
        setError(err instanceof Error ? err.message : '검색 중 오류가 발생했어요.');
      } finally {
        setMode('idle');
      }
    });
  };

  const onPick = (item: SearchItem) => {
    setError(null);
    setSavingTmdbId(item.tmdb_id);
    setMode('saving');

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
        setMode('idle');
      }
    });
  };

  return (
    <section className="w-full">
      {/* 제목/설명 */}
      <div className="border-2 border-zinc-700 bg-zinc-950 p-4 sm:p-5">
        <h2 className="text-2xl font-bold text-zinc-50">감독 검색</h2>
        <p className="mt-2 text-base text-zinc-300">
          TMDB에서 <span className="font-semibold text-zinc-100">Directing</span> 인물만 보여줘요.
          선택하면 DB에 저장하고 감독 페이지로 이동해요.
        </p>

        {/* 검색 폼 */}
        <form onSubmit={onSubmit} className="mt-4">
          <label htmlFor="director-search" className="block text-base font-semibold text-zinc-100">
            감독 이름
          </label>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="flex w-full items-center gap-2 border-2 border-zinc-700 bg-black px-3 py-3">
              <Search className="h-6 w-6 shrink-0 text-zinc-300" />
              <input
                id="director-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="예: 봉준호, 박찬욱, 고레에다 히로카즈…"
                className="w-full bg-transparent text-lg font-semibold text-zinc-50 outline-none placeholder:text-zinc-400"
                autoComplete="off"
                inputMode="search"
              />
            </div>

            <button
              type="submit"
              disabled={!canSearch}
              className="inline-flex items-center justify-center gap-2 border-2 border-zinc-700 bg-zinc-100 px-5 py-3 text-lg font-bold text-zinc-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search className="h-6 w-6" />
              {mode === 'searching' || isPending ? '검색 중…' : '검색'}
            </button>
          </div>

          {error ? (
            <div className="mt-4 flex items-start gap-2 border-2 border-red-900 bg-red-950/40 p-4 text-base">
              <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" />
              <div className="font-semibold">{error}</div>
            </div>
          ) : null}
        </form>
      </div>

      {/* 검색 결과 */}
      <div className="mt-4">
        <div className="flex items-end justify-between border-b-2 border-zinc-700 pb-2">
          <h3 className="text-xl font-bold text-zinc-50">검색 결과</h3>
          <div className="text-base text-zinc-300">
            {results.length ? `${results.length}명` : hasSearched ? '0명' : ''}
          </div>
        </div>

        {!hasSearched ? (
          <div className="mt-4 border-2 border-zinc-700 bg-zinc-950 p-5">
            <p className="text-lg font-semibold">검색어를 입력하고 검색을 누르세요.</p>
            <p className="mt-2 text-base text-zinc-300">
              결과를 클릭하면 감독이 DB에 저장돼요.
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="mt-4 border-2 border-zinc-700 bg-zinc-950 p-5">
            <p className="text-lg font-semibold">검색 결과가 없습니다.</p>
            <p className="mt-2 text-base text-zinc-300">
              철자/띄어쓰기를 바꿔서 다시 검색해 보세요.
            </p>
          </div>
        ) : (
          <ul className="mt-4 border-2 border-zinc-700 bg-zinc-950 divide-y-2 divide-zinc-700">
            {results.map((item) => {
              const isSavingThis = mode === 'saving' && savingTmdbId === item.tmdb_id;
              const knownFor = item.known_for_titles?.length ? item.known_for_titles.join(' · ') : null;

              return (
                <li key={item.tmdb_id}>
                  <button
                    type="button"
                    onClick={() => onPick(item)}
                    disabled={mode !== 'idle' && !isSavingThis}
                    className="w-full p-4 text-left hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div className="flex gap-4">
                      {/* 이미지 */}
                      <div className="h-14 w-14 shrink-0 overflow-hidden border-2 border-zinc-700 bg-black">
                        {item.profile_image_url ? (
                          <img
                            src={item.profile_image_url}
                            alt={`${item.name} 프로필`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xl font-bold text-zinc-200">
                            {item.name?.[0] ?? '?'}
                          </div>
                        )}
                      </div>

                      {/* 텍스트 */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <span className="inline-flex items-center gap-2 text-xl font-bold text-zinc-50">
                            <User className="h-6 w-6" />
                            <span className="truncate">{item.name}</span>
                          </span>

                          <span className="border border-zinc-700 bg-black px-3 py-1 text-base font-semibold text-zinc-200">
                            Directing
                          </span>

                          {typeof item.popularity === 'number' ? (
                            <span className="text-base text-zinc-300">
                              인기 {Math.round(item.popularity)}
                            </span>
                          ) : null}
                        </div>

                        {knownFor ? (
                          <p className="mt-2 text-base text-zinc-300">
                            대표작: <span className="font-semibold text-zinc-100">{knownFor}</span>
                          </p>
                        ) : (
                          <p className="mt-2 text-base text-zinc-300">대표작 정보 없음</p>
                        )}
                      </div>

                      {/* 우측 상태 */}
                      <div className="shrink-0 self-center">
                        <span className="inline-flex items-center gap-2 border-2 border-zinc-700 bg-zinc-100 px-4 py-2 text-base font-bold text-zinc-900">
                          {isSavingThis ? '저장 중…' : '선택'}
                          <ArrowRight className="h-6 w-6" />
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-4 text-base text-zinc-300">
        * 선택 시 directors 테이블에 저장(upsert) 후 해당 감독 페이지로 이동합니다.
      </p>
    </section>
  );
}