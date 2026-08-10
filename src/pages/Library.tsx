import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Check, ExternalLink, Folder, FolderPlus, Globe, Lock, Plus, Search, Trash2, X } from 'lucide-react';
import { SOURCES } from '../data/mockData';
import { usePosts } from '../context/PostsContext';
import { useAuth } from '../context/AuthContext';
import { useSaved, type SavedItem as HookSavedItem } from '../hooks/useSaved';
import { useLibrary } from '../hooks/useLibrary';
import { EmptyState } from '../components/EmptyState';
import type { SavedItem, SavedItemType } from '../services/types';
import { usePageMeta } from '../hooks/usePageMeta';

type Filter = 'all' | 'dispatch' | 'signal' | 'source' | 'album';

function normalizeSavedType(type: string, postType?: string): SavedItemType {
  if (type === 'Dispatch' || type === 'dispatch') return 'dispatch';
  if (type === 'Signal' || type === 'signal') return 'signal';
  if (type === 'source') return 'source';
  if (type === 'external_link') return 'external_link';
  if (type === 'post' && postType === 'Dispatch') return 'dispatch';
  if (type === 'post' && postType === 'Signal') return 'signal';
  return type as SavedItemType;
}

function label(type: string) {
  return type === 'dispatch' ? 'Dispatch' : type === 'signal' ? 'Signal' : type === 'source' || type === 'external_link' ? 'Source' : 'Album';
}

// Per-type accents (full literal strings so Tailwind purge keeps them):
// Dispatch blue, Signal purple, Source amber, Album teal.
function typeBadgeClass(type: string) {
  if (type === 'dispatch') return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300';
  if (type === 'signal') return 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300';
  if (type === 'source' || type === 'external_link') return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
  return 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300';
}

function filterChipActiveClass(tab: Filter) {
  if (tab === 'dispatch') return 'bg-blue-700 text-white dark:bg-blue-600';
  if (tab === 'signal') return 'bg-purple-700 text-white dark:bg-purple-600';
  if (tab === 'source') return 'bg-amber-600 text-white dark:bg-amber-600';
  if (tab === 'album') return 'bg-teal-700 text-white dark:bg-teal-600';
  return 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950';
}

