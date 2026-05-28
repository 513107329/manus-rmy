import { type Prisma, prisma } from '@/lib/database';

export const saveUploadedFile = async (
  files: Array<Omit<Prisma.UploadFileCreateManyInput, 'userId'>>,
  userId: string,
) => {
  const result = await prisma.uploadFile.createManyAndReturn({
    data: files.map((file) => ({
      ...file,
      userId,
    })),
  });

  return result.map((file) => file.id);
};
