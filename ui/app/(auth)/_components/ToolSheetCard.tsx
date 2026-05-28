'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { handleKeyUpAsClick } from '@/lib/utils';

type Props = {
  label: string;
  description: string;
  inputs: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
};

const formatInputType = (type: string) => {
  if (type === 'string') {
    return 'String';
  }

  if (type === 'number') {
    return 'Number';
  }

  if (type === 'boolean') {
    return 'Boolean';
  }

  return type;
};

const ToolSheetCard = ({ label, description, inputs }: Props) => {
  const [isInputsDisplay, setIsInputsDisplay] = useState(false);

  const handleToolCardClick = () => {
    setIsInputsDisplay((prev) => !prev);
  };

  return (
    <Card
      className="px-4 py-3 cursor-pointer gap-2"
      tabIndex={0}
      onClick={handleToolCardClick}
      onKeyUp={handleKeyUpAsClick}
    >
      <h1 className="text-sm font-bold text-foreground">{label}</h1>
      <p className="text-xs text-muted-foreground">{description}</p>

      {isInputsDisplay && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground shrink-0">
              Parameters
            </span>
            <Separator />
          </div>

          {inputs.map((input) => (
            <div key={input.name} className="space-y-1">
              <div className="space-x-2 text-xs">
                <span className="font-bold">{input.name}</span>
                <span className="text-muted-foreground">
                  {formatInputType(input.type)}
                </span>
                {input.required && (
                  <span className="text-red-500">Required</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {input.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default ToolSheetCard;
