"use client";

import { useMemo, useState } from "react";
import type { HubProject } from "@/lib/hub/types";
import { CATEGORY_COLORS, STATUS_COLORS, badgeClass } from "@/lib/hub/constants";
import { sortHubProjects, projectSearchText } from "@/lib/hub/utils";

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
}) {
  return (
    <section className="opacity-0-start animate-fade-up-delay-2 mb-8 rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-md transition-shadow duration-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label
            htmlFor="hub-search"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
          >
            Search
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              id="hub-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 shadow-inner transition-all duration-300 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:w-auto lg:min-w-[320px]">
          <div>
            <label
              htmlFor="hub-category"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Category
            </label>
            <select
              id="hub-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm transition-all duration-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="hub-status"
              className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Status
            </label>
            <select
              id="hub-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm transition-all duration-300 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {filteredCount === total
          ? `Showing all ${total} projects`
          : `Showing ${filteredCount} of ${total} projects`}
      </p>
    </section>
  );
}

function ProjectCard({ project, index }: { project: HubProject; index: number }) {
  return (
    <article
      className="card-stagger group flex flex-col rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm opacity-0-start animate-card-in transition-all duration-300 hover:-translate-y-1 hover:border-indigo-300/60 hover:shadow-lg hover:shadow-indigo-500/10 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-indigo-500/40"
      style={{ "--i": index } as React.CSSProperties}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 transition-colors duration-300 ${badgeClass(CATEGORY_COLORS, project.category)}`}
          >
            {project.category}
          </span>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 transition-colors duration-300 ${badgeClass(STATUS_COLORS, project.status)}`}
          >
            {project.status}
          </span>
        </div>
        {project.featured && (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-200 transition-colors duration-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-800">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" />
            </svg>
            Featured
          </span>
        )}
      </div>

      <h2 className="font-display text-lg font-semibold text-slate-900 transition-colors duration-300 group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
        {project.name}
      </h2>
      <p className="mt-1 font-mono text-xs text-indigo-600/90 dark:text-indigo-400/90">
        {project.subdomain}
        {project.port != null ? `:${project.port}` : ""}
      </p>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {project.description}
      </p>
      {project.remark && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-600 dark:text-slate-300">Note:</span>{" "}
          {project.remark}
        </p>
      )}
      {project.note && (
        <p className="mt-1 text-xs italic text-slate-400 dark:text-slate-500">
          {project.note}
        </p>
      )}

      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/20 transition-all duration-300 hover:from-indigo-500 hover:to-violet-500 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[0.98]"
      >
        Open project
        <svg
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
          />
        </svg>
      </a>
    </article>
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
          <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center text-slate-500 dark:border-slate-700">
            <p className="font-medium">No projects match your filters</p>
            <p className="mt-1 text-sm">Try clearing search or filters.</p>
          </div>
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
      />
      <main className="flex-1">
        {f.filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center text-slate-500 dark:border-slate-700">
            <p className="font-medium">No projects match your filters</p>
            <p className="mt-1 text-sm">Try clearing search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/70 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/60">
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
                    <td className="px-4 py-3 font-mono text-xs">
                      {project.port ?? (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
                      >
                        {project.url}
                      </a>
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
                        <span
                          className="inline-flex text-indigo-600 dark:text-indigo-400"
                          title="Featured"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" />
                          </svg>
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
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
          </div>
        )}
      </main>
    </>
  );
}
