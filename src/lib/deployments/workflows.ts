export type WorkflowStage = {
  id: string;
  label: string;
  kind: "git-fetch" | "git-pull" | "build" | "runtime" | "health";
};

export type RuntimeKind =
  | "PM2"
  | "IIS"
  | "PYTHON"
  | "STATIC"
  | "DOCKER"
  | "WINDOWS_SERVICE"
  | "UNKNOWN";

export function normalizeRuntime(name: string | null | undefined): RuntimeKind {
  const value = (name ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  if (value === "PM2") return "PM2";
  if (value === "IIS") return "IIS";
  if (value === "PYTHON") return "PYTHON";
  if (value === "STATIC") return "STATIC";
  if (value === "DOCKER") return "DOCKER";
  if (value === "WINDOWS_SERVICE" || value === "WINDOWS-SERVICE") return "WINDOWS_SERVICE";
  return "UNKNOWN";
}

export function buildWorkflow(input: {
  runtime: RuntimeKind;
  hasBuildCommand: boolean;
}): WorkflowStage[] {
  const stages: WorkflowStage[] = [
    { id: "fetch", label: "Fetch", kind: "git-fetch" },
    { id: "pull", label: "Pull", kind: "git-pull" },
  ];

  if (input.hasBuildCommand) {
    stages.push({ id: "build", label: "Build", kind: "build" });
  }

  if (input.runtime !== "STATIC" && input.runtime !== "UNKNOWN") {
    stages.push({ id: "runtime", label: "Runtime", kind: "runtime" });
  }

  if (input.runtime === "PM2" || input.runtime === "PYTHON" || input.runtime === "IIS") {
    stages.push({ id: "health", label: "Health check", kind: "health" });
  }

  return stages;
}

export function runtimeActionSummary(runtime: RuntimeKind): string {
  switch (runtime) {
    case "PM2":
      return "Git pull, configured build, PM2 reload of linked process(es)";
    case "PYTHON":
      return "Git pull, configured build, PM2 reload if a process is linked";
    case "IIS":
      return "Git pull, configured build, IIS app pool recycle / site restart";
    case "DOCKER":
      return "Git pull and configured build command only (container lifecycle stays manual)";
    case "STATIC":
      return "Git pull and optional build; files are served in place (no process restart)";
    case "WINDOWS_SERVICE":
      return "Git pull and configured build; service restart remains in Windows Services";
    default:
      return "Git pull and configured build command";
  }
}
