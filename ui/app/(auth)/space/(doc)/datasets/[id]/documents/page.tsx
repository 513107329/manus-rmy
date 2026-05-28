import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getDatasetById } from '@/services/dataset-service';
import DatasetTitle from './_components/DatasetTitle';
import DocumentToolsBar from './_components/DocumentToolsBar';

type Props = {
  params: Promise<{ id: string }>;
};

const DocumentsPage = async ({ params }: Props) => {
  const { id } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const dataset = await getDatasetById(session?.user?.id ?? '', id);
  return (
    <div>
      <DatasetTitle
        name={dataset.name}
        icon={dataset.icon}
        documentCount={dataset.documentCount}
        hitCount={dataset.hitCount}
        relatedAppCount={dataset.relatedAppCount}
      />
      <DocumentToolsBar />
    </div>
  );
};

export default DocumentsPage;
