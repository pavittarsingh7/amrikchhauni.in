"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { ExternalLink, Search, Star } from "lucide-react";
import type { HubProject } from "@/lib/hub/types";
import { CATEGORY_COLORS, STATUS_COLORS, badgeClass } from "@/lib/hub/constants";
import { sortHubProjects, projectSearchText } from "@/lib/hub/utils";

const selectClassName =
  "w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 transition-all duration-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

function useHubFilter(projects: HubProject[]) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  const categories = useMemo(
    () => [...new Set(projects.map((p) => p.category).filter(Boolean))].sort(),
    [projects]
  );

  const statuses = useMemo(
    () => [...new Set(projects.map((p) => p.status).filter(Boolean))].sort(),
    [projects]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortHubProjects(
      projects.filter((p) => {
        const matchSearch =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.subdomain.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q);
        const matchCat = !category || p.category === category;
        const matchStatus = !status || p.status === status;
        return matchSearch && matchCat && matchStatus;
      })
    );
  }, [projects, search, category, status]);

  return {
    search,
    setSearch,
    category,
    setCategory,
    status,
    setStatus,
    categories,
    statuses,
    filtered,
    total: projects.length,
  };
}

function HubFiltersPanel({
  search,
  setSearch,
  category,
  setCategory,
  status,
  setStatus,
  categories,
  statuses,
  filteredCount,
  total,
  searchPlaceholder,
  wideSearch,
}: {
  search: string;
  setSearch: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  categories: string[];
  statuses: string[];
  filteredCount: number;
  total: number;
  searchPlaceholder: string;
  wideSearch?: boolean;
}) {
  return (
    <Card className="opacity-0-start animate-fade-up-delay-2 mb-8 acdm-hub-surface transition-shadow duration-300 hover:shadow-md">
      <Card.Content className="gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <TextField
            className="flex-1"
            value={search}
            onChange={setSearch}
            aria-label="Search projects"
          >
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Search
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={searchPlaceholder}
                className="bg-white pl-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </TextField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:w-auto lg:min-w-[320px]">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="hub-category"
                className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Category
              </Label>
              <select
                id="hub-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={selectClassName}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="hub-status"
                className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Status
              </Label>
              <select
                id="hub-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={selectClassName}
              >
                <option value="">All statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {filteredCount === total
            ? `Showing all ${total} projects`
            : `Showing ${filteredCount} of ${total} projects`}
          {wideSearch ? "" : ""}
        </p>
      </Card.Content>
    </Card>
  );
}

function ProjectCard({ project, index }: { project: HubProject; index: number }) {
  return (
    <Card
      className="card-stagger group flex flex-col acdm-hub-surface opacity-0-start shadow-sm transition-all duration-300 animate-card-in hover:-translate-y-1 hover:border-indigo-300/60 hover:shadow-lg hover:shadow-indigo-500/10 dark:hover:border-indigo-500/40"
      style={{ "--i": index } as React.CSSProperties}
    >
      <Card.Header className="flex flex-wrap items-start justify-between gap-2 pb-0">
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${badgeClass(CATEGORY_COLORS, project.category)}`}
          >
            {project.category}
          </span>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${badgeClass(STATUS_COLORS, project.status)}`}
          >
            {project.status}
          </span>
        </div>
        {project.featured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-800">
            <Star className="h-3 w-3 fill-current" />
            Featured
          </span>
        )}
      </Card.Header>

      <Card.Content className="flex flex-1 flex-col gap-1 pt-2">
        <h2 className="font-display text-lg font-semibold text-slate-900 transition-colors duration-300 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
          {project.name}
        </h2>
        <p className="font-mono text-xs text-indigo-600/90 dark:text-indigo-400/90">
          {project.subdomain}
          {project.port != null ? `:${project.port}` : ""}
        </p>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {project.description}
        </p>
        {project.remark && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              Note:
            </span>{" "}
            {project.remark}
          </p>
        )}
        {project.note && (
          <p className="text-xs italic text-slate-400 dark:text-slate-500">
            {project.note}
          </p>
        )}
      </Card.Content>

      <Card.Footer className="pt-0">
        <Link
          href={project.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 transition-all duration-300 hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98]"
        >
          Open project
          <ExternalLink className="h-4 w-4" />
        </Link>
      </Card.Footer>
    </Card>
  );
}

