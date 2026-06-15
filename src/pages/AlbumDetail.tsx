import { Link, useParams } from 'react-router-dom';
import { getPosts, SOURCES } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../hooks/useLibrary';
import { useFollowing } from '../hooks/useFollowing';
import { ReportAction } from '../components/ReportAction';

function label(type: string) { return type === 'dispatch' ? 'Dispatch' : type === 'signal' ? 'Signal' : type === 'source' ? 'Source' : 'External Link'; }

export default function AlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { albums, albumItems, removeFromAlbum } = useLibrary();
  const { isFollowing, toggleFollow } = useFollowing();
  const album = albums.find((candidate) => candidate.id === id);
  if (!album) return <div className="mx-auto max-w-3xl p-6 text-sm text-slate-500">Album unavailable or private.</div>;
  const isOwner = user?.id === album.ownerId;
  if (album.privacy === 'private' && !isOwner) return <div className="mx-auto max-w-3xl p-6 text-sm text-slate-500">Album unavailable or private.</div>;
  const items = albumItems.filter((item) => item.albumId === album.id);
  return <div className="mx-auto max-w-3xl px-4 pb-24 pt-6"><Link to="/library" className="text-sm text-emerald-600 hover:underline">Back to Library</Link><div className="my-5 rounded-2xl border border-slate-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs uppercase dark:bg-zinc-800">{album.privacy}</span>{!isOwner && <ReportAction targetType="album" targetId={album.id} entityName={album.title} />}</div><h1 className="mt-3 text-3xl font-black">{album.title}</h1>{album.description && <p className="mt-2 text-slate-600 dark:text-zinc-400">{album.description}</p>}<div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500"><span>By @{album.ownerUsername ?? 'owner'} · Created {new Date(album.createdAt).toLocaleString()} · Updated {new Date(album.updatedAt).toLocaleString()}</span>{album.privacy === 'public' && <><span>{isFollowing('album', album.id) ? 1 : 0} followers</span><button onClick={() => toggleFollow('album', album.id)} className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600">{isFollowing('album', album.id) ? 'Following' : 'Follow'}</button></>}</div></div><div className="space-y-3">{items.map((item) => { const post = getPosts().find((p) => p.id === item.savedItemId); const source = SOURCES.find((s) => s.id === item.savedItemId); const title = post?.title ?? source?.title ?? item.savedItemId; const href = post ? `/post/${post.id}` : source?.url; return <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex justify-between gap-3"><div><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase dark:bg-zinc-800">{label(item.savedItemType)}</span><h2 className="mt-2 font-bold">{title || `${label(item.savedItemType)} unavailable`}</h2>{href && <a href={href} className="text-sm text-emerald-600 hover:underline">Open</a>}</div>{isOwner && <button onClick={() => removeFromAlbum(item.id)} className="text-sm text-slate-500 hover:text-red-600">Remove</button>}</div></div>; })}{items.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500 dark:border-zinc-800">No items in this album.</div>}</div></div>;
}
