'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import SearchInput from '@/components/SearchInput';
import { Button } from '@/components/ui/button';

const DocumentToolsBar = () => {
  const [searchKeywords, setSearchKeywords] = useQueryState(
    'keywords',
    parseAsString.withDefault(''),
  );
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex items-center justify-between">
      <SearchInput
        className="bg-background"
        placeholder="Enter document name"
        defaultValue={searchKeywords}
        onConfirm={setSearchKeywords}
      />
      <div className="flex items-center gap-2">
        <Button variant="outline">Recall Testing</Button>
        <Link href={`/space/datasets/${id}/upload`}>
          <Button variant="default">Add Document</Button>
        </Link>
      </div>
    </div>
  );
};

export default DocumentToolsBar;
