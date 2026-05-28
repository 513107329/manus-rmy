'use client';

import { useRouter } from 'next/navigation';
import EditDatasetForm from '../../../../../_components/datasets/EditDatasetForm';

type Props = {
  dataset: {
    id: string;
    name: string;
    icon: string;
    description: string;
  };
};

const EditDatasetModal = ({ dataset }: Props) => {
  const router = useRouter();

  const handleCancel = () => {
    router.back();
  };

  return (
    <EditDatasetForm
      onCancel={handleCancel}
      datasetId={dataset.id}
      {...dataset}
    />
  );
};

export default EditDatasetModal;
