'use client';

import { useState } from 'react';
import EmptyResult from '@/components/EmptyResult';
import useBuiltinToolsFilter from '@/hooks/useBuiltinToolsFilter';
import type { BuiltinToolParam } from '@/lib/builtin-tool';
import BuiltinToolCard from './BuiltinToolCard';
import BuiltinToolSheet from './BuiltinToolSheet';

type BuiltinTool = {
  category: string;
  label: string;
  description: string;
  icon: string;
  name: string;
  background: string;
  tools: {
    name: string;
    label: string;
    description: string;
    inputs: {
      name: string;
      description: string;
      required: boolean;
      type: 'string' | 'number' | 'boolean';
    }[];
    params: BuiltinToolParam[];
  }[];
  createdAt: number;
};

type Props = {
  builtinTools: BuiltinTool[];
};

const BuiltinToolCardList = ({ builtinTools }: Props) => {
  const { activeCategory, searchKeywords } = useBuiltinToolsFilter();

  const [isOpen, setIsOpen] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState<BuiltinTool | null>(
    null,
  );

  const filteredTools = builtinTools
    .filter(
      (provider) =>
        activeCategory === '' || activeCategory === provider.category,
    )
    .filter(
      (provider) =>
        searchKeywords === '' || provider.label.includes(searchKeywords),
    );

  const handleCardClick = (provider: BuiltinTool) => () => {
    setSelectedProvider(provider);
    setIsOpen(true);
  };

  if (filteredTools.length === 0) {
    return <EmptyResult />;
  }

  return (
    <section className="p-3 flex flex-wrap gap-5 max-h-full overflow-y-auto no-scrollbar">
      {filteredTools.map((provider) => (
        <BuiltinToolCard
          key={provider.name}
          description={provider.description}
          createdAt={provider.createdAt}
          providerIcon={provider.icon}
          providerLabel={provider.label}
          providerName={provider.name}
          providerBgColor={provider.background}
          toolCount={provider.tools.length}
          onClick={handleCardClick(provider)}
        />
      ))}

      {selectedProvider && (
        <BuiltinToolSheet
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          providerIcon={selectedProvider.icon}
          providerLabel={selectedProvider.label}
          providerName={selectedProvider.name}
          providerBgColor={selectedProvider.background}
          description={selectedProvider.description}
          toolCount={selectedProvider.tools.length}
          tools={selectedProvider.tools}
        />
      )}
    </section>
  );
};

export default BuiltinToolCardList;
