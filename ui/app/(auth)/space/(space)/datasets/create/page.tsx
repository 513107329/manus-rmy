'use client';

import { useRouter } from 'next/navigation';
import CreateDatasetForm from '../../_components/datasets/CreateDatasetForm';

const CreateDatasetPage = () => {
  const router = useRouter();

  return (
    <div className="h-full p-8">
      <CreateDatasetForm onCancel={() => router.replace('/space/datasets')} />
    </div>
  );
};

export default CreateDatasetPage;
