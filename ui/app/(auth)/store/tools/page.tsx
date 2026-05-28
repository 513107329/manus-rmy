import { Blocks } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getBuiltinToolCategories, getBuiltinTools } from '@/lib/builtin-tool';
import TitleHeader from '../../_components/TitleHeader';
import BuiltinToolCardList from './_components/BuiltinToolCardList';
import BuiltinToolsFilter from './_components/BuiltinToolsFilter';

const categories = getBuiltinToolCategories();
const builtinTools = getBuiltinTools();

const StoreToolsPage = () => {
  return (
    <div className="h-full flex flex-col">
      <TitleHeader
        title="Tool Store"
        icon={<Blocks />}
        className="mb-1 shrink-0 min-h-0"
      >
        <Link href="/space/tools">
          <Button>Create custom tool</Button>
        </Link>
      </TitleHeader>

      <div className="mb-2 shrink-0 min-h-0">
        <BuiltinToolsFilter categories={categories} />
      </div>

      <div className="grow min-h-0">
        <BuiltinToolCardList builtinTools={builtinTools} />
      </div>
    </div>
  );
};

export default StoreToolsPage;
