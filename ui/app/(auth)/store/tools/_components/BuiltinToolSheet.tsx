import type { ComponentProps } from 'react';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import ToolSheetCard from '../../../_components/ToolSheetCard';
import BuiltinToolCardHeader from './BuiltinToolCardHeader';

type ToolProp = ComponentProps<typeof ToolSheetCard>;

type Props = {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  description: string;
  tools: ToolProp[];
} & ComponentProps<typeof BuiltinToolCardHeader>;

const BuiltinToolSheet = ({
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
          <div>
            <div className="space-y-3">
              <BuiltinToolCardHeader {...headerProps} />
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
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

export default BuiltinToolSheet;
