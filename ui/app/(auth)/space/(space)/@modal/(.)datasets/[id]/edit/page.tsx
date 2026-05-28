import { headers } from 'next/headers';
import InterceptingModal from '@/components/InterceptingModal';
import { auth } from '@/lib/auth';
import { getDatasetBasicInfo } from '@/services/dataset-service';
import EditDatasetModal from './_components/EditDatasetModal';

type Props = {
  params: Promise<{ id: string }>;
};

const EditDatasetModalPage = async ({ params }: Props) => {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const dataset = await getDatasetBasicInfo(id, session?.user?.id ?? '');

  return (
    <InterceptingModal title="Edit Tool">
      <EditDatasetModal dataset={dataset} />
    </InterceptingModal>
  );
};

export default EditDatasetModalPage;
