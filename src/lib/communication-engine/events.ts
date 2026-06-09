import prisma from "@/lib/prisma";

export type CommunicationEventInput = {
  module: string;
  eventCode: string;
  eventName: string;
  description?: string;
  status?: string;
};

export async function listCommunicationEvents(module?: string) {
  try {
    return await prisma.communicationEvent.findMany({
      where: module ? { module } : undefined,
      orderBy: [{ module: "asc" }, { eventCode: "asc" }],
    });
  } catch {
    return [];
  }
}

export async function getCommunicationEvent(id: number) {
  try {
    return await prisma.communicationEvent.findUnique({ where: { id } });
  } catch {
    return null;
  }
}

export async function getCommunicationEventByCode(eventCode: string) {
  try {
    return await prisma.communicationEvent.findUnique({ where: { eventCode } });
  } catch {
    return null;
  }
}

export async function registerEvent(input: CommunicationEventInput) {
  return await prisma.communicationEvent.upsert({
    where: { eventCode: input.eventCode },
    update: {
      eventName: input.eventName,
      description: input.description ?? "",
      status: input.status ?? "active",
    },
    create: input,
  });
}

export async function updateCommunicationEvent(id: number, input: Partial<CommunicationEventInput>) {
  return await prisma.communicationEvent.update({ where: { id }, data: input });
}
