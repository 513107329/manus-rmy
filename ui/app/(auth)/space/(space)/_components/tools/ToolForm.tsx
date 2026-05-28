'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { validateOpenapiSchemaAction } from '@/actions/api-tool-action';
import EmptyResult from '@/components/EmptyResult';
import ImageUpload, { type ImageUploadRef } from '@/components/ImageUpload';
import LoadingButton from '@/components/LoadingButton';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { getActionErrorMsg } from '@/lib/utils';

const toolFormSchema = z.object({
  name: z
    .string()
    .max(30, { message: 'Tool name should be less than 30 characters' })
    .trim()
    .nonempty({ message: 'Tool name is required' }),
  openapiSchema: z
    .string()
    .max(1000, {
      message: 'OpenAPI schema should be less than 1000 characters',
    })
    .trim()
    .nonempty({ message: 'OpenAPI schema is required' }),
  headers: z.array(
    z.object({
      key: z.string().trim().nonempty({ message: 'Header key is required' }),
      value: z
        .string()
        .trim()
        .nonempty({ message: 'Header value is required' }),
    }),
  ),
});

type ToolInfo = {
  name: string;
  description: string;
  method: string;
  path: string;
};

type ToolFormData = z.infer<typeof toolFormSchema>;

export type FormData = ToolFormData & { icon: string };

type Props = {
  defaultValues?: FormData;
  onSubmit: (values: FormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
};

const ToolForm = ({ defaultValues, onSubmit, onDelete, onCancel }: Props) => {
  const form = useForm<ToolFormData>({
    resolver: zodResolver(toolFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      openapiSchema: defaultValues?.openapiSchema || '',
      headers: defaultValues?.headers || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'headers',
  });

  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const uploadImageRef = useRef<ImageUploadRef>(null);
  const iconUrlRef = useRef<string>(defaultValues?.icon || '');

  const handleSubmit = async (values: ToolFormData) => {
    try {
      setIsLoading(true);
      const iconUrl = await uploadImageRef.current?.uploadImage(
        iconUrlRef.current,
      );

      if (!iconUrl) {
        return;
      }

      iconUrlRef.current = iconUrl;

      await onSubmit({
        ...values,
        icon: iconUrl,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleteLoading(true);
    try {
      if (onDelete) {
        await onDelete();
      }
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleAppendHeader = () => {
    append({ key: '', value: '' });
  };

  const handleDeleteHeader = (index: number) => () => {
    remove(index);
  };

  const handleOpenapiSchemaBlur = async () => {
    setIsLoading(true);
    try {
      const { openapiSchema } = form.getValues();
      if (!openapiSchema) {
        form.setError('openapiSchema', {
          message: 'OpenAPI schema is required',
        });
        return;
      }

      const result = await validateOpenapiSchemaAction({ openapiSchema });
      if (!result?.data) {
        form.setError('openapiSchema', {
          message: getActionErrorMsg(result, 'OpenAPI schema format error'),
        });
        return;
      }

      const pathList = [];
      const openapi = JSON.parse(openapiSchema);
      const paths = Object.keys(openapi.paths);
      for (const path of paths) {
        const methods = Object.keys(openapi.paths[path]);
        for (const method of methods) {
          const { operationId, description } = openapi.paths[path][method];
          pathList.push({
            name: operationId,
            description,
            method,
            path,
          });
        }
      }

      setTools(pathList);
      form.clearErrors('openapiSchema');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-center mb-6">
        <ImageUpload
          alt="tool provider icon"
          imageUrl={defaultValues?.icon}
          ref={uploadImageRef}
          required
        />
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-8 px-1"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="required-label">Tool name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Please enter the tool name, please ensure the name is clear"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="openapiSchema"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="required-label">OpenAPI Schema</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Please enter your OpenAPI Schema here"
                    {...field}
                    onBlur={handleOpenapiSchemaBlur}
                  />
                </FormControl>
                <FormDescription>{field.value.length}/1000</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <FormLabel>Available tools</FormLabel>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Path</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tools.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <EmptyResult
                          className="bg-transparent"
                          message="No available tools"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    tools.map((tool) => (
                      <TableRow key={tool.name}>
                        <TableCell>{tool.name}</TableCell>
                        <TableCell>{tool.description}</TableCell>
                        <TableCell>{tool.method}</TableCell>
                        <TableCell>{tool.path}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-2">
            <FormLabel>Headers</FormLabel>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map(({ id }, index) => (
                    <TableRow key={id}>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`headers.${index}.key`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  placeholder="Please enter the header key"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`headers.${index}.value`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  placeholder="Please enter the header value"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleDeleteHeader(index)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Button type="button" onClick={handleAppendHeader}>
                        Add
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-between">
            {onDelete && (
              <LoadingButton
                text="Delete"
                isLoading={isDeleteLoading}
                variant="destructive"
                onClick={handleDelete}
              />
            )}
            <div className="text-right space-x-4">
              <Button type="button" variant="secondary" onClick={onCancel}>
                Cancel
              </Button>
              <LoadingButton type="submit" text="Save" isLoading={isLoading} />
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default ToolForm;
