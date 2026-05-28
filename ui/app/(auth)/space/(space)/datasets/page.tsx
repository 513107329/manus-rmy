'use client';

import { fetchDatasetsByPageAction } from '@/actions/dataset-action';
import usePaginationQuery from '@/hooks/usePaginationQuery';
import { authClient } from '@/lib/auth-client';
import { getActionErrorMsg } from '@/lib/utils';
import DatasetCard from './_components/DatasetCard';

const DatasetsPage = () => {
  const { list, LoadMore } = usePaginationQuery({
    fetchFn: async (params) => {
      const res = await fetchDatasetsByPageAction(params);
      if (!res?.data) {
        const errorMsg = getActionErrorMsg(res, 'Get datasets failed');
        throw new Error(errorMsg);
      }
      return res.data;
    },
    queryKey: 'datasets',
  });

  const { data: session } = authClient.useSession();

  return (
    <div className="h-full">
      <div className="h-full overflow-y-auto">
        <div className="flex flex-wrap gap-5">
          {list.map((dataset) => (
            <DatasetCard
              key={dataset.id}
              datasetId={dataset.id}
              description={dataset.description}
              updatedAt={dataset.updatedAt}
              authorName={session?.user?.name || 'User'}
              authorAvatar={session?.user?.image || undefined}
              datasetName={dataset.name}
              datasetIcon={dataset.icon}
              documentCount={dataset.documentCount}
              characterCount={dataset.characterCount}
              relatedAppCount={dataset.relatedAppCount}
            />
          ))}
        </div>
        {LoadMore}
      </div>
    </div>
  );
};

export default DatasetsPage;
