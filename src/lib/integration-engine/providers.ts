import prisma from "@/lib/prisma";

export type IntegrationCategory =
  | "EMAIL" | "GST" | "PAN" | "MAPS" | "WHATSAPP"
  | "SMS" | "TEAMS" | "ACCOUNTING" | "WEBHOOK" | "CUSTOM_API";

export type IntegrationStatus = "ACTIVE" | "INACTIVE" | "TEST_MODE";

export interface ProviderRow {
  id:          number;
  name:        string;
  code:        string;
  category:    string;
  description: string;
  logoUrl:     string | null;
  docsUrl:     string | null;
  status:      string;
  createdAt:   Date;
  updatedAt:   Date;
  _count?: { connections: number };
}

export async function listProviders(): Promise<ProviderRow[]> {
  return prisma.integrationProvider.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { _count: { select: { connections: true } } },
  });
}

export async function getProvider(id: number): Promise<ProviderRow | null> {
  return prisma.integrationProvider.findUnique({
    where: { id },
    include: { _count: { select: { connections: true } } },
  });
}

export async function createProvider(data: {
  name: string;
  code: string;
  category: string;
  description?: string;
  logoUrl?: string;
  docsUrl?: string;
}): Promise<ProviderRow> {
  return prisma.integrationProvider.create({
    data: {
      name:        data.name,
      code:        data.code.toUpperCase().replace(/\s+/g, "_"),
      category:    data.category,
      description: data.description ?? "",
      logoUrl:     data.logoUrl ?? null,
      docsUrl:     data.docsUrl ?? null,
      status:      "INACTIVE",
    },
  });
}

export async function updateProviderStatus(
  id: number,
  status: IntegrationStatus,
): Promise<ProviderRow> {
  return prisma.integrationProvider.update({ where: { id }, data: { status } });
}
