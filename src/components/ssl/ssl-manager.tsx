"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, TextField } from "@heroui/react";
import { Plus, RefreshCw } from "lucide-react";
import { DataTable, StatusBadge } from "@/components/ui/data-table";
import { EntityModal } from "@/components/crud/entity-modal";
import {
  discoverSslAction,
  renewSslAction,
  createSslAction,
} from "@/actions/ssl";

type SslRow = {
  id: string;
  domain: string;
  issuer: string | null;
  notAfter: Date | null;
  notBefore: Date | null;
  winAcmeId: string | null;
  autoRenew: boolean;
};

function expiryBadge(notAfter: Date | null) {
  if (!notAfter) return <StatusBadge status="unknown" />;
  const now = Date.now();
  const expiry = new Date(notAfter).getTime();
  if (expiry < now) return <StatusBadge status="expired" variant="error" />;
  const days = (expiry - now) / (1000 * 60 * 60 * 24);
  if (days < 30) return <StatusBadge status={`${Math.floor(days)}d left`} variant="warning" />;
  return <StatusBadge status="valid" variant="success" />;
}

interface SslManagerProps {
  certificates: SslRow[];
  isSuperAdmin: boolean;
}

export function SslManager({ certificates, isSuperAdmin }: SslManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [webroot, setWebroot] = useState("D:\\amrikchhauni.in");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleDiscover() {
    startTransition(async () => {
      const result = await discoverSslAction();
      setMessage(result.error ?? result.output ?? "Done");
      router.refresh();
    });
  }

  function handleRenew(id: string) {
    startTransition(async () => {
      const result = await renewSslAction(id);
      if (result.error) setMessage(result.error);
      else setMessage(result.output ?? "Renewed");
      router.refresh();
    });
  }

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createSslAction({ domain, email, webroot });
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.output ?? "Certificate created");
      setCreateOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {isSuperAdmin && (
        <div className="flex flex-wrap gap-2 justify-between mb-4">
          <Button
            variant="secondary"
            size="sm"
            onPress={handleDiscover}
            isDisabled={isPending}
            className="gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} />
            Discover Certificates
          </Button>
          <Button variant="primary" onPress={() => setCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Request Certificate
          </Button>
        </div>
      )}

      {message && (
        <p className="text-sm text-blue-400 mb-4 bg-blue-950/30 px-3 py-2 rounded-lg whitespace-pre-wrap">
          {message}
        </p>
      )}

      <DataTable
        keyField="id"
        data={certificates}
        emptyMessage="No certificates found. Run discovery."
        columns={[
          { key: "domain", header: "Domain" },
          {
            key: "issuer",
            header: "Issuer",
            className: "text-xs max-w-[200px] truncate",
          },
          {
            key: "notAfter",
            header: "Expires",
            render: (row) =>
              row.notAfter
                ? new Date(row.notAfter).toLocaleDateString()
                : "—",
          },
          {
            key: "status",
            header: "Status",
            render: (row) => expiryBadge(row.notAfter),
          },
          { key: "winAcmeId", header: "Win-ACME ID" },
          ...(isSuperAdmin
            ? [
                {
                  key: "actions",
                  header: "Actions",
                  render: (row: SslRow) => (
                    <Button
                      size="sm"
                      variant="secondary"
                      isDisabled={!row.winAcmeId || isPending}
                      onPress={() => handleRenew(row.id)}
                      className="gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Renew
                    </Button>
                  ),
                },
              ]
            : []),
        ]}
      />

      <EntityModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Request SSL Certificate"
        onSubmit={handleCreate}
        submitLabel="Request via Win-ACME"
        isLoading={isPending}
      >
        <div className="space-y-4">
          <TextField value={domain} onChange={setDomain} isRequired>
            <Label>Domain</Label>
            <Input placeholder="app.example.com" />
          </TextField>
          <TextField value={email} onChange={setEmail} isRequired>
            <Label>Email (Let&apos;s Encrypt)</Label>
            <Input type="email" placeholder="admin@example.com" />
          </TextField>
          <TextField value={webroot} onChange={setWebroot} isRequired>
            <Label>Webroot Path (HTTP validation)</Label>
            <Input className="font-mono" />
          </TextField>
          <p className="text-xs text-slate-500">
            Uses Win-ACME filesystem validation. Domain must be reachable on port 80.
          </p>
          {error && (
            <p className="text-sm text-red-400 bg-red-950/50 px-3 py-2 rounded-lg whitespace-pre-wrap">
              {error}
            </p>
          )}
        </div>
      </EntityModal>
    </>
  );
}
