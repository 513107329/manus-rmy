'use client';

import { useRouter } from 'next/navigation';
import InterceptingModal from '@/components/InterceptingModal';
import CreateToolForm from '../../../_components/tools/CreateToolForm';

const CreateToolModalPage = () => {
  const router = useRouter();

  const handleCancel = () => {
    router.back();
  };

  return (
    <InterceptingModal title="Create Tool">
      <CreateToolForm onCancel={handleCancel} />
    </InterceptingModal>
  );
};

export default CreateToolModalPage;
