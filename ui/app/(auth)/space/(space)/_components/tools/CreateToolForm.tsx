'use client';

import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { saveApiToolProviderAction } from '@/actions/api-tool-action';
import { getActionErrorMsg } from '@/lib/utils';
import ToolForm, { type FormData } from './ToolForm';

type Props = {
  onCancel: () => void;
};

const CreateToolForm = ({ onCancel }: Props) => {
  const queryClient = useQueryClient();

  const reloadApiTools = () => {
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'api-tools',
    });
  };

  const saveApiTool = async (data: FormData) => {
    const result = await saveApiToolProviderAction(data);
    if (!result?.data) {
      toast.error(getActionErrorMsg(result, 'Tool creation failed'));
      return;
    }

    toast.success('Tool creation successful');
    reloadApiTools();
    onCancel();
  };

  return <ToolForm onSubmit={saveApiTool} onCancel={onCancel} />;
};

export default CreateToolForm;
