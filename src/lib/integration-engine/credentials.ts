import prisma from "@/lib/prisma";

export interface APIKeyReferenceRow {
  id:                     number;
  companyId:              number | null;
  name:                   string;
  keyType:                string;
  environmentVariableName: string;
  description:            string;
  status:                 string;
  createdAt:              Date;
  updatedAt:              Date;
  /** Whether the env var is actually set in this process (never exposes the value) */
  isResolved?:            boolean;
}

export async function listCredentials(companyId?: number): Promise<APIKeyReferenceRow[]> {
  const rows = await prisma.aPIKeyReference.findMany({
    where: companyId ? { companyId } : undefined,
    orderBy: { name: "asc" },
  });
  return rows.map(r => ({
    ...r,
    isResolved: Boolean(process.env[r.environmentVariableName]),
  }));
}

export async function createCredential(data: {
  companyId?:             number;
  name:                   string;
  keyType?:               string;
  environmentVariableName: string;
  description?:           string;
}): Promise<APIKeyReferenceRow> {
  const row = await prisma.aPIKeyReference.create({
    data: {
      companyId:              data.companyId ?? null,
      name:                   data.name,
      keyType:                data.keyType ?? "API_KEY",
      environmentVariableName: data.environmentVariableName.trim().toUpperCase(),
      description:            data.description ?? "",
      status:                 "ACTIVE",
    },
  });
  return { ...row, isResolved: Boolean(process.env[row.environmentVariableName]) };
}

export async function updateCredential(
  id: number,
  data: Partial<{ name: string; description: string; status: string }>,
): Promise<APIKeyReferenceRow> {
  const row = await prisma.aPIKeyReference.update({ where: { id }, data });
  return { ...row, isResolved: Boolean(process.env[row.environmentVariableName]) };
}

/**
 * Resolve a secretRef to its actual value — SERVER-SIDE ONLY.
 * Never call from a route that returns data to the client.
 */
export function resolveSecret(secretRef: string | null): string | null {
  if (!secretRef) return null;
  const val = process.env[secretRef];
  return val ?? null;
}
