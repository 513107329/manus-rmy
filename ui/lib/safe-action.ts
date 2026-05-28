import { BaseException, getLogger } from '@repo/common';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSafeActionClient } from 'next-safe-action';
import { ZodError, z } from 'zod';
import { auth } from './auth';

export const actionClient = createSafeActionClient({
  defineMetadataSchema: () => {
    return z.object({
      actionName: z.string(),
    });
  },
  handleServerError: (error, utils) => {
    const logger = getLogger();
    const { clientInput, metadata } = utils;
    logger.error('clientInput: ', { clientInput });
    logger.error('metadata: ', { metadata });
    logger.error('Error: ', { error });
    if (error instanceof ZodError) {
      const errorMessage = error.issues
        .map((item) => {
          if (item.path.length === 0) {
            return item.message;
          }
          const path = item.path.join('.');
          return `${path}: ${item.message}`;
        })
        .join('; ');

      logger.error('Request parameter error: ', { error });
      return errorMessage;
    }

    if (error instanceof BaseException) {
      logger.error('Business exception: ', { error });
      return error.message;
    }

    logger.error('Unknown error: ', { error });
    console.error(error);
    return 'Unknown error';
  },
}).use(async ({ next, clientInput, metadata }) => {
  const startTime = performance.now();
  const result = await next();
  const endTime = performance.now();
  const logger = getLogger();
  logger.debug('Result -> ', { result });
  logger.debug('Client input -> ', { clientInput });
  logger.debug('Metadata -> ', { metadata });
  logger.debug(`Action execution took: ${endTime - startTime}ms`);
  return result;
});

export const authActionClient = actionClient.use(async ({ next }) => {
  const logger = getLogger();
  // const cookieStore = await cookies();
  // const sessionToken =
  //   cookieStore.get('better-auth.session_token')?.value ?? '';

  // const token = sessionToken.split('.')[0];

  // const sessionRecord = await prisma.session.findUnique({
  //   where: {
  //     token,
  //   },
  // });

  // log.debug('sessionRecord: %o', { sessionRecord });
  // if (!sessionRecord) {
  //   log.error('Unauthorized: %s', sessionToken);
  //   redirect('/login');
  // }

  // return next({ ctx: { userId: sessionRecord.userId } });

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    logger.error('Unauthorized');
    redirect('/login');
  }

  return next({ ctx: { userId: session.user.id } });
});
