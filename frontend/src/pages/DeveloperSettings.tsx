import React, { useState, useEffect } from 'react';
import { Terminal, Key, Plus, Trash2, Copy, CheckCircle, ExternalLink, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created_at: string;
}

export default function DeveloperSettings() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [recentlyCreatedKey, setRecentlyCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api.*$/, '');
  const swaggerUrl = `${baseUrl}/docs`;

  const fetchKeys = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api-keys/`);
      if (res.ok) setKeys(await res.json());
    } catch (error) {
      toast.error("Failed to load API keys.");
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api-keys/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName })
      });

      if (res.ok) {
        const data = await res.json();
        setKeys(prev => [...prev, data]);
        setRecentlyCreatedKey(data.key);
        setNewKeyName('');
        toast.success("API Key generated!");
      }
    } catch (error) {
      toast.error("Failed to create API key.");
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm("Revoke this API Key? Any application using it will lose access immediately.")) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api-keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKeys(prev => prev.filter(k => k.id !== id));
        toast.success("Key revoked successfully.");
      }
    } catch (error) {
      toast.error("Failed to revoke key.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-5xl mx-auto">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Terminal className="text-blue-500" size={28} /> Developer & API
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage API keys for external access to your system.</p>
        </div>

        {/* FULL SCREEN DOCS BUTTON */}
        <button
          onClick={() => window.open(swaggerUrl, '_blank')}
          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white px-5 py-2.5 rounded-xl transition-colors shadow-sm font-medium text-sm"
        >
          Open API Docs Full Screen <ExternalLink size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">

        {/* Create Key Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/80 dark:border-gray-800/80 p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create New Key</h2>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Key Name (e.g., 'Zapier', 'Web Portal')</label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
                />
              </div>
              <button type="submit" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors font-medium text-sm">
                <Plus size={16} /> Generate API Key
              </button>
            </form>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 p-4 rounded-xl flex gap-3 text-sm text-blue-800 dark:text-blue-300">
            <ShieldAlert size={20} className="shrink-0 mt-0.5" />
            <p>API requests require the <strong>X-API-Key</strong> header. Keep your keys secure and never expose them in client-side code.</p>
          </div>
        </div>

        {/* List Keys */}
        <div className="lg:col-span-2">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/80 dark:border-gray-800/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
              <Key size={18} className="text-gray-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active API Keys</h2>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {keys.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No active API keys found.</div>
              ) : (
                keys.map(k => (
                  <div key={k.id} className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{k.name}</h3>
                        <p className="text-xs text-gray-500">Created {new Date(k.created_at).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => handleRevoke(k.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-1">
                        <Trash2 size={14} /> Revoke
                      </button>
                    </div>

                    {/* Security constraint: We only show the full key if it was just created */}
                    <div className="mt-3 flex items-center gap-2">
                      <code className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg text-sm text-gray-800 dark:text-gray-200 font-mono overflow-hidden text-ellipsis">
                        {k.key === recentlyCreatedKey ? k.key : 'sk_live_••••••••••••••••••••••••••••••••'}
                      </code>
                      {k.key === recentlyCreatedKey && (
                        <button onClick={() => copyToClipboard(k.key)} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors">
                          {copiedKey === k.key ? <CheckCircle size={18} className="text-green-500"/> : <Copy size={18} />}
                        </button>
                      )}
                    </div>
                    {k.key === recentlyCreatedKey && (
                      <p className="text-xs text-orange-500 mt-2 font-medium">Please copy this key now. For security reasons, you will not be able to see it again!</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}