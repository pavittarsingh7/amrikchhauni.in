export function HubFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-slate-200/80 pt-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <p className="max-w-xl mx-auto leading-relaxed">
        <strong className="font-medium text-slate-700 dark:text-slate-300">
          amrikchhauni.in
        </strong>{" "}
        is a personal development and demonstration domain. Projects listed here
        are for testing, staging, and client presentation purposes only.
      </p>
      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        &copy; {year} — Demo hub · Powered by ACDM
      </p>
    </footer>
  );
}
