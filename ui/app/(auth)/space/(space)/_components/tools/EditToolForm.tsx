'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  deleteApiToolProviderAction,
  updateApiToolProviderAction,
} from '@/actions/api-tool-action';
import { getActionErrorMsg } from '@/lib/utils';
import ToolForm, { type FormData } from './ToolForm';

type Props = FormData & {
  providerId: string;
  onCancel: () => void;
};

const EditToolForm = ({ providerId, onCancel, ...defaultValues }: Props) => {
  const queryClient = useQueryClient();

  const reloadApiTools = () => {
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'api-tools',
    });
  };

  const saveApiTool = async (data: FormData) => {
    const result = await updateApiToolProviderAction({
      providerId,
      data,
    });
    if (!result?.data) {
      toast.error(getActionErrorMsg(result, 'Tool update failed'));
      return;
    }

    toast.success('Tool update successful');
    onCancel();
    reloadApiTools();
  };

  const deleteApiTool = async () => {
    const result = await deleteApiToolProviderAction({
      providerId,
    });
    if (!result?.data) {
      console.log(result);
      toast.error(getActionErrorMsg(result, 'Tool delete failed'));
      return;
    }
    toast.success('Tool delete successful');
    onCancel();
    reloadApiTools();
  };

  return (
    <ToolForm
      defaultValues={defaultValues}
      onSubmit={saveApiTool}
      onDelete={deleteApiTool}
      onCancel={onCancel}
    />
  );
};

export default EditToolForm;
