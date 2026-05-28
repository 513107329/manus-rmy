'use client';

import { PreProcessRuleId, ProcessType } from '@repo/dataset/client';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputTags } from '@/components/ui/input-tag';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type AutomaticChunkingStrategy = {
  processType: ProcessType.Automatic;
  rule?: undefined;
};

type CustomChunkingStrategy = {
  processType: ProcessType.Custom;
  rule: {
    preProcessRules: Array<{
      id: PreProcessRuleId;
      enabled: boolean;
    }>;
    segment: {
      separators: Array<string>;
      chunkSize: number;
      chunkOverlap: number;
    };
  };
};

export type ChunkingStrategyType =
  | AutomaticChunkingStrategy
  | CustomChunkingStrategy;

export type ChunkingStrategyRef = {
  validate: () => boolean;
  getChunkingStrategy: () => ChunkingStrategyType;
};

type Props = {
  initialChunkingStrategy: ChunkingStrategyType;
};

const ChunkingStrategy = forwardRef<ChunkingStrategyRef, Props>(
  ({ initialChunkingStrategy }, ref) => {
    const [chunkingStrategy, setChunkingStrategy] =
      useState<ChunkingStrategyType>(initialChunkingStrategy);

    const [chunkSizeInput, setChunkSizeInput] = useState<string>(
      initialChunkingStrategy.rule?.segment?.chunkSize?.toString() ?? '',
    );
    const [chunkOverlapInput, setChunkOverlapInput] = useState<string>(
      initialChunkingStrategy.rule?.segment?.chunkOverlap?.toString() ?? '',
    );

    const separatorsInputRef = useRef<HTMLInputElement>(null);
    const chunkSizeInputRef = useRef<HTMLInputElement>(null);
    const chunkOverlapInputRef = useRef<HTMLInputElement>(null);

    const validate = (): boolean => {
      if (chunkingStrategy.processType === ProcessType.Automatic) {
        return true;
      }

      const separators = chunkingStrategy.rule.segment.separators;

      if (separators.length === 0) {
        separatorsInputRef.current?.focus();
        toast.error('Chunk separators is required');
        return false;
      }

      const chunkSizeNum = Number.parseInt(chunkSizeInput, 10);
      if (
        chunkSizeInput === '' ||
        Number.isNaN(chunkSizeNum) ||
        chunkSizeNum < 100 ||
        chunkSizeNum > 1000
      ) {
        chunkSizeInputRef.current?.focus();
        toast.error('Chunk size must be between 100 and 1000');
        return false;
      }
      if (chunkingStrategy.rule.segment.chunkSize !== chunkSizeNum) {
        handleChunkSizeChange(chunkSizeNum);
      }

      const chunkOverlapNum = Number.parseInt(chunkOverlapInput, 10);
      if (
        chunkOverlapInput === '' ||
        Number.isNaN(chunkOverlapNum) ||
        chunkOverlapNum < 0 ||
        chunkOverlapNum > chunkSizeNum / 2
      ) {
        chunkOverlapInputRef.current?.focus();
        toast.error(
          'Chunk overlap must be between 0 and the half of the chunk size',
        );
        return false;
      }
      if (chunkingStrategy.rule.segment.chunkOverlap !== chunkOverlapNum) {
        handleChunkOverlapChange(chunkOverlapNum);
      }

      return true;
    };

    const getChunkingStrategy = (): ChunkingStrategyType => {
      return chunkingStrategy;
    };

    useImperativeHandle(ref, () => ({
      validate,
      getChunkingStrategy,
    }));
    const handleCardClick = (processType: ProcessType) => () => {
      if (processType === ProcessType.Automatic) {
        setChunkingStrategy({ processType: ProcessType.Automatic });
      } else {
        setChunkingStrategy({
          processType: ProcessType.Custom,
          rule:
            chunkingStrategy.processType === ProcessType.Custom
              ? chunkingStrategy.rule
              : {
                  preProcessRules: [],
                  segment: {
                    separators: [],
                    chunkSize: 500,
                    chunkOverlap: 50,
                  },
                },
        });
      }
    };

    const handleSeparatorsChange: React.Dispatch<
      React.SetStateAction<string[]>
    > = (separators) => {
      if (chunkingStrategy.processType === ProcessType.Custom) {
        const newSeparators =
          typeof separators === 'function'
            ? separators(chunkingStrategy.rule.segment.separators)
            : separators;
        setChunkingStrategy({
          ...chunkingStrategy,
          rule: {
            ...chunkingStrategy.rule,
            segment: {
              ...chunkingStrategy.rule.segment,
              separators: newSeparators,
            },
          },
        });
      }
    };

    const handleChunkSizeChange = (chunkSize: number) => {
      if (chunkingStrategy.processType === ProcessType.Custom) {
        setChunkingStrategy({
          ...chunkingStrategy,
          rule: {
            ...chunkingStrategy.rule,
            segment: {
              ...chunkingStrategy.rule.segment,
              chunkSize,
            },
          },
        });
      }
    };

    const handleChunkOverlapChange = (chunkOverlap: number) => {
      if (chunkingStrategy.processType === ProcessType.Custom) {
        setChunkingStrategy({
          ...chunkingStrategy,
          rule: {
            ...chunkingStrategy.rule,
            segment: {
              ...chunkingStrategy.rule.segment,
              chunkOverlap,
            },
          },
        });
      }
    };

    const handleChunkSizeInputChange = (
      e: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const value = e.target.value;
      setChunkSizeInput(value);

      const numValue = Number.parseInt(value, 10);
      if (value !== '' && !Number.isNaN(numValue)) {
        handleChunkSizeChange(numValue);
      }
    };

    const handleChunkSizeBlur = () => {
      const numValue = Number.parseInt(chunkSizeInput, 10);
      if (chunkSizeInput === '' || Number.isNaN(numValue)) {
        setChunkSizeInput('');
      } else {
        handleChunkSizeChange(numValue);
      }
    };

    const handleChunkOverlapInputChange = (
      e: React.ChangeEvent<HTMLInputElement>,
    ) => {
      const value = e.target.value;
      setChunkOverlapInput(value);

      const numValue = Number.parseInt(value, 10);
      if (value !== '' && !Number.isNaN(numValue)) {
        handleChunkOverlapChange(numValue);
      }
    };

    const handleChunkOverlapBlur = () => {
      const numValue = Number.parseInt(chunkOverlapInput, 10);
      if (chunkOverlapInput === '' || Number.isNaN(numValue)) {
        setChunkOverlapInput('');
      } else {
        handleChunkOverlapChange(numValue);
      }
    };

    const handleCheckboxChange =
      (id: PreProcessRuleId) => (checked: boolean) => {
        if (chunkingStrategy.processType === ProcessType.Custom) {
          const currentRules = chunkingStrategy.rule.preProcessRules;
          const updatedRules = currentRules.map((rule) =>
            rule.id === id ? { ...rule, enabled: checked } : rule,
          );

          if (!currentRules.some((rule) => rule.id === id)) {
            updatedRules.push({ id, enabled: checked });
          }

          setChunkingStrategy({
            ...chunkingStrategy,
            rule: {
              ...chunkingStrategy.rule,
              preProcessRules: updatedRules,
            },
          });
        }
      };

    return (
      <div className="space-y-8">
        <Card
          className={cn(
            chunkingStrategy.processType === ProcessType.Automatic &&
              'border-primary',
          )}
          onClick={handleCardClick(ProcessType.Automatic)}
        >
          <CardHeader>
            <CardTitle>Automatic Chunking and Cleaning</CardTitle>
            <CardDescription>
              Automatically segment and preprocess your documents.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card
          className={cn(
            chunkingStrategy.processType === ProcessType.Custom &&
              'border-primary',
          )}
          onClick={handleCardClick(ProcessType.Custom)}
        >
          <CardHeader>
            <CardTitle>Custom</CardTitle>
            <CardDescription>
              Customize chunking rules, chunk size, and preprocessing rules
            </CardDescription>
          </CardHeader>
          {chunkingStrategy.processType === ProcessType.Custom && (
            <>
              <Separator />
              <CardContent onClick={(e) => e.stopPropagation()}>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="chunk-separators">
                      Chunk Separators
                      <span className="text-red-500">*</span>
                    </FieldLabel>
                    <InputTags
                      ref={separatorsInputRef}
                      id="chunk-separators"
                      required
                      placeholder="Enter chunk separators"
                      value={
                        chunkingStrategy.processType === ProcessType.Custom
                          ? chunkingStrategy.rule.segment.separators
                          : []
                      }
                      onChange={handleSeparatorsChange}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="chunk-max-length">
                      Chunk Max Length
                      <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      ref={chunkSizeInputRef}
                      id="chunk-max-length"
                      required
                      placeholder="Enter a number between 100 and 1000"
                      type="number"
                      value={chunkSizeInput}
                      onChange={handleChunkSizeInputChange}
                      onBlur={handleChunkSizeBlur}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="chunk-overlap">
                      Chunk Overlap
                      <span className="text-red-500">*</span>
                    </FieldLabel>
                    <Input
                      ref={chunkOverlapInputRef}
                      id="chunk-overlap"
                      required
                      placeholder="Enter a number between 0 and the half of the chunk size"
                      type="number"
                      value={chunkOverlapInput}
                      onChange={handleChunkOverlapInputChange}
                      onBlur={handleChunkOverlapBlur}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="text-preprocessing-rules">
                      Text Preprocessing Rules
                    </FieldLabel>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="replace-extra-space"
                        checked={
                          chunkingStrategy.processType === ProcessType.Custom
                            ? (chunkingStrategy.rule.preProcessRules.find(
                                (rule) =>
                                  rule.id === PreProcessRuleId.RemoveExtraSpace,
                              )?.enabled ?? false)
                            : false
                        }
                        onCheckedChange={handleCheckboxChange(
                          PreProcessRuleId.RemoveExtraSpace,
                        )}
                      />
                      <Label htmlFor="replace-extra-space">
                        Replace consecutive spaces, line breaks, and tabs
                      </Label>
                    </div>
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="remove-url-and-email"
                        checked={
                          chunkingStrategy.processType === ProcessType.Custom
                            ? (chunkingStrategy.rule.preProcessRules.find(
                                (rule) =>
                                  rule.id ===
                                  PreProcessRuleId.RemoveUrlAndEmail,
                              )?.enabled ?? false)
                            : false
                        }
                        onCheckedChange={handleCheckboxChange(
                          PreProcessRuleId.RemoveUrlAndEmail,
                        )}
                      />
                      <Label htmlFor="remove-url-and-email">
                        Remove all URLs and email addresses
                      </Label>
                    </div>
                  </Field>
                </FieldGroup>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    );
  },
);

ChunkingStrategy.displayName = 'ChunkingStrategy';

export default ChunkingStrategy;
