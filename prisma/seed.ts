import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ApplicationStatus, PortStatus } from "../generated/prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PROJECTS_JSON = [
  {
    "name": "Amrik Chhauni — Hub",
    "subdomain": "Primary Domain",
    "url": "https://amrikchhauni.in",
    "description": "Central landing page listing all deployed projects on this development domain.",
    "category": "Hub",
    "remark": "Main entry point",
    "note": "Testing & demo only",
    "status": "Live",
    "featured": true,
    "port": 443
  },
  {
    "name": "Query Cart",
    "subdomain": "qc",
    "url": "https://qc.amrikchhauni.in",
    "description": "Negotiation-first marketplace for modern commerce teams.",
    "category": "Pavittar",
    "remark": "",
    "note": "Client project",
    "status": "Live",
    "featured": false,
    "port": 4800
  },
  {
    "name": "Pavittar Portfolio",
    "subdomain": "ps",
    "url": "https://ps.amrikchhauni.in",
    "description": "Pavittar's Resume / Portfolio site.",
    "category": "Hobby",
    "remark": "",
    "note": "",
    "status": "Live",
    "featured": false,
    "port": 5001
  },
  {
    "name": "SCS",
    "subdomain": "scs",
    "url": "https://scs.amrikchhauni.in",
    "description": "Smart Computer Solutions - A small business/shop website.",
    "category": "Pavittar",
    "remark": "",
    "note": "",
    "status": "Planned",
    "featured": false,
    "port": 5002
  },
  {
    "name": "Development Sandbox",
    "subdomain": "ds",
    "url": "https://ds.amrikchhauni.in",
    "description": "Experimental builds, prototypes, and work-in-progress features.",
    "category": "Development",
    "remark": "May be unstable",
    "note": "Not for production use",
    "status": "Beta",
    "featured": false,
    "port": 9090
  },
  {
    "name": "Under Construction Sandbox",
    "subdomain": "ucmd",
    "url": "https://ucmd.amrikchhauni.in",
    "description": "Under Construction Management Dashboard",
    "category": "Development",
    "remark": "Only for internal use",
    "note": "localhost port management",
    "status": "Live",
    "featured": false,
    "port": 9091
  },
  {
    "name": "GSMS",
    "subdomain": "gsms",
    "url": "https://gsms.amrikchhauni.in",
    "description": "Gurdwara Sahib Management System",
    "category": "Hobby",
    "remark": "",
    "note": "",
    "status": "UnderConstruction",
    "featured": false,
    "port": 5005
  },
  {
    "name": "ID Card Generator",
    "subdomain": "idcardgenerator",
    "url": "https://idcardgenerator.amrikchhauni.in",
    "description": "Generate downloadable ID cards from custom templates.",
    "category": "Pavittar",
    "remark": "Malkiat Singh Saibhang",
    "note": "Asees DRMS Project",
    "status": "Live",
    "featured": false,
    "port": 4900
  },
  {
    "name": "WA Dashboard",
    "subdomain": "wa",
    "url": "https://wa.amrikchhauni.in",
    "description": "WhatsApp-related utilities of Sanjeev's.",
    "category": "Sanjeev",
    "remark": "Office related",
    "note": "",
    "status": "Live",
    "featured": false,
    "port": 6002
  },
  {
    "name": "Taste of Panjab",
    "subdomain": "tasteofpanjab",
    "url": "https://tasteofpanjab.amrikchhauni.in",
    "description": "Restaurant showcase site.",
    "category": "Amrik",
    "remark": ".Net + Angular Project",
    "note": "",
    "status": "Live",
    "featured": true,
    "port": 4001
  },
  {
    "name": "Smart Kharcha AI",
    "subdomain": "kharcha",
    "url": "https://kharcha.amrikchhauni.in",
    "description": "Production-ready financial management web app",
    "category": "Hobby",
    "remark": "",
    "note": "",
    "status": "UnderConstruction",
    "featured": false,
    "port": 5003
  },
  {
    "name": "Divine Dhun",
    "subdomain": "dd",
    "url": "https://dd.amrikchhauni.in",
    "description": "Divine Dhun -Sacred Music Streaming.",
    "category": "Hobby",
    "remark": "",
    "note": "",
    "status": "Live",
    "featured": false,
    "port": 5004
  },
  {
    "name": "Score",
    "subdomain": "score",
    "url": "https://score.amrikchhauni.in",
    "description": "Score",
    "category": "Amrik",
    "remark": ".Net",
    "note": "",
    "status": "UnderConstruction",
    "featured": false,
    "port": 4002
  },
  {
    "name": "Umpiring",
    "subdomain": "umpiring",
    "url": "https://umpiring.amrikchhauni.in",
    "description": "Umpiring",
    "category": "Amrik",
    "remark": ".Net",
    "note": "",
    "status": "UnderConstruction",
    "featured": false,
    "port": 4003
  },
  {
    "name": "E-Jagriti Sync",
    "subdomain": "ejdata",
    "url": "https://ejdata.amrikchhauni.in",
    "description": "E-Jagriti Data Sync Service",
    "category": "Sanjeev",
    "remark": "",
    "note": "",
    "status": "UnderConstruction",
    "featured": false,
    "port": 6003
  },
  {
    "name": "Court Room Automation",
    "subdomain": "courtroomautomation",
    "url": "https://courtroomautomation.amrikchhauni.in",
    "description": "E-Jagriti Court Room Automation - Backend",
    "category": "Sanjeev",
    "remark": "Python",
    "note": "used in ejdata app",
    "status": "Live",
    "featured": false,
    "port": 6004
  },
  {
    "name": "Punjab Sports Hub",
    "subdomain": "psh",
    "url": "https://psh.amrikchhauni.in",
    "description": "Punjab Sports Hub - ERP System",
    "category": "Hobby",
    "remark": "",
    "note": "",
    "status": "Live",
    "featured": false,
    "port": 5006
  },
  {
    "name": "Aanchal Amruttulya Franchise",
    "subdomain": "aaph",
    "url": "https://aaph.amrikchhauni.in",
    "description": "Aanchal Amruttulya Franchise - Start Your Own Tea & Pizza Franchise Business",
    "category": "Pavittar",
    "remark": "",
    "note": "Aranpreet Project",
    "status": "Live",
    "featured": false,
    "port": 5006
  },
  {
    "name": "SCDRC",
    "subdomain": "scdrc",
    "url": "https://scdrc.amrikchhauni.in",
    "description": "New - SCDRC website",
    "category": "Sanjeev",
    "remark": "",
    "note": "",
    "status": "UnderConstruction",
    "featured": false,
    "port": 6005
  },
  {
    "name": "E-Briefly",
    "subdomain": "ebriefly",
    "url": "https://ebriefly.amrikchhauni.in",
    "description": "E-Briefly website",
    "category": "Sanjeev",
    "remark": "",
    "note": "",
    "status": "Live",
    "featured": false,
    "port": 6001
  }
];
const PORTS_JSON = [
  {
    "port": 4003,
    "title": "Umpiring",
    "running": true
  }
];

