import { useMemo, useState } from "react";
import { Clock3, Play, PlayCircle } from "lucide-react";
import { AccountLayout, CARD } from "../../user/components/account/AccountKit.jsx";
import { VIDEO_GUIDES, toYouTubeId } from "../videoGuides.js";
import { cn } from "../../../utils/cn.js";

/*
 * Profile → Video guides. Short walkthroughs of how Unideals works.
 * Videos play inline: each card is a lightweight thumbnail until clicked,
 * then swaps to a privacy-enhanced YouTube embed (youtube-nocookie) that
 * autoplays in place, so nobody leaves the site and no YouTube code loads
 * until someone actually presses play. One video plays at a time.
 * Content lives in features/help/videoGuides.js.
 */

function Player({ guide, id, playing, onPlay }) {
  if (!id) {
    return (
      <div className="relative grid aspect-video place-items-center bg-[var(--accent-soft)]">
        <div className="flex flex-col items-center gap-2 text-[var(--accent-text)]">
          <PlayCircle className="h-9 w-9 opacity-70" strokeWidth={1.5} aria-hidden="true" />
          <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11.5px] font-medium text-slate-600 dark:bg-white/10 dark:text-zinc-300">
            Coming soon
          </span>
        </div>
      </div>
    );
  }

  if (playing) {
    return (
      <div className="relative aspect-video bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={guide.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Play video: ${guide.title}`}
      className="group relative block aspect-video w-full overflow-hidden bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-ring)]"
    >
      <img
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
      <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[var(--accent)] shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:scale-105">
        <Play className="ml-0.5 h-6 w-6" fill="currentColor" aria-hidden="true" />
      </span>
      {guide.duration && (
        <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11.5px] font-medium tabular-nums text-white">
          <Clock3 className="h-3 w-3" aria-hidden="true" />
          {guide.duration}
        </span>
      )}
    </button>
  );
}

export default function VideoGuides() {
  const guides = useMemo(() => VIDEO_GUIDES.map((g) => ({ ...g, id: toYouTubeId(g.youtubeId) })), []);
  const topics = useMemo(() => [...new Set(guides.map((g) => g.topic).filter(Boolean))], [guides]);
  const [topic, setTopic] = useState("All");
  const [playing, setPlaying] = useState(null);

  // Ready videos first, "Coming soon" after; then the chosen topic.
  const visible = guides
    .filter((g) => topic === "All" || g.topic === topic)
    .sort((a, b) => Number(Boolean(b.id)) - Number(Boolean(a.id)));

  return (
    <AccountLayout
      seoTitle="Video guides | Unideals"
      title="Video guides"
      description="Short walkthroughs of how Unideals works. They play right here."
      width="xl"
    >
      {topics.length > 1 && (
        <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Filter by topic">
          {["All", ...topics].map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={topic === t}
              onClick={() => setTopic(t)}
              className={cn(
                "h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
                topic === t
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                  : "border-neutral-200 bg-white text-slate-600 hover:border-neutral-300 hover:text-slate-900 dark:border-neutral-700 dark:bg-transparent dark:text-zinc-300 dark:hover:text-white",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className={cn(CARD, "px-6 py-12 text-center")}>
          <PlayCircle className="mx-auto h-9 w-9 text-slate-300 dark:text-zinc-600" aria-hidden="true" />
          <p className="mt-3 text-[15px] font-semibold text-slate-900 dark:text-white">Video guides are on the way</p>
          <p className="mt-1 text-[13.5px] text-slate-500 dark:text-zinc-400">Check back soon for quick walkthroughs.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:gap-5 md:grid-cols-2">
          {visible.map((g) => (
            <li key={g.key} className={cn(CARD, "overflow-hidden")}>
              <Player guide={g} id={g.id} playing={playing === g.key} onPlay={() => setPlaying(g.key)} />
              <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                <p className="text-[12px] font-medium text-[var(--accent-text)]">{g.topic}</p>
                <h2 className="mt-0.5 text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">{g.title}</h2>
                <p className="mt-1 text-[13.5px] leading-relaxed text-slate-500 dark:text-zinc-400">{g.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountLayout>
  );
}
