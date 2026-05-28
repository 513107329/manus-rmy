'use client';

import { useQueryClient } from '@tanstack/react-query';
import { MoreHorizontalIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteDatasetAction } from '@/actions/dataset-action';
import ConfirmDialog from '@/components/ConfirmDialog';
import TitleCardHeader from '@/components/TitleCardHeader';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatNumber } from '@/lib/utils';

type Props = {
  datasetId: string;
  documentCount: number;
  characterCount: number;
  relatedAppCount: number;
  datasetName: string;
  datasetIcon: string;
};

const DatasetCardHeader = ({
  datasetId,
  documentCount,
  characterCount,
  relatedAppCount,
  datasetName,
  datasetIcon,
}: Props) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const subTitle = `${documentCount} docs · ${formatNumber(characterCount)} chars · ${relatedAppCount} related apps`;

  const handleEditMenuSelect = () => {
    router.push(`/space/datasets/${datasetId}/edit`);
  };

  const handleDeleteMenuSelect = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    await deleteDatasetAction({ datasetId });
    queryClient.invalidateQueries({ queryKey: ['datasets'] });
  };

  const action = (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" aria-label="Open menu" size="icon-sm">
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40" align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={handleEditMenuSelect}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={handleDeleteMenuSelect}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <TitleCardHeader
        title={datasetName}
        subtitle={subTitle}
        imgSrc={datasetIcon}
        imgAlt={datasetName}
        action={action}
      />
      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Delete Dataset"
        description="After deletion, the related apps will no longer be able to use this dataset, all the documents in the dataset will be deleted as well."
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default DatasetCardHeader;