const NGINX_SITES = "D:\\nginx\\conf\\sites";

const IDEA_SOURCES = [
  "Pavittar",
  "Amrik",
  "Sanjeev",
  "Personal",
  "Development",
  "Hobby",
  "Client",
  "Hub",
];

const TECHNOLOGIES = [
  "Next.js",
  "React",
  "Node.js",
  "Angular",
  "ASP.NET",
  "Python",
  "Static HTML",
  ".NET",
];

const DEPLOYMENT_TYPES = [
  "PM2",
  "IIS",
  "PYTHON",
  "STATIC",
  "DOCKER",
  "WINDOWS_SERVICE",
];

const WHITELISTED_SERVICES = [
  { name: "nginx", displayName: "Nginx HTTP Server" },
  { name: "postgresql-x64-18", displayName: "PostgreSQL 18" },
];

function mapStatus(status: string): ApplicationStatus {
  const map: Record<string, ApplicationStatus> = {
    Live: "LIVE",
    Planned: "PLANNED",
    Beta: "BETA",
    UnderConstruction: "UNDER_CONSTRUCTION",
  };
  return map[status] ?? "PLANNED";
}

function mapPortStatus(status: string): PortStatus {
  if (status === "UnderConstruction") return "UNDER_CONSTRUCTION";
  if (status === "Live" || status === "Beta") return "IN_USE";
  return "RESERVED";
}

