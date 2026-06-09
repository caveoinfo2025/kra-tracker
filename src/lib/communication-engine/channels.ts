import prisma from "@/lib/prisma";

export type NotificationChannelInput = {
  channelName: string;
  channelCode: string;
  provider?: string;
  status?: string;
  /** configJson stores env var key references ONLY — never raw secrets */
  configJson?: string;
};

export async function listNotificationChannels() {
  try {
    return await prisma.notificationChannel.findMany({
      orderBy: { channelCode: "asc" },
    });
  } catch {
    return [];
  }
}

export async function getNotificationChannel(id: number) {
  try {
    return await prisma.notificationChannel.findUnique({ where: { id } });
  } catch {
    return null;
  }
}

export async function getChannelByCode(channelCode: string) {
  try {
    return await prisma.notificationChannel.findUnique({ where: { channelCode } });
  } catch {
    return null;
  }
}

export async function createNotificationChannel(input: NotificationChannelInput) {
  return await prisma.notificationChannel.create({ data: input });
}

export async function updateNotificationChannel(
  id: number,
  input: Partial<NotificationChannelInput>,
) {
  return await prisma.notificationChannel.update({ where: { id }, data: input });
}
