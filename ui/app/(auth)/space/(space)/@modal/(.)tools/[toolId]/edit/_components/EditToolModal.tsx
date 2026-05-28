'use client';

import { useRouter } from 'next/navigation';
import EditToolForm from '../../../../../_components/tools/EditToolForm';

type Props = {
  toolProvider: {
    id: string;
    name: string;
    icon: string;
    description: string;
    openapiSchema: string;
    headers: Array<{ key: string; value: string }>;
    createdAt: number;
  };
};

const EditToolModal = ({ toolProvider }: Props) => {
  const router = useRouter();

  const handleCancel = () => {
    router.back();
  };

  return (
    <EditToolForm
      onCancel={handleCancel}
      providerId={toolProvider.id}
      {...toolProvider}
    />
  );
};

export default EditToolModal;