function inferTechnology(category: string, remark: string): string {
  const combined = `${category} ${remark}`.toLowerCase();
  if (combined.includes("python")) return "Python";
  if (combined.includes(".net") || combined.includes("asp.net")) return "ASP.NET";
  if (combined.includes("angular")) return "Angular";
  if (combined.includes("react")) return "React";
  if (combined.includes("next")) return "Next.js";
  return "Node.js";
}

function inferDeploymentType(technology: string): string {
  if (technology === "Python") return "PYTHON";
  if (technology === "ASP.NET" || technology === "Angular") return "IIS";
  if (technology === "Static HTML") return "STATIC";
  return "PM2";
}

interface NginxSiteInfo {
  hostname: string;
  subdomain: string | null;
  sslEnabled: boolean;
  proxyPass: string | null;
  targetPort: number | null;
  nginxConfigPath: string;
}

async function parseNginxConfig(filepath: string): Promise<NginxSiteInfo | null> {
  try {
    const content = await fs.readFile(filepath, "utf-8");
    const filename = path.basename(filepath);

    const serverNameMatch = content.match(/server_name\s+([^;]+);/);
    if (!serverNameMatch) return null;

    const hostname = serverNameMatch[1].trim();
    const sslEnabled = /listen\s+443\s+ssl/.test(content);

    let proxyPass: string | null = null;
    let targetPort: number | null = null;
    const proxyMatch = content.match(/proxy_pass\s+http:\/\/[^:\/]+:(\d+)/);
    if (proxyMatch) {
      targetPort = parseInt(proxyMatch[1], 10);
      proxyPass = `http://localhost:${targetPort}`;
    }

    const parts = hostname.split(".");
    const subdomain = parts.length > 2 ? parts[0] : null;

    return {
      hostname,
      subdomain,
      sslEnabled,
      proxyPass,
      targetPort,
      nginxConfigPath: filepath,
    };
  } catch {
    return null;
  }
}

async function seedMasterData() {
  console.log("Seeding master data...");

  for (const name of IDEA_SOURCES) {
    await prisma.ideaSource.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const name of TECHNOLOGIES) {
    await prisma.technology.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const name of DEPLOYMENT_TYPES) {
    await prisma.deploymentType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const svc of WHITELISTED_SERVICES) {
    await prisma.windowsService.upsert({
      where: { name: svc.name },
      update: { whitelisted: true },
      create: { ...svc, whitelisted: true },
    });
  }
}

async function seedSettings() {
  console.log("Seeding settings...");
  const { seedDefaultSettings } = await import("../src/lib/settings/service");
  await seedDefaultSettings();
}

function requireSeedEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${key} in .env — required for seeding users. See .env.example`
    );
  }
  return value;
}

const SEED_USER_ENV = {
  superAdmin: {
    username: "SEED_USER_SUPER_ADMIN_USERNAME",
    password: "SEED_USER_SUPER_ADMIN_PASSWORD",
  },
  administrator: {
    username: "SEED_USER_ADMINISTRATOR_USERNAME",
    password: "SEED_USER_ADMINISTRATOR_PASSWORD",
  },
  viewer: {
    username: "SEED_USER_VIEWER_USERNAME",
    password: "SEED_USER_VIEWER_PASSWORD",
  },
} as const;

async function seedUsers() {
  console.log("Seeding users...");

  const superAdminUsername = requireSeedEnv(SEED_USER_ENV.superAdmin.username);
  const superAdminPassword = requireSeedEnv(SEED_USER_ENV.superAdmin.password);
  const administratorUsername = requireSeedEnv(SEED_USER_ENV.administrator.username);
  const administratorPassword = requireSeedEnv(SEED_USER_ENV.administrator.password);
  const viewerUsername = requireSeedEnv(SEED_USER_ENV.viewer.username);
  const viewerPassword = requireSeedEnv(SEED_USER_ENV.viewer.password);

  const superAdminHash = await bcrypt.hash(superAdminPassword, 12);
  await prisma.user.upsert({
    where: { username: superAdminUsername },
    update: { passwordHash: superAdminHash, role: "SUPER_ADMIN", active: true },
    create: {
      username: superAdminUsername,
      passwordHash: superAdminHash,
      role: "SUPER_ADMIN",
    },
  });

  const administratorHash = await bcrypt.hash(administratorPassword, 12);
  await prisma.user.upsert({
    where: { username: administratorUsername },
    update: {
      passwordHash: administratorHash,
      role: "ADMINISTRATOR",
      active: true,
    },
    create: {
      username: administratorUsername,
      passwordHash: administratorHash,
      role: "ADMINISTRATOR",
    },
  });

  const viewerHash = await bcrypt.hash(viewerPassword, 12);
  await prisma.user.upsert({
    where: { username: viewerUsername },
    update: { passwordHash: viewerHash, role: "VIEWER", active: true },
    create: {
      username: viewerUsername,
      passwordHash: viewerHash,
      role: "VIEWER",
    },
  });
}

async function seedClients() {
  console.log("Seeding clients...");
  const clients = [
    { name: "Amrik Chhauni", company: "Amrik Chhauni", email: "admin@amrikchhauni.in" },
    { name: "Internal", company: "Amrik Chhauni", notes: "Internal projects" },
    { name: "Client Projects", company: null, notes: "External client work" },
  ];

  for (const c of clients) {
    const existing = await prisma.client.findFirst({ where: { name: c.name } });
    if (!existing) {
      await prisma.client.create({ data: c });
    }
  }
}

async function seedServer() {
  console.log("Seeding server registry...");
  const os = await import("os");

  await prisma.server.upsert({
    where: { id: "current-server" },
    update: {},
    create: {
      id: "current-server",
      name: "Primary Windows Server",
      hostname: os.hostname(),
      ipAddress: "127.0.0.1",
      operatingSystem: `Windows ${process.platform}`,
      environment: "production",
      active: true,
      isCurrent: true,
    },
  });
}

async function seedMaintenancePage() {
  console.log("Seeding maintenance page...");
  const existing = await prisma.maintenancePage.findFirst();
  if (!existing) {
    await prisma.maintenancePage.create({
      data: {
        title: "Under Maintenance",
        description: "We are currently performing scheduled maintenance. Please check back soon.",
        expectedReturn: "Shortly",
      },
    });
  }
}

async function seedProjects() {
  console.log("Seeding applications from projects array...");

  const ideaSources = await prisma.ideaSource.findMany();
  const technologies = await prisma.technology.findMany();
  const deploymentTypes = await prisma.deploymentType.findMany();
  const superAdminUsername = requireSeedEnv(SEED_USER_ENV.superAdmin.username);
  const admin = await prisma.user.findUnique({
    where: { username: superAdminUsername },
  });

  for (const project of PROJECTS_JSON) {
    const ideaSource = ideaSources.find((s) => s.name === project.category);
    const techName = inferTechnology(project.category, project.remark);
    const technology = technologies.find((t) => t.name === techName);
    const deployName = inferDeploymentType(techName);
    const deploymentType = deploymentTypes.find((d) => d.name === deployName);

    const hostname =
      project.subdomain === "Primary Domain"
        ? "amrikchhauni.in"
        : `${project.subdomain}.amrikchhauni.in`;

    const appId =
      project.subdomain === "Primary Domain"
        ? "app-primary"
        : `app-${project.subdomain.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

    const app = await prisma.application.upsert({
      where: { id: appId },
      update: {
        name: project.name,
        description: project.description,
        status: mapStatus(project.status),
        notes: project.note || null,
        remarks: project.remark || null,
        featured: project.featured,
      },
      create: {
        id: appId,
        name: project.name,
        description: project.description,
        ideaSourceId: ideaSource?.id,
        createdById: admin?.id,
        technologyId: technology?.id,
        deploymentTypeId: deploymentType?.id,
        status: mapStatus(project.status),
        notes: project.note || null,
        remarks: project.remark || null,
        featured: project.featured,
      },
    });

    if (project.port && project.port !== 443) {
      await prisma.port.upsert({
        where: { number: project.port },
        update: {
          status: mapPortStatus(project.status),
          applicationId: app.id,
        },
        create: {
          number: project.port,
          status: mapPortStatus(project.status),
          applicationId: app.id,
        },
      });
    }

    await prisma.domain.upsert({
      where: { hostname },
      update: { applicationId: app.id },
      create: {
        hostname,
        subdomain:
          project.subdomain === "Primary Domain" ? null : project.subdomain,
        sslEnabled: project.port === 443 || project.url.startsWith("https"),
        targetPort: project.port !== 443 ? project.port : null,
        applicationId: app.id,
      },
    });
  }
}

