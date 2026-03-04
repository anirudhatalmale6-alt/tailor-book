'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProjects } from '@/hooks/useProjects';
import { useCurrency } from '@/hooks/useSettings';
import { db, type Customer, type ProjectItem } from '@/lib/db';
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils';
import { useReadOnlyGuard } from '@/hooks/useSubscription';
import SearchBar from '@/components/SearchBar';
import FloatingButton from '@/components/FloatingButton';
import EmptyState from '@/components/EmptyState';

export default function ProjectsPage() {
  const router = useRouter();
  const canEdit = useReadOnlyGuard();
  const projects = useProjects();
  const currency = useCurrency();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [itemCounts, setItemCounts] = useState<Record<string, { count: number; completed: number; totalPrice: number }>>({});

  useEffect(() => {
    db.customers.toArray().then((custs) => {
      const map: Record<string, Customer> = {};
      custs.forEach((c) => { map[c.id] = c; });
      setCustomers(map);
    });
  }, []);

  useEffect(() => {
    if (!projects) return;
    db.projectItems.toArray().then((items: ProjectItem[]) => {
      const counts: Record<string, { count: number; completed: number; totalPrice: number }> = {};
      items.forEach((item) => {
        if (!counts[item.projectId]) {
          counts[item.projectId] = { count: 0, completed: 0, totalPrice: 0 };
        }
        counts[item.projectId].count++;
        if (item.status === 'delivered' || item.status === 'ready') {
          counts[item.projectId].completed++;
        }
        counts[item.projectId].totalPrice += item.price || 0;
      });
      setItemCounts(counts);
    });
  }, [projects]);

  const filtered = useMemo(() => {
    if (!projects) return undefined;
    if (!search.trim()) return projects;
    const q = search.toLowerCase().trim();
    return projects.filter((p) => {
      const customerName = customers[p.customerId]?.name?.toLowerCase() || '';
      return p.name.toLowerCase().includes(q) || customerName.includes(q);
    });
  }, [projects, search, customers]);

  const grouped = useMemo(() => {
    if (!filtered) return undefined;
    const active = filtered.filter((p) => p.status === 'active');
    const completed = filtered.filter((p) => p.status === 'completed');
    const cancelled = filtered.filter((p) => p.status === 'cancelled');
    return { active, completed, cancelled };
  }, [filtered]);

  function getProjectStatusColor(status: string) {
    switch (status) {
      case 'active': return getStatusColor('in_progress');
      case 'completed': return getStatusColor('delivered');
      case 'cancelled': return getStatusColor('cancelled');
      default: return getStatusColor('pending');
    }
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="text-2xl font-bold text-white mb-3">Projects</h1>

      <div className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search projects..."
        />
      </div>

      {projects === undefined ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : grouped && (grouped.active.length > 0 || grouped.completed.length > 0 || grouped.cancelled.length > 0) ? (
        <div className="space-y-4 pb-24">
          {grouped.active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-2">
                Active ({grouped.active.length})
              </h2>
              <div className="space-y-2">
                {grouped.active.map((project) => {
                  const colors = getProjectStatusColor(project.status);
                  const stats = itemCounts[project.id] || { count: 0, completed: 0, totalPrice: 0 };
                  return (
                    <button
                      key={project.id}
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="w-full bg-royal-card rounded-xl shadow-none p-4 text-left active:bg-royal-hover transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-sm font-semibold text-white truncate">{project.name}</p>
                          <p className="text-xs text-white truncate">
                            {customers[project.customerId]?.name || 'Unknown Client'}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.bg} ${colors.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                          {getStatusLabel(project.status)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>{stats.count} item{stats.count !== 1 ? 's' : ''} &middot; {stats.completed} done</span>
                        <span className="font-medium text-white">{formatCurrency(stats.totalPrice, currency)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {grouped.completed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-2">
                Completed ({grouped.completed.length})
              </h2>
              <div className="space-y-2">
                {grouped.completed.map((project) => {
                  const colors = getProjectStatusColor(project.status);
                  const stats = itemCounts[project.id] || { count: 0, completed: 0, totalPrice: 0 };
                  return (
                    <button
                      key={project.id}
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="w-full bg-royal-card rounded-xl shadow-none p-4 text-left active:bg-royal-hover transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-sm font-semibold text-white truncate">{project.name}</p>
                          <p className="text-xs text-white truncate">
                            {customers[project.customerId]?.name || 'Unknown Client'}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.bg} ${colors.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                          {getStatusLabel(project.status)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>{stats.count} item{stats.count !== 1 ? 's' : ''} &middot; {stats.completed} done</span>
                        <span className="font-medium text-white">{formatCurrency(stats.totalPrice, currency)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {grouped.cancelled.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-white uppercase tracking-wide mb-2">
                Cancelled ({grouped.cancelled.length})
              </h2>
              <div className="space-y-2">
                {grouped.cancelled.map((project) => {
                  const colors = getProjectStatusColor(project.status);
                  const stats = itemCounts[project.id] || { count: 0, completed: 0, totalPrice: 0 };
                  return (
                    <button
                      key={project.id}
                      onClick={() => router.push(`/projects/${project.id}`)}
                      className="w-full bg-royal-card rounded-xl shadow-none p-4 text-left active:bg-royal-hover transition-colors opacity-60"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-sm font-semibold text-white truncate">{project.name}</p>
                          <p className="text-xs text-white truncate">
                            {customers[project.customerId]?.name || 'Unknown Client'}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${colors.bg} ${colors.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                          {getStatusLabel(project.status)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>{stats.count} item{stats.count !== 1 ? 's' : ''}</span>
                        <span className="font-medium text-white">{formatCurrency(stats.totalPrice, currency)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Create a project to group sub-clients for weddings, events, or bulk orders"
          action={
            <button
              onClick={() => router.push('/projects/new')}
              className="px-4 py-2 bg-gradient-to-r from-gold-dim to-gold text-white rounded-xl text-sm font-medium"
            >
              Create First Project
            </button>
          }
        />
      )}

      <FloatingButton
        onClick={() => { if (canEdit()) router.push('/projects/new'); }}
        label="New Project"
      />
    </div>
  );
}
