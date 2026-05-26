import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { apiFetch } from '../../api/client.js';
import { formatTRY } from '../../lib/formatTRY.js';

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  /** @type {Record<string, string>} */
  const [roleDraft, setRoleDraft] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return apiFetch('/api/users')
      .then((res) => {
        const list = Array.isArray(res?.data?.users) ? res.data.users : [];
        setUsers(list);
        const d = {};
        for (const u of list) d[u.id] = u.role;
        setRoleDraft(d);
      })
      .catch((e) => setError(e.message || 'Liste yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveRole = async (userId) => {
    const role = roleDraft[userId];
    if (!role) return;
    setBusyId(userId);
    setError('');
    try {
      await apiFetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        body: { role },
      });
      await load();
    } catch (e) {
      setError(e.message || 'Rol güncellenemedi.');
    } finally {
      setBusyId('');
    }
  };

  const remove = async (userId) => {
    if (!window.confirm('Bu kullanıcı tamamen silinsin mi? (Geri alınamaz)') ) return;
    setBusyId(userId);
    try {
      await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e.message || 'Silinemedi.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-asta-navy">Kullanıcılar</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Rolleri yönetin; son yöneticinin yetkisini düşürmeyin — başka bir yönetici atayın.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full divide-y divide-neutral-200 text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-600">
              <tr>
                <th className="px-4 py-3">Kullanıcı</th>
                <th className="px-4 py-3">Kayıt</th>
                <th className="px-4 py-3">Sipariş</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3 w-[160px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-neutral-500">
                    Yükleniyor…
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-neutral-500">
                    Kayıt yok.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-neutral-900">{u.fullName}</p>
                    <p className="text-xs text-neutral-500">{u.email}</p>
                    <p className="mt-1 font-mono text-[11px] text-neutral-400">{u.id}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-600 whitespace-nowrap">
                    {u.registeredAt ? new Date(u.registeredAt).toLocaleDateString('tr-TR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-semibold tabular-nums">{u.orderCount}</span>{' '}
                    sipariş · {formatTRY(Number(u.totalSpent) || 0)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={roleDraft[u.id] ?? u.role}
                      onChange={(e) =>
                        setRoleDraft((d) => ({ ...d, [u.id]: e.target.value }))
                      }
                      disabled={busyId === u.id}
                      className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                    >
                      <option value="customer">Müşteri</option>
                      <option value="admin">Yönetici</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 space-y-2">
                    <button
                      type="button"
                      disabled={busyId === u.id || (roleDraft[u.id] ?? u.role) === u.role}
                      onClick={() => saveRole(u.id)}
                      className="block w-full rounded-md bg-brand py-2 text-[11px] font-bold uppercase text-white hover:bg-brand-hover disabled:bg-neutral-300"
                    >
                      Rolü kaydet
                    </button>
                    <button
                      type="button"
                      disabled={busyId === u.id || me?.id === u.id}
                      onClick={() => remove(u.id)}
                      className="block w-full text-center text-[11px] font-semibold text-red-700 underline disabled:text-neutral-400"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
