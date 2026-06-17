import { z } from "zod";

export const applicationStatusEnum = z.enum([
  "LIVE",
  "PLANNED",
  "BETA",
  "UNDER_CONSTRUCTION",
  "ARCHIVED",
]);

export const portStatusEnum = z.enum([
  "AVAILABLE",
  "RESERVED",
  "IN_USE",
  "UNDER_CONSTRUCTION",
]);

export const applicationSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  clientId: z.string().optional().nullable(),
  ideaSourceId: z.string().optional().nullable(),
  technologyId: z.string().optional().nullable(),
  deploymentTypeId: z.string().optional().nullable(),
  repositoryUrl: z.string().url().optional().nullable().or(z.literal("")),
  branch: z.string().max(100).optional().nullable(),
  projectPath: z.string().max(500).optional().nullable(),
  buildCommand: z.string().max(500).optional().nullable(),
  startCommand: z.string().max(500).optional().nullable(),
  status: applicationStatusEnum.default("PLANNED"),
  notes: z.string().max(2000).optional().nullable(),
  remarks: z.string().max(2000).optional().nullable(),
  featured: z.boolean().default(false),
});

export const domainSchema = z.object({
  hostname: z
    .string()
    .min(1, "Hostname is required")
    .max(253)
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/,
      "Invalid hostname"
    ),
  subdomain: z.string().max(100).optional().nullable(),
  sslEnabled: z.boolean().default(false),
  proxyPass: z.string().max(500).optional().nullable(),
  rootPath: z.string().max(500).optional().nullable(),
  targetPort: z.coerce.number().int().min(1).max(65535).optional().nullable(),
  nginxConfigPath: z.string().max(500).optional().nullable(),
  applicationId: z.string().optional().nullable(),
});

export const portSchema = z.object({
  number: z.coerce.number().int().min(1).max(65535),
  status: portStatusEnum.default("AVAILABLE"),
  applicationId: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
export type DomainInput = z.infer<typeof domainSchema>;
export type PortInput = z.infer<typeof portSchema>;

export const clientSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  company: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  active: z.boolean().default(true),
});

export const ideaSourceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().nullable(),
  active: z.boolean().default(true),
});

export const technologySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().nullable(),
  active: z.boolean().default(true),
});

export const userRoleEnum = z.enum(["SUPER_ADMIN", "ADMINISTRATOR", "VIEWER"]);

export const userSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid username"),
  password: z.union([z.string().min(6), z.literal("")]).optional(),
  role: userRoleEnum.default("VIEWER"),
  active: z.boolean().default(true),
});

export const serverSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  hostname: z.string().min(1, "Hostname is required").max(253),
  ipAddress: z.string().max(45).optional().nullable(),
  operatingSystem: z.string().max(100).optional().nullable(),
  environment: z.string().max(50).default("production"),
  active: z.boolean().default(true),
  isCurrent: z.boolean().default(false),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type IdeaSourceInput = z.infer<typeof ideaSourceSchema>;
export type TechnologyInput = z.infer<typeof technologySchema>;
export type UserInput = z.infer<typeof userSchema>;
export type ServerInput = z.infer<typeof serverSchema>;

export function emptyToNull<T extends Record<string, unknown>>(data: T): T {
  const result = { ...data } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (result[key] === "") result[key] = null;
  }
  return result as T;
}
