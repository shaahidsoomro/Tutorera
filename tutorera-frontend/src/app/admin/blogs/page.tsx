"use client";
import api from "@/lib/axios";
import { UI_COLORS } from "@/lib/brand";
import { showError,showSuccess } from "@/lib/toast";
import { Edit,Eye,Plus,Trash2 } from "lucide-react";
import { useEffect,useState } from "react";

const C = UI_COLORS;

interface Blog {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  isPublished: boolean;
  createdAt: string;
  author: { name: string };
}

export default function AdminBlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBlog, setEditBlog] = useState<Blog | null>(null);
  const [form, setForm] = useState({ title: '', slug: '', excerpt: '', content: '', tags: '' });
  const [saving, setSaving] = useState(false);

  const fetchBlogs = async () => {
    try {
      const res = await api.get('/blogs?limit=50');
      setBlogs(res.data.blogs);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBlogs(); }, []);

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleSubmit = async () => {
    if (!form.title || !form.content || !form.excerpt) {
      showError("Please fill title, excerpt and content");
      return;
    }
    setSaving(true);
    try {
      const data = {
        title: form.title,
        slug: form.slug || generateSlug(form.title),
        excerpt: form.excerpt,
        content: form.content,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        isPublished: true,
      };
      if (editBlog) {
        await api.put(`/blogs/${editBlog._id}`, data);
      } else {
        await api.post('/blogs', data);
      }
      setShowForm(false);
      setEditBlog(null);
      setForm({ title: '', slug: '', excerpt: '', content: '', tags: '' });
      fetchBlogs();
      showSuccess(editBlog ? 'Blog post updated successfully.' : 'Blog post created successfully.');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showError(e.response?.data?.message || 'Failed to save blog');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog post?')) return;
    try {
      await api.delete(`/blogs/${id}`);
      fetchBlogs();
      showSuccess('Blog post deleted successfully.');
    } catch { showError('Failed to delete blog post.'); }
  };

  const handleEdit = (blog: Blog) => {
    setEditBlog(blog);
    setForm({
      title: blog.title,
      slug: blog.slug,
      excerpt: blog.excerpt,
      content: '',
      tags: '',
    });
    setShowForm(true);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: C.primary }}>Blog Posts</h1>
          <p style={{ color: C.gray500, fontSize: '0.875rem' }}>Manage blog content for TUTORERA®</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditBlog(null); setForm({ title: '', slug: '', excerpt: '', content: '', tags: '' }); }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', backgroundColor: C.accent, color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>
          <Plus size={16} /> New Post
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '2rem', border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
          <h2 style={{ fontWeight: '700', color: C.primary, marginBottom: '1.5rem' }}>
            {editBlog ? 'Edit Blog Post' : 'New Blog Post'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Title *</label>
              <input value={form.title} onChange={e => {
                setForm({ ...form, title: e.target.value, slug: generateSlug(e.target.value) });
              }}
                placeholder="Blog post title"
                style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Slug (URL)</label>
              <input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                placeholder="auto-generated-from-title"
                style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', color: C.gray500 }}
                onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Excerpt * (short description)</label>
              <textarea value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })}
                rows={2} placeholder="Brief description shown in blog listing..."
                style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
                onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>
                Content * (use **bold text** for headings)
              </label>
              <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                rows={12} placeholder={`Write your blog post here...\n\n**Introduction**\nStart with an introduction paragraph.\n\n**Section Title**\nSection content here.\n\n**Conclusion**\nWrap up the article.`}
                style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'monospace', lineHeight: '1.6' }}
                onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
              <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                Use **text** for bold headings. Separate paragraphs with blank lines.
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: C.primary, marginBottom: '0.4rem' }}>Tags (comma separated)</label>
              <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                placeholder="parents, tutoring, pakistan"
                style={{ width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => (e.currentTarget.style.borderColor = C.accent)}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={handleSubmit} disabled={saving}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: saving ? '#93c5fd' : C.accent, color: 'white', border: 'none', borderRadius: '0.5rem', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>
                {saving ? 'Saving...' : editBlog ? 'Update Post' : 'Publish Post'}
              </button>
              <button onClick={() => { setShowForm(false); setEditBlog(null); }}
                style={{ padding: '0.75rem 1.5rem', border: '1.5px solid #e5e7eb', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem', background: 'white', color: C.primary }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blog List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ width: '36px', height: '36px', border: `3px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : blogs.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '4rem', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <p style={{ color: C.gray500, marginBottom: '1rem' }}>No blog posts yet.</p>
          <button onClick={() => setShowForm(true)}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: C.accent, color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}>
            Create First Post
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {blogs.map(blog => (
            <div key={blog._id} style={{ backgroundColor: 'white', borderRadius: '0.875rem', padding: '1.25rem 1.5rem', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                  <h3 style={{ fontWeight: '700', color: C.primary, fontSize: '0.95rem' }}>{blog.title}</h3>
                  <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '0.15rem 0.5rem', borderRadius: '999px', backgroundColor: blog.isPublished ? '#f0fdf4' : '#f3f4f6', color: blog.isPublished ? '#16a34a' : '#6b7280' }}>
                    {blog.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p style={{ color: C.gray500, fontSize: '0.8rem', marginBottom: '0.3rem' }}>{blog.excerpt?.substring(0, 100)}...</p>
                <p style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                  /{blog.slug} · {new Date(blog.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a href={`/blog/${blog.slug}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.4rem', textDecoration: 'none', color: C.gray500, fontSize: '0.8rem', fontWeight: '500' }}>
                  <Eye size={14} /> View
                </a>
                <button onClick={() => handleEdit(blog)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.75rem', border: `1px solid ${C.accent}`, borderRadius: '0.4rem', background: 'white', cursor: 'pointer', color: C.accent, fontSize: '0.8rem', fontWeight: '600' }}>
                  <Edit size={14} /> Edit
                </button>
                <button onClick={() => handleDelete(blog._id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.75rem', border: '1px solid #fecaca', borderRadius: '0.4rem', background: 'white', cursor: 'pointer', color: '#ef4444', fontSize: '0.8rem', fontWeight: '600' }}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}