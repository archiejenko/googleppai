import { useState, useEffect } from 'react';
import { X, Star, BookOpen, Clock, ChevronRight, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import FilterBar from '../../components/shared/FilterBar';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     '#22c55e',
  Intermediate: '#f59e0b',
  Advanced:     '#ef4444',
};

interface Article {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  readTime: number;
  lastUpdated: string;
  content: string;
  tags: string[];
}

interface DbArticle {
  id: string;
  title: string;
  category: string;
  difficulty: string | null;
  read_time_minutes: number | null;
  content: string | null;
  tags: string[];
  created_at: string;
}

function mapArticle(row: DbArticle): Article {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    difficulty: row.difficulty || 'Beginner',
    readTime: row.read_time_minutes || 5,
    lastUpdated: new Date(row.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    content: row.content || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
  };
}

function ArticlePane({ article, onClose }: { article: Article; onClose: () => void }) {
  const [completed, setCompleted] = useState(false);
  const paragraphs = (article.content || '').split('\n\n').filter(Boolean);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-screen w-[540px] bg-[rgb(var(--bg-surface))] border-l-2 border-[rgb(var(--border-default))] z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b border-[rgb(var(--border-default))]">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--accent-primary))]">
              {article.category}
            </span>
            <span
              className="text-xs px-2 py-0.5 font-bold border"
              style={{
                color: DIFFICULTY_COLORS[article.difficulty] || '#94a3b8',
                borderColor: DIFFICULTY_COLORS[article.difficulty] || '#94a3b8',
                background: `${DIFFICULTY_COLORS[article.difficulty] || '#94a3b8'}18`,
              }}
            >
              {article.difficulty}
            </span>
          </div>
          <h2 className="text-lg font-black text-[rgb(var(--text-primary))]">{article.title}</h2>
          <p className="text-xs text-[rgb(var(--text-muted))] mt-1">
            <Clock className="w-3 h-3 inline mr-1" />{article.readTime} min read · Updated {article.lastUpdated}
          </p>
        </div>
        <button onClick={onClose} className="flex-shrink-0 p-1 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {paragraphs.length === 0 ? (
          <p className="text-sm text-[rgb(var(--text-muted))] italic">No content available for this article yet.</p>
        ) : (
          paragraphs.map((p, i) => {
            if (p.startsWith('## ')) {
              return <h3 key={i} className="text-base font-black text-[rgb(var(--text-primary))] mt-4 uppercase tracking-tight">{p.slice(3)}</h3>;
            }
            if (p.startsWith('### ')) {
              return <h4 key={i} className="text-sm font-black text-[rgb(var(--accent-primary))] uppercase tracking-widest">{p.slice(4)}</h4>;
            }
            return <p key={i} className="text-sm text-[rgb(var(--text-secondary))] leading-relaxed">{p}</p>;
          })
        )}

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-[rgb(var(--border-default))]">
            {article.tags.map(tag => (
              <span key={tag} className="px-2 py-1 text-xs text-[rgb(var(--text-muted))] border border-[rgb(var(--border-default))]">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="p-6 border-t border-[rgb(var(--border-default))]">
        <button
          onClick={() => setCompleted(c => !c)}
          className={`w-full flex items-center justify-center gap-2 font-black py-3 border-2 transition-all
            ${completed
              ? 'bg-[rgb(var(--accent-primary)/0.15)] border-[rgb(var(--accent-primary))] text-[rgb(var(--accent-primary))]'
              : 'btn-primary'
            }`}
        >
          <BookOpen className="w-4 h-4" />
          {completed ? 'Completed ✓' : 'Mark as Complete'}
        </button>
      </div>
    </motion.div>
  );
}

export default function LibraryPage() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase
      .from('library_articles')
      .select('id, title, category, difficulty, read_time_minutes, content, tags, created_at')
      .eq('published', true)
      .order('category', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setArticles((data as DbArticle[]).map(mapArticle));
        setLoading(false);
      });
  }, []);

  // Load persisted bookmarks
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('user_bookmarks')
      .select('article_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setBookmarked(new Set(data.map((b: { article_id: string }) => b.article_id)));
      });
  }, [user?.id]);

  const toggleBookmark = async (articleId: string) => {
    if (!user?.id) return;
    const isBookmarked = bookmarked.has(articleId);
    setBookmarked(prev => {
      const next = new Set(prev);
      isBookmarked ? next.delete(articleId) : next.add(articleId);
      return next;
    });
    if (isBookmarked) {
      await supabase.from('user_bookmarks').delete()
        .eq('user_id', user.id).eq('article_id', articleId);
    } else {
      await supabase.from('user_bookmarks').upsert({ user_id: user.id, article_id: articleId });
    }
  };

  const categories = Array.from(new Set(articles.map(a => a.category))).sort();

  const filtered = articles.filter(a => {
    const matchSearch = search === '' || a.title.toLowerCase().includes(search.toLowerCase()) || a.tags.some(t => t.includes(search.toLowerCase()));
    const matchCat    = !activeCategory || a.category === activeCategory;
    const matchBM     = !bookmarksOnly || bookmarked.has(a.id);
    return matchSearch && matchCat && matchBM;
  });

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-[rgb(var(--text-primary))] uppercase tracking-tight">Library</h1>
          <p className="text-sm text-[rgb(var(--text-muted))] mt-0.5">Scripts, playbooks, and resources</p>
        </div>
      </div>

      {/* Search + Bookmarks toggle */}
      <div className="flex items-center gap-4 mb-6">
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search articles, tags..."
          className="flex-1"
        />
        <button
          onClick={() => setBookmarksOnly(b => !b)}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border transition-colors
            ${bookmarksOnly
              ? 'bg-[rgb(var(--accent-primary)/0.15)] border-[rgb(var(--accent-primary))] text-[rgb(var(--accent-primary))]'
              : 'border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]'
            }`}
        >
          <Star className="w-3.5 h-3.5" /> Bookmarks
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] animate-pulse" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="flex gap-6">
          {/* Left: Category tree */}
          <div className="w-52 flex-shrink-0">
            <p className="text-xs font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-3">Categories</p>
            <div className="space-y-0.5">
              <button
                onClick={() => setActiveCategory(null)}
                className={`w-full text-left px-3 py-2 text-sm font-bold flex items-center gap-2 transition-colors
                  ${!activeCategory ? 'bg-[rgb(var(--accent-primary)/0.1)] text-[rgb(var(--accent-primary))] border-l-2 border-[rgb(var(--accent-primary))]' : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-raised))]'}`}
              >
                <Folder className="w-3.5 h-3.5" /> All
                <span className="ml-auto text-xs opacity-60">{articles.length}</span>
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                  className={`w-full text-left px-3 py-2 text-sm font-bold flex items-center gap-2 transition-colors
                    ${activeCategory === cat ? 'bg-[rgb(var(--accent-primary)/0.1)] text-[rgb(var(--accent-primary))] border-l-2 border-[rgb(var(--accent-primary))]' : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-raised))]'}`}
                >
                  <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{cat}</span>
                  <span className="ml-auto text-xs opacity-60 flex-shrink-0">
                    {articles.filter(a => a.category === cat).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Articles grid */}
          <div className="flex-1 min-w-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <BookOpen className="w-10 h-10 text-[rgb(var(--text-muted))] mb-4" />
                <p className="text-[rgb(var(--text-muted))]">
                  {articles.length === 0 ? 'No articles published yet' : 'No articles found'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((article, i) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelectedArticle(article)}
                    className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border-default))] p-4 cursor-pointer
                      hover:border-[rgb(var(--accent-primary)/0.4)] transition-colors group relative"
                  >
                    {/* Bookmark star */}
                    <button
                      onClick={e => { e.stopPropagation(); toggleBookmark(article.id); }}
                      className="absolute top-3 right-3 p-1 text-[rgb(var(--text-muted))] hover:text-[rgb(var(--accent-primary))] transition-colors"
                    >
                      <Star
                        className="w-4 h-4"
                        fill={bookmarked.has(article.id) ? 'currentColor' : 'none'}
                        color={bookmarked.has(article.id) ? '#ff6b6b' : undefined}
                      />
                    </button>

                    <span className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--accent-primary))] block mb-2 pr-6">
                      {article.category}
                    </span>

                    <h3 className="text-sm font-black text-[rgb(var(--text-primary))] group-hover:text-[rgb(var(--accent-primary))] transition-colors mb-3 leading-tight">
                      {article.title}
                    </h3>

                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="text-xs px-1.5 py-0.5 border font-bold"
                        style={{
                          color: DIFFICULTY_COLORS[article.difficulty] || '#94a3b8',
                          borderColor: DIFFICULTY_COLORS[article.difficulty] || '#94a3b8',
                          background: `${DIFFICULTY_COLORS[article.difficulty] || '#94a3b8'}18`,
                        }}
                      >
                        {article.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[rgb(var(--text-muted))]">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime} min</span>
                      <span>{article.lastUpdated}</span>
                    </div>

                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-[rgb(var(--border-default))] text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--accent-primary))] transition-colors text-xs">
                      Read article <ChevronRight className="w-3 h-3" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reading Pane */}
      <AnimatePresence>
        {selectedArticle && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSelectedArticle(null)} />
            <ArticlePane article={selectedArticle} onClose={() => setSelectedArticle(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
