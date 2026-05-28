'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateDatasetAction } from '@/actions/dataset-action';
import { getActionErrorMsg } from '@/lib/utils';
import DatasetForm, { type FormData } from './DatasetForm';

type Props = FormData & {
  datasetId: string;
  onCancel: () => void;
};

const EditDatasetForm = ({ datasetId, onCancel, ...defaultValues }: Props) => {
  const queryClient = useQueryClient();

  const reloadDatasets = () => {
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'datasets',
    });
  };

  const saveDataset = async (data: FormData) => {
    const result = await updateDatasetAction({
      datasetId,
      name: data.name,
      description: data.description,
      icon: data.icon,
    });
    if (!result?.data) {
      toast.error(getActionErrorMsg(result, 'Dataset update failed'));
      return;
    }

    toast.success('Dataset update successful');
    onCancel();
    reloadDatasets();
  };

  return (
    <DatasetForm
      defaultValues={defaultValues}
      onSubmit={saveDataset}
      onCancel={onCancel}
    />
  );
};

export default EditDatasetForm;