async function seedUnderConstructionPorts() {
  console.log("Seeding under-construction ports...");
  try {
    for (const site of PORTS_JSON) {
      await prisma.port.upsert({
        where: { number: site.port },
        update: { status: "UNDER_CONSTRUCTION" },
        create: {
          number: site.port,
          status: "UNDER_CONSTRUCTION",
          notes: site.title,
        },
      });
    }
  } catch (err) {
    console.warn("Could not read under-construction ports:", err);
  }
}

async function seedNginxConfigs() {
  console.log("Seeding nginx configs from sites...");
  try {
    const files = await fs.readdir(NGINX_SITES);
    const confFiles = files.filter((f) => f.endsWith(".conf"));

    for (const file of confFiles) {
      const filepath = path.join(NGINX_SITES, file);
      const info = await parseNginxConfig(filepath);
      if (!info) continue;

      const content = await fs.readFile(filepath, "utf-8");

      await prisma.nginxConfig.upsert({
        where: { filename: file },
        update: { content, domain: info.hostname },
        create: {
          filename: file,
          filepath,
          content,
          domain: info.hostname,
        },
      });

      await prisma.domain.upsert({
        where: { hostname: info.hostname },
        update: {
          sslEnabled: info.sslEnabled,
          proxyPass: info.proxyPass,
          targetPort: info.targetPort,
          nginxConfigPath: info.nginxConfigPath,
          discovered: true,
        },
        create: {
          hostname: info.hostname,
          subdomain: info.subdomain,
          sslEnabled: info.sslEnabled,
          proxyPass: info.proxyPass,
          targetPort: info.targetPort,
          nginxConfigPath: info.nginxConfigPath,
          discovered: true,
        },
      });
    }
  } catch (err) {
    console.warn("Could not scan nginx sites:", err);
  }
}

async function seedStorageDirs() {
  console.log("Creating storage directories...");
  const { ensureStorageDirs } = await import("../src/lib/storage/snapshot");
  await ensureStorageDirs();
}

async function main() {
  console.log("=== ACDM Seed Script ===\n");

  await seedMasterData();
  await seedSettings();
  await seedUsers();
  await seedClients();
  await seedServer();
  await seedMaintenancePage();
  await seedProjects();
  await seedUnderConstructionPorts();
  await seedNginxConfigs();
  await seedStorageDirs();

  console.log("\n=== Seed completed successfully ===");
  console.log("Users seeded from .env:");
  console.log(`  Super Admin:     ${requireSeedEnv(SEED_USER_ENV.superAdmin.username)}`);
  console.log(`  Administrator:   ${requireSeedEnv(SEED_USER_ENV.administrator.username)}`);
  console.log(`  Viewer:          ${requireSeedEnv(SEED_USER_ENV.viewer.username)}`);
  console.log("  (passwords: SEED_USER_*_PASSWORD in .env)");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
