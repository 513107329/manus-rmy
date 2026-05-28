'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createDatasetAction } from '@/actions/dataset-action';
import { getActionErrorMsg } from '@/lib/utils';
import DatasetForm, { type FormData } from './DatasetForm';

type Props = {
  onCancel: () => void;
};

const CreateDatasetForm = ({ onCancel }: Props) => {
  const queryClient = useQueryClient();

  const reloadDatasets = () => {
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'datasets',
    });
  };

  const createDataset = async (data: FormData) => {
    const result = await createDatasetAction(data);
    if (!result?.data) {
      toast.error(getActionErrorMsg(result, 'Dataset creation failed'));
      return;
    }

    toast.success('Dataset creation successful');
    reloadDatasets();
    onCancel();
  };

  return <DatasetForm onSubmit={createDataset} onCancel={onCancel} />;
};

export default CreateDatasetForm;