export default function Library() {
  usePageMeta('Library', 'Your saved posts, sources, and albums.');
  const { status } = useAuth();
  const { savedItems, unsaveItem } = useSaved();
  const { posts: allPosts } = usePosts();
  const { albums, albumItems, createAlbum, deleteAlbum, addToAlbum, removeFromAlbum } = useLibrary();
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [query, setQuery] = useState('');
  const [showAlbumForm, setShowAlbumForm] = useState(false);

  const resolved = savedItems.map((item) => {
    const post = allPosts.find((p) => p.id === item.id);
    const source = SOURCES.find((s) => s.id === item.id);
    const type = normalizeSavedType(item.type, post?.type);
    return { ...item, type, title: item.title ?? post?.title ?? source?.title, description: item.description ?? post?.content, url: item.url ?? source?.url, siteName: item.siteName ?? source?.publisher, author: item.siteName ?? post?.author.displayName ?? post?.author.username, originalCreatedAt: item.originalCreatedAt ?? post?.createdAt, unavailable: (type === 'dispatch' || type === 'signal') && !post };
  });

  const rows = useMemo(() => {
    const albumRows = albums.map((album) => ({ ...album, type: 'album' as const, savedAt: album.updatedAt }));
    return [...resolved, ...albumRows]
      .filter((item) => filter === 'all' || item.type === filter || (filter === 'source' && item.type === 'external_link'))
      .filter((item) => `${'title' in item ? item.title : ''} ${'description' in item ? item.description ?? '' : ''} ${'siteName' in item ? item.siteName ?? '' : ''} ${'relatedName' in item ? item.relatedName ?? '' : ''}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => sort === 'newest' ? new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime() : new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime());
  }, [albums, filter, query, resolved, sort]);

  async function submitAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // currentTarget is nulled once the handler yields, so capture it pre-await.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const title = String(form.get('title') ?? '').trim();
    if (!title) return;
    await createAlbum({ title, description: String(form.get('description') ?? '').trim() || undefined, privacy: form.get('privacy') === 'public' ? 'public' : 'private' });
    formElement.reset();
    setShowAlbumForm(false);
  }


  if (status !== 'authenticated' && status !== 'unconfigured') {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-16">
        <EmptyState
          icon={Bookmark}
          title="Your Library is private"
          description="Sign in to save substances, stacks, and posts, and to organize them into albums."
          action={{ label: 'Sign in', to: `/login?returnTo=${encodeURIComponent('/library')}` }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div><h1 className="text-3xl font-black">Library</h1><p className="text-sm text-slate-500 dark:text-zinc-400">Private saved posts, sources, links, and albums.</p></div>
        <button onClick={() => setShowAlbumForm((v) => !v)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200">
          {showAlbumForm ? <X size={16} /> : <Plus size={16} />}
          {showAlbumForm ? 'Cancel' : 'New album'}
        </button>
      </div>
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Library" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 dark:border-zinc-800 dark:bg-zinc-900" /></label>
        <select value={sort} onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">{(['all','dispatch','signal','source','album'] as Filter[]).map((tab) => <button key={tab} onClick={() => setFilter(tab)} className={`rounded-full px-4 py-2 text-sm font-medium ${filter === tab ? filterChipActiveClass(tab) : 'bg-white text-slate-600 dark:bg-zinc-900 dark:text-zinc-400'}`}>{tab === 'all' ? 'All saved' : label(tab)}</button>)}</div>
      {showAlbumForm && (
        <div className="mb-6">
          <form onSubmit={submitAlbum} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><h2 className="mb-3 flex items-center gap-2 font-bold"><Folder size={16}/> Create album</h2><input name="title" required placeholder="Album title" className="mb-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"/><textarea name="description" placeholder="Optional description" className="mb-2 h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"/><select name="privacy" defaultValue="private" className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"><option value="private">Private</option><option value="public">Public</option></select><button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Create album</button></form>
        </div>
      )}
      <div className="space-y-3">{rows.map((item) => 'ownerId' in item ? <div key={`album-${item.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex justify-between gap-3"><div className="min-w-0"><span className="mb-2 flex flex-wrap items-center gap-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${typeBadgeClass('album')}`}>Album</span><AlbumPrivacyBadge privacy={item.privacy} /></span><Link to={`/library/albums/${item.id}`} className="block font-bold hover:underline">{item.title}</Link>{item.description && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500 dark:text-zinc-400">{item.description}</p>}</div><button onClick={() => deleteAlbum(item.id)} title="Delete album" className="self-start text-slate-400 transition-colors hover:text-red-500"><Trash2 size={16}/></button></div></div> : <SavedRow key={`${item.type}-${item.id}`} item={item} albums={albums} albumItems={albumItems} onUnsave={() => unsaveItem(item.id, item.type)} onAdd={addToAlbum} onRemove={removeFromAlbum} />)}{rows.length === 0 && (
        <EmptyState
          icon={Bookmark}
          title={query || filter !== 'all' ? 'Nothing matches' : 'Nothing saved yet'}
          description={query || filter !== 'all' ? 'Try a different search or filter.' : 'Tap the bookmark on any post, substance, or source to save it here — and organize saves into albums.'}
          action={query || filter !== 'all' ? undefined : { label: 'Explore the Square', to: '/square' }}
        />
      )}</div>
    </div>
  );
}

function AlbumPrivacyBadge({ privacy }: { privacy: 'private' | 'public' }) {
  const isPrivate = privacy !== 'public';
  return (
    <span
      title={isPrivate ? 'Only you can see this album.' : 'Anyone can view this album.'}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${isPrivate ? 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}
    >
      {isPrivate ? <Lock size={11} strokeWidth={2.5} /> : <Globe size={11} strokeWidth={2.5} />}
      {isPrivate ? 'Private' : 'Public'}
      <span className="hidden font-medium text-slate-500 dark:text-zinc-400 sm:inline">· {isPrivate ? 'only you' : 'anyone can view'}</span>
    </span>
  );
}

function SavedRow({ item, albums, albumItems, onUnsave, onAdd, onRemove }: { item: HookSavedItem & { unavailable?: boolean }; albums: { id: string; title: string }[]; albumItems: { id: string; albumId: string; savedItemType: SavedItemType; savedItemId: string }[]; onUnsave: () => void; onAdd: (albumId: string, item: SavedItem) => void | Promise<void>; onRemove: (albumItemId: string) => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const type = item.type.toLowerCase() as SavedItemType;
  const linked = type === 'dispatch' || type === 'signal' ? `/post/${item.id}` : item.url;
  const current = albumItems.filter((albumItem) => albumItem.savedItemType === type && albumItem.savedItemId === item.id);
  const content = <><span className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${typeBadgeClass(type)}`}>{label(type)}</span><h3 className="font-bold">{item.unavailable ? 'Post unavailable' : item.title ?? item.id}</h3>{item.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-zinc-400">{item.description}</p>}<p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">{[!item.unavailable && item.relatedName ? item.relatedName : null, !item.unavailable && item.siteName ? item.siteName : null, `Saved ${new Date(item.savedAt).toLocaleDateString()}`].filter(Boolean).join(' · ')}</p></>;
  const body = linked && !item.unavailable && (type === 'dispatch' || type === 'signal') ? <Link to={linked} className="block flex-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40">{content}</Link> : <div className="flex-1">{content}{linked && !item.unavailable && <a href={linked} className="mt-2 inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline"><ExternalLink size={14}/> Source</a>}</div>;
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
    <div className="flex justify-between gap-3">{body}<button onClick={onUnsave} title="Unsave"><Bookmark className="fill-current text-emerald-500" size={18}/></button></div>
    <div className="relative mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setPickerOpen((v) => !v)}
          aria-expanded={pickerOpen}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${pickerOpen ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800'}`}
        >
          <FolderPlus size={13} />
          Albums{current.length > 0 && <span className="rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">{current.length}</span>}
        </button>
        {current.map((albumItem) => (
          <span key={albumItem.id} className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
            <Folder size={11} />
            {albums.find((a) => a.id === albumItem.albumId)?.title ?? 'Album'}
          </span>
        ))}
      </div>
      {pickerOpen && (
        <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <p className="px-2 pb-2 pt-1 text-xs text-slate-500 dark:text-zinc-400">Save to as many albums as you like.</p>
          {albums.length === 0 && <p className="px-2 pb-2 text-xs text-slate-500 dark:text-zinc-400">No albums yet — create one with “New album” above.</p>}
          <div className="max-h-56 space-y-0.5 overflow-y-auto">
            {albums.map((album) => {
              const membership = current.find((albumItem) => albumItem.albumId === album.id);
              return (
                <button
                  key={album.id}
                  onClick={() => membership ? onRemove(membership.id) : onAdd(album.id, { itemId: item.id, itemType: type, title: item.title, url: item.url, description: item.description })}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${membership ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-zinc-600'}`}>
                    {membership && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className="truncate">{album.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  </div>;
}
