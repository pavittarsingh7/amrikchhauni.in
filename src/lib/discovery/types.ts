export interface DiscoveryResult<T> {
  success: boolean;
  discovered: number;
  created: number;
  updated: number;
  errors: string[];
  items: T[];
}

export interface NginxSiteDiscovery {
  filename: string;
  filepath: string;
  hostname: string;
  subdomain: string | null;
  sslEnabled: boolean;
  proxyPass: string | null;
  rootPath: string | null;
  targetPort: number | null;
  content: string;
}

export interface Pm2ProcessDiscovery {
  name: string;
  status: string;
  port: number | null;
  pid: number | null;
  uptime: string | null;
  restarts: number;
  ecosystemPath: string | null;
}

export interface IisSiteDiscovery {
  name: string;
  state: string;
  bindings: Array<{
    protocol: string;
    bindingInformation: string;
    sslFlags?: number;
  }>;
  appPool: string | null;
  physicalPath: string | null;
  pattern: "ANGULAR_IIS" | "ASPNET_IIS" | "ANGULAR_IN_ASPNET" | "BOTH" | "UNKNOWN";
}

export interface ApplicationDiscovery {
  name: string;
  projectPath: string;
  source: string;
  technology: string;
  deploymentType: string;
  hasPackageJson: boolean;
  hasEcosystemConfig: boolean;
  repositoryUrl: string | null;
}

export type DiscoveryType = "nginx" | "pm2" | "iis" | "application";

export interface DiscoveryRunSummary {
  nginx: DiscoveryResult<NginxSiteDiscovery>;
  pm2: DiscoveryResult<Pm2ProcessDiscovery>;
  iis: DiscoveryResult<IisSiteDiscovery>;
  application: DiscoveryResult<ApplicationDiscovery>;
}
