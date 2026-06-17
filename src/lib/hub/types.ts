export type HubProject = {
  id: string;
  name: string;
  subdomain: string;
  url: string;
  description: string;
  category: string;
  status: string;
  remark: string;
  note: string;
  featured: boolean;
  port: number | null;
  technology: string | null;
  deploymentType: string | null;
};

export type HubStats = {
  total: number;
  live: number;
  featured: number;
  underConstruction: number;
  planned: number;
};
