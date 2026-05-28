'use client';

import type { GetApiToolListRes } from '@repo/api-tool';
import { useEffect, useState } from 'react';
import { fetchApiToolsByPageAction } from '@/actions/api-tool-action';
import usePaginationQuery from '@/hooks/usePaginationQuery';
import { authClient } from '@/lib/auth-client';
import { getActionErrorMsg } from '@/lib/utils';
import ApiToolCard from './_components/ApiToolCard';
import ApiToolSheet from './_components/ApiToolSheet';

type ApiTool = GetApiToolListRes;

const ApiToolsPage = () => {
  const { list, LoadMore } = usePaginationQuery({
    fetchFn: async (params) => {
      const res = await fetchApiToolsByPageAction(params);
      if (!res?.data) {
        const errorMsg = getActionErrorMsg(res, 'Get api tools failed');
        throw new Error(errorMsg);
      }
      return res.data;
    },
    queryKey: 'api-tools',
  });

  const { data: session } = authClient.useSession();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ApiTool | null>(
    null,
  );

  const handleCardClick = (tool: ApiTool) => () => {
    setSelectedProvider(tool);
    setIsOpen(true);
  };

  useEffect(() => {
    if (selectedProvider === null) {
      return;
    }
    const tool = list.find((tool) => tool.id === selectedProvider.id);
    if (tool) {
      setSelectedProvider(tool);
    } else {
      setIsOpen(false);
      setSelectedProvider(null);
    }
  }, [list, selectedProvider]);

  return (
    <div className="h-full">
      <div className="h-full overflow-y-auto">
        <div className="flex flex-wrap gap-5">
          {list.map((tool) => (
            <ApiToolCard
              key={tool.id}
              description={tool.description}
              createdAt={tool.createdAt}
              onClick={handleCardClick(tool)}
              authorName={session?.user?.name || 'User'}
              authorAvatar={session?.user?.image || undefined}
              providerLabel={tool.name}
              providerIcon={tool.icon}
              toolCount={tool.tools.length}
            />
          ))}
        </div>
        {LoadMore}
      </div>

      {selectedProvider && (
        <ApiToolSheet
          providerId={selectedProvider.id}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          providerIcon={selectedProvider.icon}
          providerLabel={selectedProvider.name}
          authorName={session?.user?.name || 'User'}
          description={selectedProvider.description}
          toolCount={selectedProvider.tools.length}
          tools={selectedProvider.tools.map((tool) => ({
            ...tool,
            label: tool.name,
          }))}
        />
      )}
    </div>
  );
};

export default ApiToolsPage;
