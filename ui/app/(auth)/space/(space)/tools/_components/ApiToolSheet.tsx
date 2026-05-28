'use client';

import { Settings } from 'lucide-react';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import ToolSheetCard from '../../../../_components/ToolSheetCard';
import ApiToolCardHeader from './ApiToolCardHeader';

// import EditToolModal from './EditToolModal';

type ToolProp = ComponentProps<typeof ToolSheetCard>;

type Props = {
  providerId: string;
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  description: string;
  tools: ToolProp[];
} & ComponentProps<typeof ApiToolCardHeader>;

const ApiToolSheet = ({
  providerId,
  isOpen,
  setIsOpen,
  description,
  tools,
  ...headerProps
}: Props) => {
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Tool Details</SheetTitle>
        </SheetHeader>

        <Separator className="mb-2" />

        <div className="px-4">
          <div className="space-y-4">
            <div className="space-y-3">
              <ApiToolCardHeader {...headerProps} />
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Link href={`/space/tools/${providerId}/edit`}>
              <Button variant="outline" className="w-full">
                <Settings /> Edit
              </Button>
            </Link>
          </div>

          <Separator className="mt-3 mb-4" />

          <div>
            <h3 className="text-xs text-muted-foreground mb-3">
              Contains {headerProps.toolCount} tools
            </h3>
            <div className="space-y-2 overflow-y-auto h-full no-scrollbar">
              {tools.map((tool) => (
                <ToolSheetCard key={tool.label} {...tool} />
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ApiToolSheet;
