import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getDatasetBasicInfo } from '@/services/dataset-service';
import EditDataset from './_components/EditDataset';

type Props = {
  params: Promise<{ id: string }>;
};

const EditDatasetPage = async ({ params }: Props) => {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const dataset = await getDatasetBasicInfo(id, session?.user?.id ?? '');

  return (
    <div className="h-full p-8">
      <EditDataset dataset={dataset} />
    </div>
  );
};

export default EditDatasetPage;
