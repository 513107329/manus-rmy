'use client';

import { useRouter } from 'next/navigation';
import EditDatasetForm from '../../../../_components/datasets/EditDatasetForm';

type Props = {
  dataset: {
    id: string;
    name: string;
    icon: string;
    description: string;
  };
};

const EditDataset = ({ dataset }: Props) => {
  const router = useRouter();

  const handleCancel = () => {
    router.replace('/space/datasets');
  };

  return (
    <EditDatasetForm
      onCancel={handleCancel}
      datasetId={dataset.id}
      {...dataset}
    />
  );
};

export default EditDataset;
