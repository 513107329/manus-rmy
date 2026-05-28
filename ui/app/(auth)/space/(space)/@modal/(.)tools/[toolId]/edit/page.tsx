import { headers } from 'next/headers';
import InterceptingModal from '@/components/InterceptingModal';
import { auth } from '@/lib/auth';
import { getApiToolProvider } from '@/services/api-tool-service';
import EditToolModal from './_components/EditToolModal';

type Props = {
  params: Promise<{ toolId: string }>;
};

const EditToolModalPage = async ({ params }: Props) => {
  const { toolId } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const toolProvider = await getApiToolProvider(
    session?.user?.id ?? '',
    toolId,
  );

  return (
    <InterceptingModal title="Edit Tool">
      <EditToolModal toolProvider={toolProvider} />
    </InterceptingModal>
  );
};

export default EditToolModalPage;
