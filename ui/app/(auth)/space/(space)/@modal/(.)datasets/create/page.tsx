'use client';

import { useRouter } from 'next/navigation';
import InterceptingModal from '@/components/InterceptingModal';
import CreateDatasetForm from '../../../_components/datasets/CreateDatasetForm';

const CreateDatasetModalPage = () => {
  const router = useRouter();

  const handleCancel = () => {
    router.back();
  };

  return (
    <InterceptingModal title="Create Dataset">
      <CreateDatasetForm onCancel={handleCancel} />
    </InterceptingModal>
  );
};

export default CreateDatasetModalPage;