function HubEmptyState() {
  return (
    <Card className="border border-dashed border-slate-300 bg-transparent py-16 text-center dark:border-slate-700">
      <Card.Content>
        <p className="font-medium text-slate-500 dark:text-slate-400">
          No projects match your filters
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
          Try clearing search or filters.
        </p>
      </Card.Content>
    </Card>
  );
}

export function HubCardView({ projects }: { projects: HubProject[] }) {
  const f = useHubFilter(projects);

  return (
    <>
      <HubFiltersPanel
        {...f}
        filteredCount={f.filtered.length}
        total={f.total}
        searchPlaceholder="Filter by name or subdomain…"
      />
      <main className="flex-1">
        {f.filtered.length === 0 ? (
          <HubEmptyState />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {f.filtered.map((p, i) => (
              <ProjectCard key={p.id} project={p} index={i} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function useHubTableFilter(projects: HubProject[]) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  const categories = useMemo(
    () => [...new Set(projects.map((p) => p.category).filter(Boolean))].sort(),
    [projects]
  );
  const statuses = useMemo(
    () => [...new Set(projects.map((p) => p.status).filter(Boolean))].sort(),
    [projects]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortHubProjects(
      projects.filter((p) => {
        const matchSearch = !q || projectSearchText(p).includes(q);
        const matchCat = !category || p.category === category;
        const matchStatus = !status || p.status === status;
        return matchSearch && matchCat && matchStatus;
      })
    );
  }, [projects, search, category, status]);

  return {
    search,
    setSearch,
    category,
    setCategory,
    status,
    setStatus,
    categories,
    statuses,
    filtered,
    total: projects.length,
  };
}

export function HubTableView({ projects }: { projects: HubProject[] }) {
  const f = useHubTableFilter(projects);

  return (
    <>
      <HubFiltersPanel
        search={f.search}
        setSearch={f.setSearch}
        category={f.category}
        setCategory={f.setCategory}
        status={f.status}
        setStatus={f.setStatus}
        categories={f.categories}
        statuses={f.statuses}
        filteredCount={f.filtered.length}
        total={f.total}
        searchPlaceholder="Search any field…"
        wideSearch
      />
      <main className="flex-1">
        {f.filtered.length === 0 ? (
          <HubEmptyState />
        ) : (
          <Card className="overflow-hidden acdm-hub-surface">
            <Card.Content className="overflow-x-auto p-0">
              <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
                    <th className="sticky left-0 z-20 min-w-[160px] bg-slate-50/95 px-4 py-3 backdrop-blur dark:bg-slate-900/95">
                      Name
                    </th>
                    <th className="px-4 py-3">Subdomain</th>
                    <th className="px-4 py-3">Port</th>
                    <th className="px-4 py-3">URL</th>
                    <th className="min-w-[200px] px-4 py-3">Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Featured</th>
                    <th className="min-w-[120px] px-4 py-3">Remark</th>
                    <th className="min-w-[120px] px-4 py-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {f.filtered.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b border-slate-200/80 transition-colors hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/40"
                    >
                      <td className="sticky left-0 z-10 min-w-[160px] bg-white/95 px-4 py-3 font-medium text-slate-900 backdrop-blur dark:bg-slate-900/95 dark:text-white">
                        {project.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-indigo-600/90 dark:text-indigo-400/90">
                        {project.subdomain}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {project.port ?? (
                          <span className="text-slate-400 dark:text-slate-500">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
                        >
                          {project.url}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {project.description || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${badgeClass(CATEGORY_COLORS, project.category)}`}
                        >
                          {project.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${badgeClass(STATUS_COLORS, project.status)}`}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {project.featured ? (
                          <Star
                            className="mx-auto h-4 w-4 text-indigo-600 dark:text-indigo-400"
                            aria-label="Featured"
                          />
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {project.remark || "—"}
                      </td>
                      <td className="px-4 py-3 italic text-slate-500 dark:text-slate-500">
                        {project.note || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card.Content>
          </Card>
        )}
      </main>
    </>
  );
}
